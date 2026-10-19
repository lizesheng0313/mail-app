import { isTauri } from '@/services/clientPlatform'

export { getClientPlatform } from '@/services/clientPlatform'

const BROWSER_INSTANCE_KEY = 'browser_instance_id'
const TAB_SESSION_KEY = 'tab_session_id'

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export const getBrowserInstanceId = () => {
  let value = localStorage.getItem(BROWSER_INSTANCE_KEY)
  if (!value) {
    const legacyShareVisitor = localStorage.getItem('mailbox_share_visitor_id') || ''
    value = /^[A-Za-z0-9_-]{8,64}$/.test(legacyShareVisitor) ? legacyShareVisitor : createId()
    localStorage.setItem(BROWSER_INSTANCE_KEY, value)
  }
  return value
}

export const getTabSessionId = () => {
  let value = sessionStorage.getItem(TAB_SESSION_KEY)
  if (!value) {
    value = createId()
    sessionStorage.setItem(TAB_SESSION_KEY, value)
  }
  return value
}

export const getDeviceType = () => {
  if (isTauri()) return 'desktop'
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('ipad') || ua.includes('tablet')) return 'tablet'
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'mobile'
  return 'desktop'
}
