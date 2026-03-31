import { createI18n } from 'vue-i18n'

import en from './messages/en'
import zhTW from './messages/zh-TW'
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
  return 'zh-CN'
}

export const detectInitialLocale = (): SupportedLocale => {
  if (typeof window === 'undefined') return 'zh-CN'
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
  if (stored) return normalizeLocale(stored)
  return normalizeLocale(window.navigator.language)
}

export const messages = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  en
}

export const i18n = createI18n({
  legacy: false,
  locale: detectInitialLocale(),
  fallbackLocale: 'zh-CN',
  messages
})

export const setI18nLocale = (locale: SupportedLocale) => {
  i18n.global.locale.value = locale
}

export const getCurrentLocale = (): SupportedLocale => normalizeLocale(i18n.global.locale.value)
