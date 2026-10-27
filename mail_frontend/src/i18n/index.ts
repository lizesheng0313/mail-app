import { createI18n } from 'vue-i18n'

import zhCN from './messages/zh-CN'
import { localeOptions, type SupportedLocale } from './locales'

export type { SupportedLocale } from './locales'

export const LOCALE_STORAGE_KEY = 'app.locale'

export const normalizeLocale = (value?: string | null): SupportedLocale => {
  const raw = String(value || '').split(',')[0].split(';')[0].trim().replaceAll('_', '-').toLowerCase()
  const language = raw.split('-')[0]
  if (language === 'zh' && raw.split('-').some(part => ['tw', 'hk', 'mo', 'hant'].includes(part))) {
    return 'zh-TW'
  }
  if (!raw || language === 'zh') return 'zh-CN'
  return localeOptions.some(option => option.value === language) ? language as SupportedLocale : 'en'
}

export const detectInitialLocale = (): SupportedLocale => {
  if (typeof window === 'undefined') return 'zh-CN'
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
  if (stored) return normalizeLocale(stored)
  const browserLanguages = window.navigator.languages?.length
    ? window.navigator.languages
    : [window.navigator.language]
  const supported = browserLanguages.find(value => {
    const language = value.replaceAll('_', '-').split('-')[0].toLowerCase()
    return language === 'zh' || localeOptions.some(option => option.value === language)
  })
  return normalizeLocale(supported || window.navigator.language)
}

export const messages = {
  'zh-CN': zhCN
}

export const i18n = createI18n({
  legacy: false,
  locale: detectInitialLocale(),
  fallbackLocale: { 'zh-TW': ['zh-CN'], default: ['en', 'zh-CN'] },
  messages: messages as Record<string, typeof zhCN>
})

const localeLoaders = {
  en: () => import('./messages/en'),
  'zh-TW': () => import('./messages/zh-TW'),
  ja: () => import('./messages/ja'),
  ko: () => import('./messages/ko'),
  de: () => import('./messages/de'),
  fr: () => import('./messages/fr'),
  es: () => import('./messages/es'),
  pt: () => import('./messages/pt')
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
  return Promise.all([
    loadLocaleMessages(locale),
    ...(locale !== 'en' && !locale.startsWith('zh') ? [loadLocaleMessages('en')] : [])
  ]).then(() => {
    if (changeId === localeChangeId) i18n.global.locale.value = locale
  })
}

export const getCurrentLocale = (): SupportedLocale => normalizeLocale(i18n.global.locale.value)
