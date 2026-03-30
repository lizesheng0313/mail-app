import { createI18n } from 'vue-i18n'

import en from './messages/en'
import zhCN from './messages/zh-CN'

export type SupportedLocale = 'zh-CN' | 'en'

export const LOCALE_STORAGE_KEY = 'app.locale'

export const normalizeLocale = (value?: string | null): SupportedLocale => {
  const raw = String(value || '').trim().toLowerCase()
  if (raw.startsWith('en')) return 'en'
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
