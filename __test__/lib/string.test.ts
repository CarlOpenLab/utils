import { rs } from '@rstest/core'
import {
  unCapitalize,
  capitalize,
  underlineToHump,
  mulSplit
} from '../../lib/string'

describe('unCapitalize', () => {
  it('Convert the first letter to lower case', () => {
    expect(unCapitalize('hello_world')).toBe('hello_world')
    expect(unCapitalize('1data')).toBe('1data')
    expect(unCapitalize('Pazzal')).toBe('pazzal')
  })
})

describe('capitalize', () => {
  it('Convert the first letter to upper case', () => {
    expect(capitalize('hello_world')).toBe('Hello_world')
    expect(capitalize('1data')).toBe('1data')
    expect(capitalize('Pazzal')).toBe('Pazzal')
  })
})

describe('underlineToHump', () => {
  it('should convert underline string to hump string', () => {
    expect(underlineToHump('hello_world')).toBe('helloWorld')
    expect(underlineToHump('my_name_is_john')).toBe('myNameIsJohn')
    expect(underlineToHump('_private_variable')).toBe('_privateVariable')
  })
  it('should not convert double underline to hump', () => {
    expect(underlineToHump('hello__world')).toBe('hello__world')
    expect(underlineToHump('my__name_is_john')).toBe('my__nameIsJohn')
  })
  it('should not convert start underline to hump', () => {
    expect(underlineToHump('_hello_world')).toBe('_helloWorld')
    expect(underlineToHump('__hello_world')).toBe('__helloWorld')
  })
})

describe('mulSplit function', () => {
  beforeAll(() => {
    rs.useFakeTimers()
  })
  it('should return a new array', () => {
    expect(mulSplit('a,b,c', ',')).toEqual(['a', 'b', 'c'])
  })

  it('return ["a", "b,c"] when cutting once', () => {
    expect(mulSplit('a,b,c', ',', 1)).toEqual(['a', 'b,c'])
  })

  it('return ["a", "b","c"] when cutting twice', () => {
    expect(mulSplit('a,b,c', ',', 2)).toEqual(['a', 'b', 'c'])
  })

  it('return ["a", "b","c"] when cutting three', () => {
    expect(mulSplit('a,b,c', ',', 3)).toEqual(['a', 'b', 'c'])
  })
})
