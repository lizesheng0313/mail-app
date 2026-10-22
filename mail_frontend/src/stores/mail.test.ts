import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emailAPI } from '@/api/email'
import { getGuestVisitorId } from '@/utils/guestIdentity'
import { upsertStoredGuestMailbox } from '@/utils/guestMailboxes'
import { useMailStore } from './mail'

describe('guest email access', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('uses only the mailbox token stored under the current visitor ID', async () => {
    getGuestVisitorId()
    upsertStoredGuestMailbox({ id: 7, email: 'guest@example.test', claim_token: 'mailbox-token' })
    const store = useMailStore()
    store.replaceEmails([{ id: 11, mailbox_id: 7, is_read: false }] as any)
    const getEmail = vi.spyOn(emailAPI, 'getEmail').mockResolvedValue({
      code: 0, data: { id: 11, mailbox_id: 7, is_read: false }
    } as any)
    const markAsRead = vi.spyOn(emailAPI, 'markAsRead').mockResolvedValue({ code: 0 } as any)

    expect((await store.fetchEmailDetail(11)).success).toBe(true)
    expect(getEmail).toHaveBeenCalledWith(11, 'system', 'mailbox-token')
    expect((await store.markAsRead(11)).success).toBe(true)
    expect(markAsRead).toHaveBeenCalledWith(11, 'system', 'mailbox-token')

    localStorage.setItem('guest_visitor_id_v1', 'b'.repeat(64))
    await store.fetchEmailDetail(11)
    expect(getEmail).toHaveBeenLastCalledWith(11, 'system', '')
  })

  it.each([403, 404])('clears an open mail after an authoritative %s, without showing a loading screen', async status => {
    const store = useMailStore()
    store.selectedEmail = { id: 11, mailbox_type: 'external', is_read: true } as any
    vi.spyOn(emailAPI, 'getEmail').mockRejectedValue({ response: { status } })
    expect(await store.fetchEmailDetail(11, 'external', true)).toEqual({ success: true, unavailable: true })
    expect(store.selectedEmail).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('preserves the open mail when a push-triggered detail query fails temporarily', async () => {
    const store = useMailStore()
    store.selectedEmail = { id: 11, mailbox_type: 'system', content: 'keep this body', is_read: true } as any
    vi.spyOn(emailAPI, 'getEmail').mockRejectedValue({ response: { status: 503 } })
    expect((await store.fetchEmailDetail(11, 'system', true)).success).toBe(false)
    expect(store.selectedEmail?.content).toBe('keep this body')
  })

  it.each(['success', 'unavailable'])('preserves a different selection after a delayed %s response', async outcome => {
    const store = useMailStore()
    store.selectedEmail = { id: 11, mailbox_type: 'system', is_read: true } as any
    let reject!: (error: unknown) => void
    let resolve!: (response: any) => void
    vi.spyOn(emailAPI, 'getEmail').mockImplementation(() => new Promise((done, fail) => { resolve = done; reject = fail }))
    const pending = store.fetchEmailDetail(11, 'system', true)
    store.selectedEmail = { id: 12, mailbox_type: 'system', is_read: true } as any
    if (outcome === 'success') resolve({ code: 0, data: { id: 11, mailbox_type: 'system' } })
    else reject({ response: { status: 404 } })
    await pending
    expect(store.selectedEmail?.id).toBe(12)
  })

  it('does not query a different mailbox type with the same numeric mail ID', async () => {
    const store = useMailStore()
    store.selectedEmail = { id: 11, mailbox_type: 'hosted', is_read: true } as any
    const getEmail = vi.spyOn(emailAPI, 'getEmail')
    await store.fetchEmailDetail(11, 'system', true)
    expect(getEmail).not.toHaveBeenCalled()
  })
})
