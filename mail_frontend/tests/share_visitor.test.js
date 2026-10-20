import { beforeEach, describe, expect, it } from 'vitest'
import { getShareVisitorId } from '../src/api/mailboxShare'
import { getBrowserInstanceId } from '../src/services/sessionIdentity'

describe('share visitor identity', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('keeps the same anonymous browser identity across share page visits', () => {
    const first = getShareVisitorId()
    const second = getShareVisitorId()

    expect(first).toBeTruthy()
    expect(second).toBe(first)
    expect(getBrowserInstanceId()).toBe(first)
  })
})
