export type StoredGuestMailbox = {
  id: number
  email: string
  created_at?: number | string | null
  expires_at?: number | string | null
  claim_token: string
  daily_limit?: number
  remaining_requests_today?: number
}

const STORAGE_KEY = 'guest_mailboxes_v1'
const DAILY_LIMIT = 5
const MAX_STORED_MAILBOXES = 25

const hasWindow = () => typeof window !== 'undefined'

const normalizeMailbox = (value: any): StoredGuestMailbox | null => {
  const id = Number(value?.id || 0)
  const email = String(value?.email || '').trim()
  const claimToken = String(value?.claim_token || '').trim()
  if (!Number.isFinite(id) || id <= 0 || !email || !claimToken) return null

  return {
    id,
    email,
    created_at: value?.created_at ?? null,
    expires_at: value?.expires_at ?? null,
    claim_token: claimToken,
    daily_limit: Number(value?.daily_limit || DAILY_LIMIT),
    remaining_requests_today: Number(value?.remaining_requests_today ?? 0)
  }
}

export const loadStoredGuestMailboxes = (): StoredGuestMailbox[] => {
  if (!hasWindow()) return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    if (!Array.isArray(parsed)) return []
    const now = Date.now()
    const mailboxes = parsed
      .map(normalizeMailbox)
      .filter((item): item is StoredGuestMailbox => {
        if (!item) return false
        const expiresAt = Number(item.expires_at || 0)
        return !expiresAt || expiresAt > now
      })
      .slice(0, MAX_STORED_MAILBOXES)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mailboxes))
    return mailboxes
  } catch {
    return []
  }
}

export const upsertStoredGuestMailbox = (mailbox: any): StoredGuestMailbox[] => {
  const normalized = normalizeMailbox(mailbox)
  const current = loadStoredGuestMailboxes()
  if (!normalized || !hasWindow()) return current
  const next = [normalized, ...current.filter((item) => item.id !== normalized.id)].slice(
    0,
    MAX_STORED_MAILBOXES
  )
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export const getStoredGuestClaimTokens = () =>
  loadStoredGuestMailboxes().map((item) => item.claim_token)

export const clearStoredGuestMailboxes = () => {
  if (!hasWindow()) return
  window.localStorage.removeItem(STORAGE_KEY)
}

const toTimestamp = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') return 0
  const numericValue = Number(value)
  if (Number.isFinite(numericValue)) {
    return numericValue < 1_000_000_000_000 ? numericValue * 1000 : numericValue
  }
  const parsedValue = Date.parse(String(value))
  return Number.isFinite(parsedValue) ? parsedValue : 0
}

export const countGuestMailboxesCreatedToday = (mailboxes: StoredGuestMailbox[]) => {
  const now = new Date()
  return mailboxes.filter((mailbox) => {
    const timestamp = toTimestamp(mailbox.created_at)
    if (!timestamp) return false
    const createdAt = new Date(timestamp)
    return createdAt.getFullYear() === now.getFullYear()
      && createdAt.getMonth() === now.getMonth()
      && createdAt.getDate() === now.getDate()
  }).length
}

export const GUEST_MAILBOX_DAILY_LIMIT = DAILY_LIMIT
