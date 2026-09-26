import { rs } from '@rstest/core'
import { noop, sleep } from '../../lib/shard'

describe('noop function', () => {
  it('should return undefined', () => {
    expect(noop()).toBeUndefined()
  })
})

describe('sleep function', () => {
  it('should be called only once when ', async () => {
    rs.useFakeTimers()
    const fn = rs.fn()
    const act = sleep(500)
    act.then(fn)
    expect(fn).not.toBeCalled()
    rs.runAllTimers()
    await act
    expect(fn).toBeCalled()
    rs.useRealTimers()
  })
})
