import { rs } from '@rstest/core'
import { retry, TimeoutError, waitFor, withTimeout } from '../../lib/async'

// Timers are faked globally in rs.config.js; these tests rely on real timing.
rs.useRealTimers()

describe('withTimeout', () => {
  test('should resolve when the promise settles within the budget', async () => {
    const result = await withTimeout(
      new Promise((resolve) => setTimeout(() => resolve('fast'), 10)),
      1000
    )
    expect(result).toBe('fast')
  })

  test('should reject with TimeoutError when the budget is exceeded', async () => {
    const slow = new Promise((resolve) => setTimeout(() => resolve('slow'), 1000))
    await expect(withTimeout(slow, 20)).rejects.toBeInstanceOf(TimeoutError)
    await expect(withTimeout(slow, 20)).rejects.toMatchObject({ ms: 20 })
  })

  test('should use a custom message when provided', async () => {
    const slow = new Promise((resolve) => setTimeout(resolve, 10_000))
    await expect(
      withTimeout(slow, 10, { message: 'too slow' })
    ).rejects.toThrow('too slow')
  })

  test('should forward the original rejection', async () => {
    const failing = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('boom')), 10)
    )
    await expect(withTimeout(failing, 1000)).rejects.toThrow('boom')
  })

  test('should reject immediately when the signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      withTimeout(Promise.resolve('x'), 1000, { signal: controller.signal })
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('retry', () => {
  test('should return the value when the first attempt succeeds', async () => {
    const fn = rs.fn().mockResolvedValue('ok')
    const result = await retry(fn, { jitter: false })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('should succeed after transient failures', async () => {
    const fn = rs
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('recovered')

    const result = await retry(fn, { retries: 3, delay: 1, jitter: false })
    expect(result).toBe('recovered')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  test('should rethrow the last error when retries are exhausted', async () => {
    const fn = rs.fn().mockRejectedValue(new Error('always fails'))
    await expect(
      retry(fn, { retries: 2, delay: 1, jitter: false })
    ).rejects.toThrow('always fails')
    // 1 initial attempt + 2 retries
    expect(fn).toHaveBeenCalledTimes(3)
  })

  test('should support synchronous functions', async () => {
    let calls = 0
    const result = await retry(
      () => {
        calls += 1
        if (calls < 2) throw new Error('sync fail')
        return 'sync ok'
      },
      { retries: 3, delay: 1, jitter: false }
    )
    expect(result).toBe('sync ok')
  })

  test('should stop immediately when shouldRetry returns false', async () => {
    const fn = rs.fn().mockRejectedValue(new Error('fatal'))
    const shouldRetry = rs.fn().mockReturnValue(false)

    await expect(
      retry(fn, { retries: 5, delay: 1, jitter: false, shouldRetry })
    ).rejects.toThrow('fatal')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 1)
  })

  test('should call onRetry before each retry with error, attempt and delay', async () => {
    const fn = rs
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok')
    const onRetry = rs.fn()

    await retry(fn, {
      retries: 3,
      delay: 10,
      backoff: 'fixed',
      jitter: false,
      onRetry
    })

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1, 10)
  })

  test('should grow the delay according to the backoff strategy', async () => {
    const delays: number[] = []
    const fn = rs.fn().mockRejectedValue(new Error('fail'))

    await expect(
      retry(fn, {
        retries: 3,
        delay: 10,
        backoff: 'linear',
        jitter: false,
        onRetry: (_err, _attempt, nextDelay) => delays.push(nextDelay)
      })
    ).rejects.toThrow()

    expect(delays).toEqual([10, 20, 30])
  })

  test('should cap the delay at maxDelay', async () => {
    const delays: number[] = []
    const fn = rs.fn().mockRejectedValue(new Error('fail'))

    await expect(
      retry(fn, {
        retries: 3,
        delay: 100,
        backoff: 'exponential',
        maxDelay: 150,
        jitter: false,
        onRetry: (_err, _attempt, nextDelay) => delays.push(nextDelay)
      })
    ).rejects.toThrow()

    expect(delays).toEqual([100, 150, 150])
  })

  test('should stop retrying when aborted during the backoff sleep', async () => {
    const controller = new AbortController()
    const fn = rs.fn().mockRejectedValue(new Error('fail'))

    const promise = retry(fn, {
      retries: 10,
      delay: 50,
      jitter: false,
      signal: controller.signal
    })
    setTimeout(() => controller.abort(), 25)

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('waitFor', () => {
  test('should resolve immediately when the predicate is already truthy', async () => {
    const result = await waitFor(() => 'ready', { interval: 1 })
    expect(result).toBe('ready')
  })

  test('should poll until the predicate becomes truthy', async () => {
    let count = 0
    const result = await waitFor(
      () => {
        count += 1
        return count >= 3 ? 'appeared' : null
      },
      { interval: 5 }
    )
    expect(result).toBe('appeared')
    expect(count).toBe(3)
  })

  test('should support async predicates', async () => {
    let count = 0
    const result = await waitFor(
      async () => {
        count += 1
        return count >= 2 ? 'async ready' : null
      },
      { interval: 5 }
    )
    expect(result).toBe('async ready')
  })

  test('should treat a rejected predicate as not ready', async () => {
    let count = 0
    const result = await waitFor(
      () => {
        count += 1
        if (count < 2) return Promise.reject(new Error('not yet'))
        return Promise.resolve('eventually')
      },
      { interval: 5 }
    )
    expect(result).toBe('eventually')
  })

  test('should throw TimeoutError when the condition never becomes truthy', async () => {
    await expect(
      waitFor(() => null, { interval: 5, timeout: 30 })
    ).rejects.toBeInstanceOf(TimeoutError)
  })

  test('should reject when aborted while polling', async () => {
    const controller = new AbortController()
    const promise = waitFor(() => null, {
      interval: 10,
      timeout: 10_000,
      signal: controller.signal
    })
    setTimeout(() => controller.abort(), 30)
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
  })
})
