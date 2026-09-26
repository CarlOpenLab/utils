import { rs } from '@rstest/core'
import type { Mock } from '@rstest/core'
import { invokeWithErrorHandlingFactory, formatErrorToString } from '../../lib/error-handler'

describe('invokeWithErrorHandlingFactory', () => {
  let errorHandler: Mock
  let safeExecute: ReturnType<typeof invokeWithErrorHandlingFactory>

  beforeEach(() => {
    errorHandler = rs.fn()
    safeExecute = invokeWithErrorHandlingFactory(errorHandler)
  })

  describe('synchronous function execution', () => {
    it('should execute function successfully without errors', () => {
      const mockFn = rs.fn(() => 'success')
      const result = safeExecute(mockFn)

      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(result).toBe('success')
      expect(errorHandler).not.toHaveBeenCalled()
    })

    it('should handle synchronous errors', () => {
      const error = new Error('sync error')
      const mockFn = rs.fn(() => { throw error })

      const result = safeExecute(mockFn)

      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(errorHandler).toHaveBeenCalledWith(error)
      expect(result).toBeUndefined()
    })

    it('should execute function with context and arguments', () => {
      const context = { value: 42 }
      const mockFn = rs.fn(function(this: typeof context, a: number, b: number) {
        return this.value + a + b
      })

      const result = safeExecute(mockFn, context, [1, 2])

      expect(mockFn).toHaveBeenCalledWith(1, 2)
      expect(result).toBe(45) // 42 + 1 + 2
      expect(errorHandler).not.toHaveBeenCalled()
    })
  })

  describe('asynchronous function execution', () => {
    it('should execute async function successfully', async () => {
      const mockFn = rs.fn(async () => 'async success')
      const result = safeExecute(mockFn)

      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(result).toBeInstanceOf(Promise)

      const resolvedResult = await result
      expect(resolvedResult).toBe('async success')
      expect(errorHandler).not.toHaveBeenCalled()
    })

    it('should handle async function rejections', async () => {
      const error = new Error('async error')
      const mockFn = rs.fn(async () => { throw error })

      const result = safeExecute(mockFn)
      expect(result).toBeInstanceOf(Promise)

      await result.catch(() => { /** error handling */ })

      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(errorHandler).toHaveBeenCalledWith(error)
    })

    it('should execute async function with context and arguments', async () => {
      const context = { multiplier: 3 }
      const mockFn = rs.fn(async function(this: typeof context, value: number) {
        return this.multiplier * value
      })

      const result = safeExecute(mockFn, context, [10])

      expect(mockFn).toHaveBeenCalledWith(10)
      expect(result).toBeInstanceOf(Promise)

      const resolvedResult = await result
      expect(resolvedResult).toBe(30)
      expect(errorHandler).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle function that returns null', () => {
      const mockFn = rs.fn(() => null)
      const result = safeExecute(mockFn)

      expect(result).toBeNull()
      expect(errorHandler).not.toHaveBeenCalled()
    })

    it('should handle function that returns undefined', () => {
      const mockFn = rs.fn(() => undefined)
      const result = safeExecute(mockFn)

      expect(result).toBeUndefined()
      expect(errorHandler).not.toHaveBeenCalled()
    })

    it('should execute function without context and arguments', () => {
      const mockFn = rs.fn(() => 'no context')
      const result = safeExecute(mockFn)

      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(result).toBe('no context')
      expect(errorHandler).not.toHaveBeenCalled()
    })

    it('should handle empty arguments array', () => {
      const mockFn = rs.fn(() => 'empty args')
      const result = safeExecute(mockFn, undefined, [])

      expect(mockFn).toHaveBeenCalledWith()
      expect(result).toBe('empty args')
      expect(errorHandler).not.toHaveBeenCalled()
    })
  })
})


describe('formatErrorToString', () => {
  describe('Error instance handling', () => {
    it('should format Error instance with stack trace', () => {
      const error = new Error('Test error message')
      const result = formatErrorToString(error)

      expect(result).toContain('Error: Test error message')
      expect(typeof result).toBe('string')
      expect(result.split('\n').length).toBeLessThanOrEqual(8) // 默认限制为8行
    })

    it('should respect errorLimit option', () => {
      const error = new Error('Test error with custom limit')
      const result = formatErrorToString(error, '', { errorLimit: 3 })

      expect(result.split('\n').length).toBeLessThanOrEqual(3)
    })
  })

  describe('String error handling', () => {
    it('should return string error as is', () => {
      const errorString = 'This is a string error'
      const result = formatErrorToString(errorString)

      expect(result).toBe(errorString)
    })

    it('should handle empty string', () => {
      const result = formatErrorToString('')
      expect(result).toBe('')
    })
  })

  describe('Object with toString method', () => {
    it('should call toString method on object with valid toString', () => {
      const errorObject = {
        message: 'Custom error object',
        toString: () => 'Custom error: Custom error object'
      }

      const result = formatErrorToString(errorObject)
      expect(result).toBe('Custom error: Custom error object')
    })

    it('should handle object with toString property that is not a function', () => {
      const errorObject = {
        message: 'Invalid toString',
        toString: 'not a function'
      }

      const result = formatErrorToString(errorObject, 'default error')
      expect(result).toBe('default error')
    })
  })

  describe('Default error string handling', () => {
    it('should return default error string for unsupported types', () => {
      const defaultError = 'Unknown error occurred'

      expect(formatErrorToString(null, defaultError)).toBe(defaultError)
      expect(formatErrorToString(undefined, defaultError)).toBe(defaultError)
      expect(formatErrorToString(123, defaultError)).toBe(defaultError)
      expect(formatErrorToString(true, defaultError)).toBe(defaultError)
      expect(formatErrorToString([], defaultError)).toBe(defaultError)
    })

    it('should return empty string when no default provided', () => {
      expect(formatErrorToString(null)).toBe('')
      expect(formatErrorToString(undefined)).toBe('')
      expect(formatErrorToString(123)).toBe('')
    })

    it('should handle plain object without toString method', () => {
      const plainObject = { message: 'plain object' }
      // 所有对象都继承了 Object.prototype.toString 方法，所以这个测试用例需要显式地将 toString 设为 undefined
      Object.defineProperty(plainObject, 'toString', {
        value: undefined,
        configurable: true
      })
      const result = formatErrorToString(plainObject, 'default error')

      expect(result).toBe('default error')
    })
  })

  describe('Edge cases', () => {
    it('should handle object with null toString', () => {
      const errorObject = {
        toString: null
      }

      const result = formatErrorToString(errorObject, 'fallback')
      expect(result).toBe('fallback')
    })

    it('should handle object with undefined toString', () => {
      const errorObject = {
        toString: undefined
      }

      const result = formatErrorToString(errorObject, 'fallback')
      expect(result).toBe('fallback')
    })

    it('should handle custom Error subclass', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'CustomError'
        }
      }

      const error = new CustomError('Custom error message')
      const result = formatErrorToString(error)

      expect(result).toContain('CustomError: Custom error message')
    })

    it('should handle errorLimit of 0', () => {
      const error = new Error('Test error')
      const result = formatErrorToString(error, '', { errorLimit: 0 })

      expect(result).toBe('')
    })

    it('should handle very large errorLimit', () => {
      const error = new Error('Test error')
      const result = formatErrorToString(error, '', { errorLimit: 1000 })

      expect(typeof result).toBe('string')

      expect(result.split('\n').length).toBeLessThan(1000)
    })
  })
})
