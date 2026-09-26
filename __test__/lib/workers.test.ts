import { rs } from '@rstest/core'
import {
  executeConcurrency,
  executeQueue,
  pipe,
  compose,
  setintervalByTimeout,
  awaitTo
} from '../../lib/workers'

const warningFn = (console.warn = rs.fn())

describe('executeConcurrency module', () => {
  it('should return a promise that resolves with an array of results', async () => {
    const tasks = [
      () => Promise.resolve(1),
      () => Promise.resolve(2),
      () => Promise.resolve(3)
    ]
    const maxConcurrency = 3

    const results = await executeConcurrency(tasks, maxConcurrency)
    expect(results).toEqual([1, 2, 3])
  })

  it('should return a promise that resolves with an array of results when maxConcurrency is less than tasks.length', async () => {
    const tasks = [
      () => Promise.resolve(1),
      () => Promise.resolve(2),
      () => Promise.resolve(3),
      () => Promise.resolve(4)
    ]
    const maxConcurrency = 3
    const res = await executeConcurrency(tasks, maxConcurrency)
    expect(res).toEqual([1, 2, 3, 4])
  })

  it('should return a promise that resolves with an array of results when maxConcurrency is less than tasks.length', async () => {
    rs.useFakeTimers()
    const _PromiseAll = Promise.all
    Promise.all = rs.fn((tasks) => tasks) as any
    const status = Array.from({ length: 4 }).map(() => false)
    const fn = rs.fn(
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
            status[0] = true
            resolve(1)
          }, 1000)
        )
    )
    const fn1 = rs.fn(
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
            status[1] = true
            resolve(2)
          }, 1500)
        )
    )
    const fn2 = rs.fn(
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
            status[2] = true
            resolve(3)
          }, 2000)
        )
    )
    const fn3 = rs.fn(
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
            status[3] = true
            resolve(4)
          }, 2500)
        )
    )
    const tasks = [fn, fn1, fn2, fn3]
    const maxConcurrency = 3
    const result = executeConcurrency(tasks, maxConcurrency)
    expect(fn).toBeCalledTimes(1)
    expect(fn1).toBeCalledTimes(1)
    expect(fn2).toBeCalledTimes(1)
    expect(fn3).toBeCalledTimes(0)
    expect(status).toEqual([false, false, false, false])
    result.then(async (res) => {
      expect(status).toEqual([true, true, true, false])
      expect(fn3).toBeCalledTimes(1)
      if (res) await _PromiseAll(res)
      expect(status).toEqual([true, true, true, true])
    })
  })

  it('should return undefined when maxConcurrency is undefined', async () => {
    const tasks = [
      () => Promise.resolve(1),
      () => Promise.resolve(2),
      () => Promise.resolve(3)
    ]

    const maxConcurrency = undefined
    const res = await executeConcurrency(tasks, maxConcurrency as any)
    expect(res).toBeNull()
    expect(warningFn).toHaveBeenCalledTimes(1)
  })
})

describe('invoke task queue', () => {
  test('should execute tasks in order', () => {
    const taskArray = [
      rs.fn(() => Promise.resolve('Task 1')),
      rs.fn(() => Promise.resolve('Task 2')),
      rs.fn(() => Promise.resolve('Task 3'))
    ]

    return executeQueue(taskArray).then(() => {
      expect(taskArray[0]).toHaveBeenCalled()
      expect(taskArray[1]).toHaveBeenCalled()
      expect(taskArray[2]).toHaveBeenCalled()
      expect(taskArray[0].mock.invocationCallOrder[0]).toBeLessThan(
        taskArray[1].mock.invocationCallOrder[0]
      )
      expect(taskArray[1].mock.invocationCallOrder[0]).toBeLessThan(
        taskArray[2].mock.invocationCallOrder[0]
      )
    })
  })

  test('should handle empty task array', () => {
    const taskArray: Array<(...args: any) => any> = []

    return executeQueue(taskArray).then(() => {
      expect(taskArray.length).toBe(0)
    })
  })

  test('should handle tasks that return promises', () => {
    const taskArray = [
      rs.fn(() => Promise.resolve('Task 1')),
      rs.fn(() => Promise.resolve('Task 2')),
      rs.fn(() => Promise.resolve('Task 3'))
    ]

    return executeQueue(taskArray).then(() => {
      expect(taskArray[0]).toHaveBeenCalled()
      expect(taskArray[1]).toHaveBeenCalled()
      expect(taskArray[2]).toHaveBeenCalled()
    })
  })
})

describe('pipe', () => {
  test('should correctly pipe the output of one function into the next', () => {
    const addTwo = (num: number) => num + 2
    const multiplyByThree = (num: number) => num * 3
    const subtractFive = (num: number) => num - 5

    const pipedFunction = pipe(addTwo, multiplyByThree, subtractFive)

    expect(pipedFunction(5)).toEqual(16)
  })

  test('should handle promises correctly', async () => {
    const addTwo = (num: number) => Promise.resolve(num + 2)
    const multiplyByThree = (num: number) => num * 3
    const subtractFive = (num: number) => num - 5

    const pipedFunction = pipe(addTwo, multiplyByThree, subtractFive)

    expect(await pipedFunction(5)).toEqual(16)
  })

  test('should return the input unchanged when no functions are provided', () => {
    const pipedFunction = pipe()

    expect(pipedFunction(5)).toEqual(5)
  })
})

