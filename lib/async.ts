/**
 * Async primitives: `withTimeout`, `retry` and `waitFor`.
 *
 * The three functions are intentionally small and composable:
 *
 * - {@link withTimeout} limits how long a single operation may take.
 * - {@link retry} re-runs an operation that **failed** (threw).
 * - {@link waitFor} polls until a **condition becomes truthy** (e.g. a DOM
 *   element appears) — the operation did not fail, the result is just not
 *   ready yet.
 *
 * Compose them by nesting; the nesting order expresses the semantics:
 *
 * @example
 * ```ts
 * // Retry each attempt, each attempt may take at most 5s
 * await retry(() => withTimeout(fetchData(), 5000), { retries: 3 })
 *
 * // Keep retrying, but give the whole flow a 30s budget
 * await withTimeout(retry(fetchData, { retries: 10 }), 30_000)
 *
 * // Wait for an element, then click it with retries, all within 10s
 * await withTimeout(
 *   retry(async () => {
 *     const btn = await waitFor(() => document.querySelector('#submit'))
 *     btn.click()
 *   }, { retries: 3 }),
 *   10_000
 * )
 * ```
 *
 * @module
 */

// ─── Errors ───

/**
 * Error thrown when an operation exceeds its time budget.
 *
 * Thrown by {@link withTimeout} and {@link waitFor}. Use `instanceof
 * TimeoutError` (or check `error.name === 'TimeoutError'`) to distinguish
 * a timeout from an execution failure — e.g. inside `RetryOptions.shouldRetry`.
 */
export class TimeoutError extends Error {
  /** The time budget that was exceeded, in milliseconds. */
  readonly ms: number

  constructor(ms: number, message?: string) {
    super(message ?? `Operation timed out after ${ms}ms`)
    this.name = 'TimeoutError'
    this.ms = ms
  }
}

// ─── Shared helpers ───

/** Options accepted by async primitives that support cancellation. */
export interface AsyncControlOptions {
  /**
   * Cancels the operation. While waiting between attempts or polls the
   * cancellation is observed immediately; an in-flight attempt is not
   * interrupted (abort the underlying work yourself if needed).
   */
  signal?: AbortSignal
}

function abortError(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) return signal.reason
  const error = new Error(
    typeof signal.reason === 'string' ? signal.reason : 'Operation aborted'
  )
  error.name = 'AbortError'
  return error
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw abortError(signal)
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError(signal))
      return
    }
    const onAbort = () => {
      clearTimeout(timer)
      reject(abortError(signal!))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

// ─── withTimeout ───

/**
 * Races a promise against a time budget. Rejects with a {@link TimeoutError}
 * if the promise does not settle within `ms`.
 *
 * Note: rejection does not cancel the underlying work — pass an
 * `AbortSignal` to the operation itself if it supports cancellation.
 *
 * @template T
 * @param target The promise to await.
 * @param ms Time budget in milliseconds.
 * @param [options] Optional message override and abort signal.
 * @returns A `Promise` resolving with the target's value.
 *
 * @example
 * ```ts
 * const data = await withTimeout(fetch('/api/slow'), 5000)
 * ```
 */
export function withTimeout<T>(
  target: Promise<T>,
  ms: number,
  options?: AsyncControlOptions & { message?: string }
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const signal = options?.signal
    if (signal?.aborted) {
      reject(abortError(signal))
      return
    }
    const onAbort = () => {
      clearTimeout(timer)
      reject(abortError(signal!))
    }
    const cleanup = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
    const timer = setTimeout(() => {
      cleanup()
      reject(new TimeoutError(ms, options?.message))
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })

    target.then(
      (value) => {
        cleanup()
        resolve(value)
      },
      (error) => {
        cleanup()
        reject(error)
      }
    )
  })
}

// ─── retry ───

/** Backoff strategy used to space out retry attempts. */
export type RetryBackoff = 'fixed' | 'linear' | 'exponential'

/** Options for {@link retry}. */
export interface RetryOptions extends AsyncControlOptions {
  /**
   * Number of retries after the first attempt fails.
   * @defaultValue 3
   */
  retries?: number
  /**
   * Base delay between attempts in milliseconds.
   * @defaultValue 1000
   */
  delay?: number
  /**
   * How the delay grows per attempt:
   * - `fixed`: `delay` every time
   * - `linear`: `delay * attempt`
   * - `exponential`: `delay * 2^(attempt - 1)`
   * @defaultValue 'exponential'
   */
  backoff?: RetryBackoff
  /**
   * Upper bound for the computed delay, in milliseconds.
   * @defaultValue 30000
   */
  maxDelay?: number
  /**
   * Adds randomness (`delay * (0.5 ~ 1)`) to avoid thundering-herd retries.
   * Disable for deterministic timing (e.g. in tests).
   * @defaultValue true
   */
  jitter?: boolean
  /**
   * Decides whether a failure is worth retrying. Return `false` to
   * rethrow immediately — e.g. business errors like 4xx usually should
   * not be retried, while network errors and 5xx should.
   * @param error The error thrown by the failed attempt.
   * @param attempt The attempt number that just failed (1-based).
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean
  /**
   * Called before each retry — a good place for logging.
   * @param error The error thrown by the failed attempt.
   * @param attempt The attempt number that just failed (1-based).
   * @param nextDelay The delay before the next attempt, in milliseconds.
   */
  onRetry?: (error: unknown, attempt: number, nextDelay: number) => void
}

