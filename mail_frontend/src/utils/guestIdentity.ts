// A browser visitor has one private, persistent identity. The random value is
// also the support-chat credential; never use an IP address as this identity.
const VISITOR_ID_KEY = 'guest_visitor_id_v1'
const LEGACY_CHAT_TOKEN_KEY = 'live_chat_guest_token_v1'
const VISITOR_ID_PATTERN = /^[0-9a-f]{64}$/

export const getGuestVisitorId = (): string => {
  if (typeof window === 'undefined') return ''

  const saved = window.localStorage.getItem(VISITOR_ID_KEY) || ''
  const legacy = window.localStorage.getItem(LEGACY_CHAT_TOKEN_KEY) || ''
  const visitorId = VISITOR_ID_PATTERN.test(saved)
    ? saved
    : VISITOR_ID_PATTERN.test(legacy)
      ? legacy
      : Array.from(crypto.getRandomValues(new Uint8Array(32)), byte =>
          byte.toString(16).padStart(2, '0')
        ).join('')

  if (saved !== visitorId) window.localStorage.setItem(VISITOR_ID_KEY, visitorId)
  // Keep an already-open older frontend tab on the same visitor conversation.
  if (legacy !== visitorId) window.localStorage.setItem(LEGACY_CHAT_TOKEN_KEY, visitorId)
  return visitorId
}
