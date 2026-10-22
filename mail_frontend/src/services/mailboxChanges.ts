/** A completed HTTP mutation invalidates this client's configuration once. */
export function applyMailboxMutationResponse(response: any, token: string) {
  if (response?.code !== 0 || !token || token !== localStorage.getItem('token')) return
  const status = response.mailbox_status
  if (status) dispatchMailboxStatus(status.mailbox_id, status.status, status.error_message)
  const change = response.mailbox_change
  if (!change || !['accounts', 'proxy', 'oauth'].includes(change.resource)) return
  dispatchMailboxChange(change.resource, Number(change.mailbox_id) || undefined)
}

export function dispatchMailboxChange(resource: 'accounts' | 'proxy' | 'oauth', mailboxId?: number) {
  window.dispatchEvent(new CustomEvent('external-mailboxes-changed', {
    detail: { resource, mailboxId },
  }))
}

export function dispatchMailboxStatus(mailboxId: number, status: string, errorMessage: string | null = null) {
  if (!Number(mailboxId) || !['active', 'failed'].includes(status)) return
  window.dispatchEvent(new CustomEvent('external-mailbox-status', {
    detail: { mailboxId: Number(mailboxId), status, error_message: errorMessage },
  }))
}
