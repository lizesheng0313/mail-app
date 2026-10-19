import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import api from '@/services/api'
import { getBrowserInstanceId } from '@/services/sessionIdentity'
import { mailboxShareAPI } from './mailboxShare'
import { mailboxAPI } from './mailbox'

const originalAdapter = api.defaults.adapter
beforeEach(() => localStorage.clear())
afterEach(() => { api.defaults.adapter = originalAdapter })

describe('visitor identity across real API interceptors', () => {
  it('sends the same browser UUID for info, direct reading, fetching, and guest creation', async () => {
    const requests: any[] = []
    api.defaults.adapter = async config => {
      requests.push(config)
      return { data: { code: 0, data: {} }, status: 200, statusText: 'OK', headers: {}, config }
    }
    await mailboxShareAPI.getShareInfo('token')
    await mailboxShareAPI.getShareEmails('token')
    await mailboxShareAPI.fetchShareEmails('token')
    await mailboxAPI.getTempMailbox()
    expect(requests).toHaveLength(4)
    expect(requests.every(config => config.headers['X-Visitor-Id'] === getBrowserInstanceId())).toBe(true)
    expect(requests.every(config => config.headers['X-Client-Type'] === 'web')).toBe(true)
    expect(requests[3].headers['X-Guest-Visitor-Id']).toMatch(/^[0-9a-f]{64}$/)
    expect(requests[3].headers['X-Guest-Visitor-Id']).not.toBe(getBrowserInstanceId())
  })
})
