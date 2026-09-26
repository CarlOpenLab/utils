import { rs } from '@rstest/core'
import {
  defineDebounceFn,
  defineOnceFn,
  defineThrottleFn,
  defineSinglePromiseFn
} from '../../lib/define'

describe('defineDebounceFn', () => {
  beforeAll(() => {
    rs.useFakeTimers()
  })

  it('should be called only once when ', () => {
    const fn = rs.fn()
    const debounce = defineDebounceFn(fn)
    debounce()
    debounce()
    debounce()
    rs.runAllTimers()
    expect(fn.mock.calls.length).toBe(1)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should be called every when execution is delayed', async () => {
    const fn = rs.fn()
    const debounce = defineDebounceFn(fn, 500)
    debounce()
    rs.runAllTimers()
    debounce()
    rs.runAllTimers()
    debounce()
    rs.runAllTimers()
    expect(fn.mock.calls.length).toBe(3)
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should be called immediately when set immediate', async () => {
    const fn = rs.fn()
    const debounce = defineDebounceFn(fn, 500, true)
    debounce()
    debounce()
    debounce()
    expect(fn).toHaveBeenCalled()
    rs.advanceTimersByTime(500)
    expect(fn.mock.calls.length).toBe(2)
  })
})

describe('defineOnceFn module', () => {
  it('should return a function', () => {
    const fn = defineOnceFn(() => null)
    expect(fn instanceof Function).toBeTruthy()
  })

  it('throw error when params is not a function', () => {
    // @ts-expect-error: defineOnceFn params is empty string throw error
    const fn = () => defineOnceFn('')
    expect(fn).toThrowError('first params must be a function')
  })

  it('It should only be executed once when it is called multiple times', () => {
    const mockFn = rs.fn((num1: number, num2: number) => num1 + num2)
    const fn = defineOnceFn(() => mockFn(1, 2))
    for (let i = 0; i < 3; i++) {
      fn()
    }
    expect(mockFn.mock.calls.length).toBe(1)
  })
})

describe('defineThrottleFn', () => {
  beforeAll(() => {
    rs.useFakeTimers()
  })

  it('should call the function immediately if the delay is 0', async () => {
    const fn = rs.fn()

    const delay = 0
    const throttledFn = defineThrottleFn(fn, delay)
    throttledFn()
    expect(fn).toHaveBeenCalled()
  })

  it('should call the function immediately if the delay is negative', async () => {
    const delay = -100
    const fn = rs.fn()

    const throttledFn = defineThrottleFn(fn, delay)
    throttledFn()
    expect(fn).toHaveBeenCalled()
  })

  it('if the execution time is less than the delay, it will be executed at the delay time', async () => {
    const delay = 100
    const fn = rs.fn()

    const throttledFn = defineThrottleFn(fn, delay)
    throttledFn()
    throttledFn()

    expect(fn).toHaveBeenCalled()
    expect(fn).toHaveBeenCalledTimes(1)
    rs.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  test('should call the function again after the default delay', () => {
    const fn = rs.fn()
    const throttledFn = defineThrottleFn(fn)

    throttledFn()
    rs.advanceTimersByTime(500)
    throttledFn()

    expect(fn).toHaveBeenCalledTimes(2)
  })
})

describe('defineSinglePromiseFn', () => {
  beforeEach(() => {
    rs.useFakeTimers()
  })

  afterEach(() => {
    rs.restoreAllMocks()
    rs.useRealTimers()
  })

  it('should call the callback function only once', async () => {
    const mockFn = rs.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
      return 'result'
    })

    const singletonFn = defineSinglePromiseFn(mockFn)

    const p1 = singletonFn()
    const p2 = singletonFn()

    expect(mockFn).toHaveBeenCalledTimes(1)

    await rs.advanceTimersByTimeAsync(100)

    const result1 = await p1
    const result2 = await p2

    expect(result1).toBe('result')
    expect(result2).toBe('result')
  })
  it('should allow new calls after the Promise resolves', async () => {
    const mockFn = rs.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
      return 'new result'
    })

    const singletonFn = defineSinglePromiseFn(mockFn)

    let ret = singletonFn()
    await rs.advanceTimersByTimeAsync(50)
    await ret

    ret = singletonFn()
    await rs.advanceTimersByTimeAsync(50)

    await ret

    expect(mockFn).toHaveBeenCalledTimes(2)
  })

  it('should correctly handle a rejected Promise', async () => {
    const mockFn = rs.fn(async () => {
      await new Promise((_, reject) =>
        setTimeout(() => reject(new Error('error occurred')), 50)
      )
    })

    const singletonFn = defineSinglePromiseFn(mockFn)

    const p1 = singletonFn()
    expect(p1).rejects.toThrow('error occurred')

    await rs.advanceTimersByTimeAsync(50)

    const p2 = singletonFn()
    const ret = expect(p2).rejects.toThrow('error occurred')
    await rs.advanceTimersByTimeAsync(50)
    await ret
    expect(mockFn).toHaveBeenCalledTimes(2)
  })
})
