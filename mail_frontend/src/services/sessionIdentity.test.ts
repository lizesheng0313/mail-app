import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getBrowserInstanceId, getTabSessionId } from './sessionIdentity'

vi.mock('@/services/api', () => ({ default: {} }))
import { getShareVisitorId } from '@/api/mailboxShare'

describe('persistent monitoring visitor UUID', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear() })

  it('uses one persistent UUID for browser monitoring and every share request', () => {
    const visitor = getBrowserInstanceId()
    expect(visitor).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    expect(getBrowserInstanceId()).toBe(visitor)
    expect(getShareVisitorId()).toBe(visitor)
    expect(getTabSessionId()).not.toBe(visitor)
    expect(localStorage.getItem('browser_instance_id')).toBe(visitor)
  })

  it('keeps an existing browser UUID and reuses a legacy share UUID when available', () => {
    const legacy = '11111111-1111-4111-8111-111111111111'
    localStorage.setItem('mailbox_share_visitor_id', legacy)
    expect(getBrowserInstanceId()).toBe(legacy)
    localStorage.setItem('browser_instance_id', '22222222-2222-4222-8222-222222222222')
    expect(getShareVisitorId()).toBe('22222222-2222-4222-8222-222222222222')
  })
})