describe('compose', () => {
  test('should correctly compose the output of one function into the next', () => {
    const addTwo = (num: number) => num + 2
    const multiplyByThree = (num: number) => num * 3
    const subtractFive = (num: number) => num - 5

    const composedFunction = compose(subtractFive, multiplyByThree, addTwo)

    expect(composedFunction(5)).toEqual(16)
  })

  test('should handle promises correctly', async () => {
    const addTwo = (num: number) => Promise.resolve(num + 2)
    const multiplyByThree = (num: number) => num * 3
    const subtractFive = (num: number) => num - 5

    const composedFunction = compose(subtractFive, multiplyByThree, addTwo)

    expect(await composedFunction(5)).toEqual(16)
  })

  test('should return the input unchanged when no functions are provided', () => {
    const composedFunction = compose()

    expect(composedFunction(5)).toEqual(5)
  })
})

describe('setintervalByTimeout', () => {
  test('setintervalByTimeout should call function at regular intervals', () => {
    const fn = rs.fn()

    rs.useFakeTimers()

    // 设置间隔 1000ms 调用 fn
    const clearMyInterval = setintervalByTimeout(fn, 1000)

    rs.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(1)

    rs.advanceTimersByTime(2000)
    expect(fn).toHaveBeenCalledTimes(3)

    // 清除定时器
    clearMyInterval()

    // 推进更多时间，fn 不应该再被调用
    rs.advanceTimersByTime(3000)
    expect(fn).toHaveBeenCalledTimes(3)

    rs.useRealTimers()
  })

  test('setintervalByTimeout should handle async functions correctly', async () => {
    const fn = rs.fn().mockResolvedValueOnce(null) // 模拟异步函数

    rs.useFakeTimers()

    const clearMyInterval = setintervalByTimeout(fn, 1000)

    // 推进 1000ms，fn 应该被调用一次
    rs.advanceTimersByTime(1000)
    await Promise.resolve() // 等待异步执行完成
    expect(fn).toHaveBeenCalledTimes(1)

    // 推进 2000ms，fn 应该被调用两次
    rs.advanceTimersByTime(2000)
    await Promise.resolve() // 等待异步执行完成
    expect(fn).toHaveBeenCalledTimes(3)

    clearMyInterval()

    rs.useRealTimers()
  })

  test('setintervalByTimeout should cancel next invoke when clearMyInterval is called', async () => {
    rs.useFakeTimers()

    const mockFn = rs.fn()
    const fn = () => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          mockFn()
          resolve()
        }, 1000)
      })
    }

    const clearMyInterval = setintervalByTimeout(fn, 500)

    setTimeout(() => {
      clearMyInterval()
    }, 600)
    await rs.advanceTimersByTimeAsync(2000)
    expect(mockFn).toHaveBeenCalledTimes(1)
    await rs.advanceTimersByTimeAsync(2000)
    expect(mockFn).toHaveBeenCalledTimes(1)
    rs.useRealTimers()
  })
})

describe('awaitTo', () => {
  test('should return [null, data] when promise resolves successfully', async () => {
    const successPromise = Promise.resolve('success data')
    const [error, data] = await awaitTo(successPromise)
    
    expect(error).toBeNull()
    expect(data).toBe('success data')
  })

  test('should return [error, undefined] when promise rejects', async () => {
    const errorMessage = 'Something went wrong'
    const failurePromise = Promise.reject(new Error(errorMessage))
    const [error, data] = await awaitTo(failurePromise)
    
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe(errorMessage)
    expect(data).toBeUndefined()
  })

  test('should handle promise that resolves with undefined', async () => {
    const undefinedPromise = Promise.resolve(undefined)
    const [error, data] = await awaitTo(undefinedPromise)
    
    expect(error).toBeNull()
    expect(data).toBeUndefined()
  })

  test('should handle promise that resolves with null', async () => {
    const nullPromise = Promise.resolve(null)
    const [error, data] = await awaitTo(nullPromise)
    
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  test('should handle promise that resolves with complex object', async () => {
    const complexObject = { id: 1, name: 'test', items: [1, 2, 3] }
    const objectPromise = Promise.resolve(complexObject)
    const [error, data] = await awaitTo(objectPromise)
    
    expect(error).toBeNull()
    expect(data).toEqual(complexObject)
  })

  test('should handle promise that rejects with string error', async () => {
    const stringError = 'String error message'
    const stringErrorPromise = Promise.reject(stringError)
    const [error, data] = await awaitTo(stringErrorPromise)
    
    expect(error).toBe(stringError)
    expect(data).toBeUndefined()
  })

  test('should handle promise that rejects with null', async () => {
    const nullErrorPromise = Promise.reject(null)
    const [error, data] = await awaitTo(nullErrorPromise)
    
    expect(error).toBeNull()
    expect(data).toBeUndefined()
  })

  test('should handle async function that throws', async () => {
    const asyncFunction = async () => {
      throw new Error('Async error')
    }
    const [error, data] = await awaitTo(asyncFunction())
    
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe('Async error')
    expect(data).toBeUndefined()
  })

  test('should handle async function that returns value', async () => {
    const asyncFunction = async () => {
      return 'async result'
    }
    const [error, data] = await awaitTo(asyncFunction())
    
    expect(error).toBeNull()
    expect(data).toBe('async result')
  })
})
