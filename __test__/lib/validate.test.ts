import {
  hasOwn,
  isObject,
  isFn,
  isStr,
  isBool,
  isUndef,
  isNull,
  isPrimitive,
  isFalsy,
  isNumber,
  isEffectiveNumber,
  isPromise,
  isValidArray,
  isValidDate,
  isPropertyKey,
  isMobile
} from '../../lib'

describe('hasOwnProperty', () => {
  it('should return true if the property exists', () => {
    expect(hasOwn(['a', 'b'], '0')).toBe(true)
    expect(hasOwn(['a', 'b'], 'a')).toBe(false)
  })
})

describe('isObject', () => {
  it('should return true if the value is an object', () => {
    expect(isObject({})).toBe(true)
    expect(isObject(new Object())).toBe(true)
  })

  it('should return false if the value is not an object', () => {
    expect(isObject(1)).toBe(false)
    expect(isObject(null)).toBe(false)
  })
})

describe('isFn', () => {
  it('should return true if the value is a function', () => {
    expect(
      isFn(function () {
        /** */
      })
    ).toBe(true)
    expect(
      isFn(() => {
        /** */
      })
    ).toBe(true)
  })

  it('should return false if the value is not a function', () => {
    expect(isFn(1)).toBe(false)
    expect(isFn(null)).toBe(false)
  })
})

describe('isStr', () => {
  it('should return true if the value is a string', () => {
    expect(isStr('a')).toBe(true)
    expect(isStr('')).toBe(true)
  })

  it('should return false if the value is not a string', () => {
    expect(isStr(1)).toBe(false)
    expect(isStr(null)).toBe(false)
  })
})

describe('isBool', () => {
  it('should return true if the value is a boolean', () => {
    expect(isBool(true)).toBe(true)
    expect(isBool(false)).toBe(true)
  })

  it('should return false if the value is not a boolean', () => {
    expect(isBool(1)).toBe(false)
    expect(isBool(null)).toBe(false)
  })
})

describe('isUndef', () => {
  it('should return true if the value is undefined', () => {
    expect(isUndef(undefined)).toBe(true)
  })

  it('should return false if the value is not undefined', () => {
    expect(isUndef(1)).toBe(false)
    expect(isUndef(null)).toBe(false)
  })
})

describe('isNull', () => {
  it('should return true if the value is null', () => {
    expect(isNull(null)).toBe(true)
  })

  it('should return false if the value is not null', () => {
    expect(isNull(1)).toBe(false)
    expect(isNull(undefined)).toBe(false)
  })
})

describe('isPrimitive', () => {
  it('should return true if the value is a primitive', () => {
    expect(isPrimitive('a')).toBe(true)
    expect(isPrimitive(1)).toBe(true)
    expect(isPrimitive(null)).toBe(true)
    expect(isPrimitive(undefined)).toBe(true)
  })

  it('should return false if the value is not a primitive', () => {
    expect(isPrimitive({})).toBe(false)
    expect(isPrimitive([])).toBe(false)
    expect(isPrimitive(new Map())).toBe(false)
    expect(isPrimitive(new Set())).toBe(false)
    expect(
      isPrimitive(
        new Promise(() => {
          /** */
        })
      )
    ).toBe(false)
  })
})

describe('isFalsy', () => {
  it('should return true if the value is falsy', () => {
    expect(isFalsy(false)).toBe(true)
    expect(isFalsy(0)).toBe(true)
    expect(isFalsy(null)).toBe(true)
    expect(isFalsy(undefined)).toBe(true)
    expect(isFalsy('')).toBe(true)
  })

  it('should return false if the value is not falsy', () => {
    expect(isFalsy(1)).toBe(false)
    expect(isFalsy([])).toBe(false)
    expect(isFalsy({})).toBe(false)
  })
})

describe('isNumber', () => {
  it('should return true if the value is a number', () => {
    expect(isNumber(1)).toBe(true)
    expect(isNumber(NaN)).toBe(true)
    expect(isNumber(0)).toBe(true)
  })

  it('should return false if the value is not a number', () => {
    expect(isNumber('')).toBe(false)
    expect(isNumber({})).toBe(false)
  })
})

