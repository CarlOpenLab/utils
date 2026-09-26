import { rs } from '@rstest/core'
import {
  getCurrentTimeISOString,
  formatDateByTimeStamp,
  formatDateTimeByString,
  formatDateByArray,
  formatDate
} from '../../lib/date'
import { isValidDate } from '../../lib/validate'

describe('getCurrentTimeISOString', () => {
  test('should return a string in ISO format', () => {
    const result = getCurrentTimeISOString()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  test('should return a string in UTC timezone', () => {
    const result = getCurrentTimeISOString()
    expect(result.endsWith('Z')).toBe(true)
  })
})

describe('formatDate', () => {
  const testDate = new Date(2024, 0, 15, 14, 30, 45) // January 15, 2024, 14:30:45

  test('should format date with default formatter', () => {
    const result = formatDate(testDate)
    expect(result).toBe('2024-01-15 14:30:45')
  })

  test('should format date with custom formatter', () => {
    const result = formatDate(testDate, 'DD/MM/YYYY hh:mm:ss')
    expect(result).toBe('15/01/2024 14:30:45')
  })

  test('should format date with partial formatter', () => {
    const result = formatDate(testDate, 'YYYY-MM-DD')
    expect(result).toBe('2024-01-15')
  })

  test('should format date with time only formatter', () => {
    const result = formatDate(testDate, 'hh:mm:ss')
    expect(result).toBe('14:30:45')
  })

  test('should format date with mixed formatter', () => {
    const result = formatDate(testDate, 'DD-MM-YYYY at hh:mm')
    expect(result).toBe('15-01-2024 at 14:30')
  })

  test('should format date in UTC when utc=true', () => {
    const utcDate = new Date('2024-01-15T14:30:45.000Z')
    const result = formatDate(utcDate, 'YYYY-MM-DD hh:mm:ss', true)
    expect(result).toBe('2024-01-15 14:30:45')
  })

  test('should format date in local time when utc=false', () => {
    const utcDate = new Date('2024-01-15T14:30:45.000Z')
    const result = formatDate(utcDate, 'YYYY-MM-DD hh:mm:ss', false)
    // The result will depend on the local timezone, but we can check the format
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })

  test('should handle single digit values with zero padding', () => {
    const singleDigitDate = new Date(2024, 0, 5, 9, 5, 3) // January 5, 2024, 09:05:03
    const result = formatDate(singleDigitDate)
    expect(result).toBe('2024-01-05 09:05:03')
  })

  test('should handle edge case dates', () => {
    // Test leap year
    const leapYearDate = new Date(2024, 1, 29, 12, 0, 0) // February 29, 2024
    const result = formatDate(leapYearDate, 'YYYY-MM-DD')
    expect(result).toBe('2024-02-29')
  })

  test('should handle year boundaries', () => {
    // Test New Year
    const newYearDate = new Date(2024, 0, 1, 0, 0, 0) // January 1, 2024, 00:00:00
    const result = formatDate(newYearDate)
    expect(result).toBe('2024-01-01 00:00:00')
  })

  test('should handle end of year', () => {
    // Test New Year's Eve
    const endYearDate = new Date(2023, 11, 31, 23, 59, 59) // December 31, 2023, 23:59:59
    const result = formatDate(endYearDate)
    expect(result).toBe('2023-12-31 23:59:59')
  })

  test('should handle UTC vs local time differences', () => {
    // Create a date that will have different values in UTC vs local time
    const date = new Date(2024, 0, 15, 14, 30, 45)
    
    const localResult = formatDate(date, 'YYYY-MM-DD hh:mm:ss', false)
    const utcResult = formatDate(date, 'YYYY-MM-DD hh:mm:ss', true)
    
    // Results should be valid date format strings
    expect(localResult).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    expect(utcResult).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })

  test('should handle formatter without any placeholders', () => {
    const result = formatDate(testDate, 'Today is a good day')
    expect(result).toBe('Today is a good day')
  })

  test('should handle empty formatter', () => {
    const result = formatDate(testDate, '')
    expect(result).toBe('')
  })

  test('should handle formatter with repeated placeholders', () => {
    const result = formatDate(testDate, 'YYYY-YYYY MM-MM DD-DD')
    expect(result).toBe('2024-2024 01-01 15-15')
  })

  test('should handle all UTC date methods', () => {
    const utcDate = new Date('2024-06-15T14:30:45.000Z')
    const result = formatDate(utcDate, 'YYYY-MM-DD hh:mm:ss', true)
    expect(result).toBe('2024-06-15 14:30:45')
  })

  test('should handle all local date methods', () => {
    const localDate = new Date(2024, 5, 15, 14, 30, 45) // June 15, 2024
    const result = formatDate(localDate, 'YYYY-MM-DD hh:mm:ss', false)
    expect(result).toBe('2024-06-15 14:30:45')
  })

  test('should handle invalid date object', () => {
    const invalidDate = new Date('invalid')
    const result = formatDate(invalidDate)
    // Invalid date will produce NaN values, which will be converted to strings
    expect(result).toMatch(/NaN/)
  })
})

describe('formatDateByTimeStamp', () => {
  beforeEach(() => {
    rs.spyOn(console, 'warn').mockImplementation(() => {
      /** */
    })
  })

  afterEach(() => {
    rs.restoreAllMocks()
  })

  test('should return date.toString() when timeStamp is less than 0', () => {
    const timeStamp = -1
    expect(formatDateByTimeStamp(timeStamp)).toEqual('Invalid Date')
    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(console.warn).toHaveBeenCalledWith('invalid timeStamp')
  })

  test('should return formatted date when timeStamp is valid and formatter is not provided', () => {
    const timeStamp = 1704038400000
    expect(formatDateByTimeStamp(timeStamp)).toEqual('2024-01-01 00:00:00')
  })

  test('should return formatted date when timeStamp is valid and formatter is provided', () => {
    const timeStamp = 1704038400000
    const formatter = 'YYYY/MM/DD hh:mm:ss'
    expect(formatDateByTimeStamp(timeStamp, formatter)).toEqual(
      '2024/01/01 00:00:00'
    )
  })
})

describe('formatDateTimeByString', () => {
  beforeEach(() => {
    rs.spyOn(console, 'warn').mockImplementation(() => {
      /** */
    })
  })

  afterEach(() => {
    rs.restoreAllMocks()
  })

  test('should return date string when input is valid date', () => {
    const dateString = '2023-07-01'
    const result = formatDateTimeByString(dateString)

    expect(result).toEqual('2023-07-01 08:00:00')
  })

  test('should return default formatted date string when input is valid date and no formatter provided', () => {
    const dateString = '2023-07-01 16:00:00'
    const result = formatDateTimeByString(dateString)

    expect(result).toEqual('2023-07-01 16:00:00')
  })

  test('should return custom formatted date string when input is valid date and formatter provided', () => {
    const dateString = '2023-07-01'
    const formatter = 'YYYY/MM/DD'
    const result = formatDateTimeByString(dateString, formatter)

    expect(result).toEqual('2023/07/01')
  })

  test('should return date string when input is invalid date', () => {
    const dateString = 'invalid date'
    const result = formatDateTimeByString(dateString)

    expect(result).toEqual('Invalid Date')
  })

  test('should call console.warn when input is invalid date', () => {
    const dateString = 'invalid date'
    formatDateTimeByString(dateString)

    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(console.warn).toHaveBeenCalledWith('invalid date string')
  })
})

describe('formatDateByArray', () => {
  beforeEach(() => {
    rs.spyOn(console, 'warn').mockImplementation(() => {
      /** */
    })
  })

  afterEach(() => {
    rs.restoreAllMocks()
  })

  test('should return Invalid Date when array is not an array or length is less than 2', () => {
    // @ts-expect-error: error
    const result = formatDateByArray(123)
    expect(result).toEqual('Invalid Date')
  })

  test('should return Invalid Date when generated date is invalid', () => {
    const result = formatDateByArray([])
    expect(result).toEqual('Invalid Date')
  })

  test('should return formatted date when array is valid', () => {
    const result = formatDateByArray([2023, 5, 10, 10, 10, 10])
    expect(isValidDate(new Date(result))).toEqual(true)
  })

  it('should handle invalid date generated from array', () => {
    const invalidDateArray = [2024, NaN, 1]
    const result = formatDateByArray(invalidDateArray)
    expect(result).toEqual('Invalid Date')
    const consoleWarnSpy = rs.spyOn(console, 'warn')
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      `Invalid date generated from array: 2024,NaN,1`
    )
    consoleWarnSpy.mockRestore()
  })
})
