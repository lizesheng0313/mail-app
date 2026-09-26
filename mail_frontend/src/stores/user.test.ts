import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authAPI } from '@/api/auth'
import { mailboxAPI } from '@/api/mailbox'
import { getStoredGuestClaimTokens, upsertStoredGuestMailbox } from '@/utils/guestMailboxes'
import { useMailboxStore } from './auth'
import { useUserStore } from './user'

vi.mock('@/services/productAnalytics', () => ({ trackProductEvent: vi.fn() }))

describe('guest mailboxes after login', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    setActivePinia(createPinia())
  })

  it('claims only this visitor’s stored mailboxes into the signed-in account', async () => {
    upsertStoredGuestMailbox({ id: 7, email: 'mine@example.test', claim_token: 'mine-token' })
    const otherVisitorId = 'b'.repeat(64)
    localStorage.setItem(`guest_mailboxes_v1:${otherVisitorId}`, JSON.stringify([
      { id: 8, email: 'other@example.test', claim_token: 'other-token' },
    ]))
    const login = vi.spyOn(authAPI, 'login').mockResolvedValue({
      code: 0,
      data: { user: { id: 42 }, access_token: 'account-token' },
    } as any)
    const claim = vi.spyOn(mailboxAPI, 'claimGuestMailboxes').mockResolvedValue({
      code: 0,
      data: { claimed_count: 1, mailboxes: [{ id: 7, email: 'mine@example.test' }] },
    } as any)

    const user = useUserStore()
    const mailboxes = useMailboxStore()
    mailboxes.restoreGuestMailboxes()
    expect((await user.login('user@example.test', 'password')).success).toBe(true)
    expect(login).toHaveBeenCalledWith('user@example.test', 'password')
    expect(claim).toHaveBeenCalledWith(['mine-token'])
    expect(user.isAuthenticated).toBe(true)
    expect(mailboxes.guestMailboxes).toEqual([])
    expect(getStoredGuestClaimTokens()).toEqual([])
    expect(localStorage.getItem(`guest_mailboxes_v1:${otherVisitorId}`)).toContain('other-token')
  })
})