describe('isEffectiveNumber', () => {
  it('should return true if the value is a number', () => {
    expect(isEffectiveNumber(1)).toBe(true)
    expect(isEffectiveNumber(0)).toBe(true)
  })

  it('should return false if the value is not a number', () => {
    expect(isEffectiveNumber('')).toBe(false)
    expect(isEffectiveNumber({})).toBe(false)
    expect(isEffectiveNumber(NaN)).toBe(false)
  })
})

describe('isPromise', () => {
  it('should return true if the value is a promise', () => {
    expect(
      isPromise(
        new Promise(() => {
          /** */
        })
      )
    ).toBe(true)
    expect(isPromise(Promise.resolve(1))).toBe(true)
    expect(
      isPromise(
        Promise.reject(1).catch(() => {
          /** */
        })
      )
    ).toBe(true)
    expect(
      isPromise({
        then: () => {
          /** */
        }
      })
    ).toBe(true)
  })

  it('should return false if the value is not a promise', () => {
    expect(isPromise(1)).toBe(false)
    expect(isPromise(null)).toBe(false)
  })
})

describe('isValidArray', () => {
  test('should return true for a non-empty array', () => {
    expect(isValidArray([1, 2, 3])).toBe(true)
  })

  test('should return false for an empty array', () => {
    expect(isValidArray([])).toBe(false)
  })

  test('should return false for a non-array value', () => {
    // @ts-expect-error: expect error
    expect(isValidArray(123)).toBe(false)
  })

  test('should return false for an array with length 0', () => {
    expect(isValidArray([])).toBe(false)
  })

  test('should return true for an array with length greater than 0', () => {
    expect(isValidArray([1])).toBe(true)
  })

  test('should return true for a complex array', () => {
    expect(isValidArray([{ a: 1 }, { b: 2 }])).toBe(true)
  })

  test('should return false for undefined', () => {
    // @ts-expect-error: expect error
    expect(isValidArray(undefined)).toBe(false)
  })

  test('should return false for null', () => {
    // @ts-expect-error: expect error
    expect(isValidArray(null)).toBe(false)
  })

  test('should return false for an object', () => {
    // @ts-expect-error: expect error
    expect(isValidArray({})).toBe(false)
  })
})

describe('isValidDate function', () => {
  it('should return true for a valid date', () => {
    const validDate = new Date()
    expect(isValidDate(validDate)).toBe(true)
  })

  it('should return false for an invalid date', () => {
    const invalidDate = new Date('invalid')
    expect(isValidDate(invalidDate)).toBe(false)
  })
})

describe('isPropertyKey function', () => {
  test('should return true for a number', () => {
    expect(isPropertyKey(123)).toBe(true)
  })

  test('should return true for a symbol', () => {
    expect(isPropertyKey(Symbol('test'))).toBe(true)
  })

  test('should return false for an object', () => {
    expect(isPropertyKey({})).toBe(false)
  })

  test('should return false for a function', () => {
    expect(
      isPropertyKey(() => {
        /** */
      })
    ).toBe(false)
  })

  test('should return false for null', () => {
    expect(isPropertyKey(null)).toBe(false)
  })

  test('should return false for undefined', () => {
    expect(isPropertyKey(undefined)).toBe(false)
  })
})

describe('isMobile', () => {
  test('should return true for iPhone UA', () => {
    expect(
      isMobile(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
      )
    ).toBe(true)
  })

  test('should return true for Android UA', () => {
    expect(
      isMobile(
        'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Mobile Safari/537.36'
      )
    ).toBe(true)
  })

  test('should return true for Windows Phone UA', () => {
    expect(
      isMobile(
        'Mozilla/5.0 (Windows Phone 10.0; Android 6.0.1; Microsoft; RM-1116) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0 Mobile Safari/537.36 Edge/15.15254'
      )
    ).toBe(true)
  })

  test('should return false for desktop Chrome UA', () => {
    expect(
      isMobile(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36'
      )
    ).toBe(false)
  })

  test('should return false for empty UA', () => {
    expect(isMobile('')).toBe(false)
  })

  test('should return false when UA is undefined', () => {
    expect(isMobile()).toBe(false)
  })
})
