import { afterEach, expect, it, vi } from 'vitest'
import { applyMailboxMutationResponse } from './mailboxChanges'

afterEach(() => { localStorage.clear(); vi.restoreAllMocks() })

it('delivers a successful mailbox command locally with its affected resource', () => {
  localStorage.setItem('token', 'current')
  const changed = vi.fn()
  window.addEventListener('external-mailboxes-changed', changed)
  try {
    const result = { code: 0, mailbox_change: { resource: 'proxy', mailbox_id: 12 } }
    applyMailboxMutationResponse(result, 'old')
    applyMailboxMutationResponse({ ...result, code: 1 }, 'current')
    expect(changed).not.toHaveBeenCalled()
    applyMailboxMutationResponse(result, 'current')
    expect(changed).toHaveBeenCalledOnce()
    expect(changed.mock.calls[0][0].detail).toEqual({ resource: 'proxy', mailboxId: 12 })
  } finally { window.removeEventListener('external-mailboxes-changed', changed) }
})