function computeDelay(
  attempt: number,
  delay: number,
  backoff: RetryBackoff,
  maxDelay: number,
  jitter: boolean
): number {
  let next: number
  switch (backoff) {
    case 'fixed':
      next = delay
      break
    case 'linear':
      next = delay * attempt
      break
    case 'exponential':
      next = delay * 2 ** (attempt - 1)
      break
  }
  next = Math.min(next, maxDelay)
  // Equal jitter: shrink the delay to a random value in [50%, 100%] of itself
  return jitter ? next * (0.5 + Math.random() * 0.5) : next
}

/**
 * Re-runs an async operation until it succeeds or the retry budget is
 * exhausted. Synchronous functions work too — the call is wrapped in a
 * promise internally.
 *
 * Only failures that pass `shouldRetry` are retried; the final failure
 * rethrows the **last** error thrown by the operation.
 *
 * @template T
 * @param fn The operation to run. May be sync or return a promise.
 * @param [options] Retry behaviour — see {@link RetryOptions}.
 * @returns A `Promise` resolving with the operation's value.
 *
 * @example
 * ```ts
 * // Retry a flaky request up to 3 times
 * const user = await retry(() => fetchUser(id), { retries: 3 })
 *
 * // Only retry server errors, log every attempt
 * const data = await retry(() => api.post(payload), {
 *   retries: 5,
 *   backoff: 'exponential',
 *   shouldRetry: (err) => err instanceof HttpError && err.status >= 500,
 *   onRetry: (err, attempt, nextDelay) =>
 *     console.warn(`attempt ${attempt} failed, retrying in ${nextDelay}ms`)
 * })
 * ```
 */
export async function retry<T>(
  fn: () => T | Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const {
    retries = 3,
    delay = 1000,
    backoff = 'exponential',
    maxDelay = 30_000,
    jitter = true,
    shouldRetry,
    onRetry,
    signal
  } = options ?? {}

  let attempt = 0
  for (;;) {
    throwIfAborted(signal)
    attempt += 1
    try {
      return await fn()
    } catch (error) {
      if (attempt > retries || shouldRetry?.(error, attempt) === false) {
        throw error
      }
      const nextDelay = computeDelay(attempt, delay, backoff, maxDelay, jitter)
      onRetry?.(error, attempt, nextDelay)
      await sleep(nextDelay, signal)
    }
  }
}

// ─── waitFor ───

/** Options for {@link waitFor}. */
export interface WaitForOptions extends AsyncControlOptions {
  /**
   * Interval between predicate evaluations, in milliseconds.
   * @defaultValue 100
   */
  interval?: number
  /**
   * Overall time budget in milliseconds. When exceeded a
   * {@link TimeoutError} is thrown. Pass `Infinity` to wait forever.
   * @defaultValue 10000
   */
  timeout?: number
}

/**
 * Polls a predicate until it returns a truthy value, then resolves with
 * that value. This is the right tool when the operation did not **fail** —
 * the result is simply **not ready yet** (a DOM element that has not
 * rendered, a flag that has not been set, data that has not arrived).
 *
 * The predicate is evaluated immediately, then every `interval` ms.
 * May be sync or async; a rejected predicate is treated as "not ready".
 *
 * @template T
 * @param predicate Evaluated repeatedly until it returns a truthy value.
 * @param [options] Polling behaviour — see {@link WaitForOptions}.
 * @returns A `Promise` resolving with the first truthy value.
 *
 * @example
 * ```ts
 * // Wait for an element to appear (DOM scripting)
 * const modal = await waitFor(
 *   () => document.querySelector<HTMLElement>('.modal'),
 *   { timeout: 10_000 }
 * )
 *
 * // Wait for async state
 * await waitFor(async () => (await fetchStatus()).ready, { interval: 500 })
 * ```
 */
export async function waitFor<T>(
  predicate: () => T | Promise<T>,
  options?: WaitForOptions
): Promise<NonNullable<T>> {
  const { interval = 100, timeout = 10_000, signal } = options ?? {}
  const deadline = Date.now() + timeout

  for (;;) {
    throwIfAborted(signal)
    let value: T
    try {
      value = await predicate()
    } catch {
      value = undefined as T
    }
    if (value) return value as NonNullable<T>
    if (Date.now() >= deadline) throw new TimeoutError(timeout)
    await sleep(Math.min(interval, Math.max(deadline - Date.now(), 0)), signal)
  }
}
