import { beforeEach, describe, expect, it } from 'vitest'
import { getGuestVisitorId } from './guestIdentity'
import {
  getStoredGuestClaimTokens,
  loadStoredGuestMailboxes,
  upsertStoredGuestMailbox,
} from './guestMailboxes'

describe('browser visitor identity', () => {
  beforeEach(() => localStorage.clear())

  it('keeps one private ID across reloads and migrates the existing chat token', () => {
    const oldToken = 'a'.repeat(64)
    localStorage.setItem('live_chat_guest_token_v1', oldToken)
    expect(getGuestVisitorId()).toBe(oldToken)
    expect(localStorage.getItem('guest_visitor_id_v1')).toBe(oldToken)
    expect(getGuestVisitorId()).toBe(oldToken)
  })

  it('keeps mailboxes isolated by visitor and preserves legacy mailboxes', () => {
    const firstVisitor = getGuestVisitorId()
    expect(firstVisitor).toMatch(/^[0-9a-f]{64}$/)
    upsertStoredGuestMailbox({ id: 10, email: 'first@example.test', claim_token: 'first-claim' })
    expect(getStoredGuestClaimTokens()).toEqual(['first-claim'])

    const secondVisitor = 'b'.repeat(64)
    localStorage.setItem('guest_visitor_id_v1', secondVisitor)
    expect(loadStoredGuestMailboxes()).toEqual([])
    upsertStoredGuestMailbox({ id: 20, email: 'second@example.test', claim_token: 'second-claim' })
    expect(getStoredGuestClaimTokens()).toEqual(['second-claim'])

    localStorage.setItem('guest_visitor_id_v1', firstVisitor)
    expect(loadStoredGuestMailboxes().map(mailbox => mailbox.id)).toEqual([10])

    localStorage.setItem('guest_mailboxes_v1', JSON.stringify([
      { id: 30, email: 'legacy@example.test', claim_token: 'legacy-claim' },
    ]))
    localStorage.setItem('guest_visitor_id_v1', 'c'.repeat(64))
    expect(getStoredGuestClaimTokens()).toEqual(['legacy-claim'])
    expect(localStorage.getItem('guest_mailboxes_v1')).toBeNull()
  })

  it('recovers legacy mailbox entries even if the visitor slot was initialized empty', () => {
    const visitorId = getGuestVisitorId()
    expect(loadStoredGuestMailboxes()).toEqual([])
    expect(localStorage.getItem(`guest_mailboxes_v1:${visitorId}`)).toBe('[]')

    localStorage.setItem('guest_mailboxes_v1', JSON.stringify([
      { id: 41, email: 'saved@example.test', claim_token: 'saved-token' },
    ]))
    expect(loadStoredGuestMailboxes().map(item => item.email)).toEqual(['saved@example.test'])
    expect(localStorage.getItem('guest_mailboxes_v1')).toBeNull()
  })
})
