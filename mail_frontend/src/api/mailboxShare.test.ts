import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import api from '@/services/api'
import { getBrowserInstanceId } from '@/services/sessionIdentity'
import { mailboxShareAPI } from './mailboxShare'
import { mailboxAPI } from './mailbox'
import { upsertStoredGuestMailbox } from '@/utils/guestMailboxes'

const originalAdapter = api.defaults.adapter
beforeEach(() => localStorage.clear())
afterEach(() => { api.defaults.adapter = originalAdapter })

describe('visitor identity across real API interceptors', () => {
  it('sends the guest claim when saving either level of private notes', async () => {
    const requests: any[] = []
    upsertStoredGuestMailbox({ id: 77, email: 'guest@example.com', claim_token: 'guest-claim' })
    api.defaults.adapter = async config => {
      requests.push(config)
      return { data: { code: 0, data: {} }, status: 200, statusText: 'OK', headers: {}, config }
    }
    await mailboxShareAPI.updateBatchNote('a'.repeat(32), '', true)
    await mailboxShareAPI.updateLinkNote(42, '客户甲', true)
    expect(requests.every(config => config.skipAuth && config.headers['X-Guest-Mailbox-Tokens'] === 'guest-claim')).toBe(true)
  })

  it('requests server-side batch grouping and submits batch keys for deletion', async () => {
    const requests: any[] = []
    api.defaults.adapter = async config => {
      requests.push(config)
      return { data: { code: 0, data: {} }, status: 200, statusText: 'OK', headers: {}, config }
    }
    await mailboxShareAPI.getMyShareBatches(2, 20, false, '客户交付')
    await mailboxShareAPI.deleteShareBatches(['a'.repeat(32)])
    await mailboxShareAPI.updateBatchNote('a'.repeat(32), '批次备注')
    await mailboxShareAPI.updateLinkNote(42, '小李')
    expect(requests[0].params).toEqual({ page: 2, page_size: 20, group_by_batch: true, search: '客户交付' })
    expect(requests[1].url).toBe('/mailbox-share/batch-delete-groups')
    expect(JSON.parse(requests[1].data)).toEqual({ batch_keys: ['a'.repeat(32)] })
    expect(requests[2].method).toBe('patch')
    expect(requests[2].url).toBe(`/mailbox-share/batches/${'a'.repeat(32)}/note`)
    expect(JSON.parse(requests[2].data)).toEqual({ batch_title: '批次备注' })
    expect(requests[3].url).toBe('/mailbox-share/42/note')
    expect(JSON.parse(requests[3].data)).toEqual({ link_note: '小李' })
  })

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
