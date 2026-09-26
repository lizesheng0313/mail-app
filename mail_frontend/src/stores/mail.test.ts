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
})
