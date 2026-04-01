import { isTauri } from '@/services/api'

const BROWSER_INSTANCE_KEY = 'browser_instance_id'
const TAB_SESSION_KEY = 'tab_session_id'

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const getBrowserInstanceId = () => {
  let value = localStorage.getItem(BROWSER_INSTANCE_KEY)
  if (!value) {
    value = createId()
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

export const getClientPlatform = () => (isTauri() ? 'desktop' : 'web')

export const getDeviceType = () => {
  if (isTauri()) return 'desktop'
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('ipad') || ua.includes('tablet')) return 'tablet'
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'mobile'
  return 'desktop'
}
