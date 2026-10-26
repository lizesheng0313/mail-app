import { createI18n } from 'vue-i18n'

import zhCN from './messages/zh-CN'

export type SupportedLocale = 'zh-CN' | 'zh-TW' | 'en'

export const LOCALE_STORAGE_KEY = 'app.locale'

export const normalizeLocale = (value?: string | null): SupportedLocale => {
  const raw = String(value || '').trim().toLowerCase()
  if (raw.startsWith('en')) return 'en'
  if (
    raw.startsWith('zh-tw')
    || raw.startsWith('zh-hk')
    || raw.startsWith('zh-mo')
    || raw.includes('hant')
  ) {
    return 'zh-TW'
  }
  return !raw || raw.startsWith('zh') ? 'zh-CN' : 'en'
}

export const detectInitialLocale = (): SupportedLocale => {
  if (typeof window === 'undefined') return 'zh-CN'
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
  if (stored) return normalizeLocale(stored)
  return normalizeLocale(window.navigator.language)
}

export const messages = {
  'zh-CN': zhCN
}

export const i18n = createI18n({
  legacy: false,
  locale: detectInitialLocale(),
  fallbackLocale: 'zh-CN',
  messages: messages as Record<string, typeof zhCN>
})

const localeLoaders = {
  en: () => import('./messages/en'),
  'zh-TW': () => import('./messages/zh-TW')
}
const localeRequests = new Map<SupportedLocale, Promise<void>>()
let localeChangeId = 0

const loadLocaleMessages = (locale: SupportedLocale): Promise<void> => {
  if (locale === 'zh-CN' || i18n.global.availableLocales.includes(locale)) return Promise.resolve()
  const existing = localeRequests.get(locale)
  if (existing) return existing
  const request = localeLoaders[locale]().then(module => {
    i18n.global.setLocaleMessage(locale, module.default)
  }).finally(() => {
    localeRequests.delete(locale)
  })
  localeRequests.set(locale, request)
  return request
}

export const setI18nLocale = (locale: SupportedLocale) => {
  const changeId = ++localeChangeId
  if (i18n.global.availableLocales.includes(locale)) {
    i18n.global.locale.value = locale
    return Promise.resolve()
  }
  return loadLocaleMessages(locale).then(() => {
    if (changeId === localeChangeId) i18n.global.locale.value = locale
  })
}

export const getCurrentLocale = (): SupportedLocale => normalizeLocale(i18n.global.locale.value)
