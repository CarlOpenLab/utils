import { isPromise, isUndef } from './validate'
import type { Fn } from '../helper'

export async function executeConcurrency(
  tasks: Array<Fn>,
  maxConcurrency: number
) {
  if (isUndef(maxConcurrency)) {
    console.warn('maxConcurrency is undefined')
    return null
  }
  const ret: Array<any> = []
  const excluding: any[] = []
  for (let i = 0; i < tasks.length; i++) {
    const res = tasks[i]()
    ret.push(res)

    if (maxConcurrency < tasks.length) {
      const p = res.then(() => excluding.splice(excluding.indexOf(p), 1))
      excluding.push(p)

      if (excluding.length >= maxConcurrency) {
        await Promise.race(excluding)
      }
    }
  }
  return Promise.all(ret)
}

/**
 * Invokes a queue.
 * @param {Array.<function(...any): any>} taskArray - An array of tasks to be executed.
 * @returns {Promise<void>} - A promise that resolves when all tasks are completed.
 */
export function executeQueue(
  taskArray: Array<(...args: any) => any>
): Promise<void> {
  const taskQueue = taskArray.slice()
  let index = 0
  return new Promise((resolve) => {
    const loopFunc = () => {
      if (index >= taskQueue.length) {
        resolve()
        return
      }
      const fn = taskQueue[index++]
      if (fn) {
        Promise.resolve(fn?.()).finally(() => {
          loopFunc()
        })
      }
    }
    loopFunc()
  })
}

const definePrams = (params: any, index: number) => {
  if (index === 0 && Array.isArray(params)) {
    return params
  }
  return [params]
}

/**
 * Takes a series of functions and returns a new function that runs these functions in sequence.
 * If a function returns a Promise, the next function is called with the resolved value.
 *
 * @param fns - The functions to pipe.
 * @returns A new function that takes any number of arguments and pipes them through `fns`.
 */
export function pipe(...fns: Array<Fn>) {
  return (...args: any[]) => {
    if (fns.length === 0) return args[0]
    return fns.reduce((arg, fn, index) => {
      if (isPromise(arg)) {
        return arg.then((res) => {
          return fn(...definePrams(res, index))
        })
      }
      return fn(...definePrams(arg, index))
    }, args)
  }
}

/**
 * Takes a series of functions and returns a new function that runs these functions in reverse sequence.
 * If a function returns a Promise, the next function is called with the resolved value.
 *
 * @param fns - The functions to compose.
 * @returns A new function that takes any number of arguments and composes them through `fns`.
 */
export function compose(...fns: Array<Fn>) {
  return pipe(...fns.reverse())
}

/**
 * Executes a given function repeatedly at a specified interval using setTimeout and clearTimeout.
 *
 * @param func - The function to be executed.
 * @param delay - The interval (in milliseconds) at which the function should be executed.
 * @returns A function that, when called, clears the interval and stops the execution of the given function.
 */
export function setintervalByTimeout(func: Function, delay: number) {
  let timer: number | NodeJS.Timeout | null = null
  let cancelTimer: number | NodeJS.Timeout | null = null
  const fn = function () {
    timer = setTimeout(async () => {
      const res = func()
      if (isPromise(res)) {
        await res
        if (cancelTimer && cancelTimer === timer) {
          return
        }
      }
      fn()
    }, delay)
  }

  const clearInterval = () => {
    if (timer) {
      clearTimeout(timer)
      cancelTimer = timer
    }
  }
  fn()
  return clearInterval
}

export const setIntervalByTimeout = setintervalByTimeout

/**
 * A helper function that wraps a Promise and returns a tuple of [error, data].
 * If the Promise resolves successfully, the first element of the tuple will be null, and the second element will be the resolved value.
 * If the Promise is rejected, the first element of the tuple will be the error, and the second element will be undefined.
 *
 * @param promise - The Promise to wrap.
 * @returns A Promise that resolves to a tuple of [error, data].
 */
export const awaitTo = async <T>(
  promise: Promise<T>
): Promise<[unknown | null, T | undefined]> => {
  try {
    const data = await promise
    return [null, data]
  } catch (error: unknown) {
    return [error, undefined]
  }
}
