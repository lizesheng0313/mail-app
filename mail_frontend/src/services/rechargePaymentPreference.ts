export type RechargePaymentMethod = 'alipay' | 'paypal'

const mainlandTimeZones = new Set([
  'Asia/Shanghai', 'Asia/Chongqing', 'Asia/Chungking', 'Asia/Harbin', 'Asia/Urumqi', 'PRC'
])
const unknownTimeZones = new Set(['', 'UTC', 'GMT', 'Etc/UTC', 'Etc/GMT'])

// A display preference only. Never use browser region hints to restrict payments.
export function preferredRechargeMethod(timeZone: string, languages: readonly string[]): RechargePaymentMethod {
  if (mainlandTimeZones.has(timeZone)) return 'alipay'
  if (!unknownTimeZones.has(timeZone) && !timeZone.startsWith('Etc/')) return 'paypal'
  const language = languages.find(value => value.trim()) || ''
  if (!language || /(?:^|-)CN(?:-|$)/i.test(language) || /^zh(?:-Hans)?$/i.test(language)) return 'alipay'
  return 'paypal'
}

export function getRechargePaymentMethods(): RechargePaymentMethod[] {
  let timeZone = ''
  try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '' } catch { /* Use browser language below. */ }
  const languages = typeof navigator === 'undefined' ? [] : navigator.languages?.length ? navigator.languages : [navigator.language || '']
  return preferredRechargeMethod(timeZone, languages) === 'paypal' ? ['paypal', 'alipay'] : ['alipay', 'paypal']
}
