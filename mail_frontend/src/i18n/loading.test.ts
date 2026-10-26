import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('language loading', () => {
  it.each([['zh-CN', 'zh-CN'], ['zh-SG', 'zh-CN'], ['zh-TW', 'zh-TW'], ['zh-Hant', 'zh-TW'], ['en-US', 'en'], ['fr-FR', 'en'], ['de-DE', 'en'], ['ja-JP', 'en']])('selects %s browser language as %s', async (browser, expected) => {
    const { normalizeLocale } = await import('./index')
    expect(normalizeLocale(browser)).toBe(expected)
  })
  it('loads English and Traditional Chinese only when selected', async () => {
    const { i18n, setI18nLocale } = await import('./index')
    expect(i18n.global.availableLocales).toEqual(['zh-CN'])
    await setI18nLocale('en')
    expect(i18n.global.t('common.loading')).toBe('Loading...')
    expect(i18n.global.availableLocales).not.toContain('zh-TW')
    await setI18nLocale('zh-TW')
    expect(i18n.global.t('common.loading')).toBe('載入中...')
  })

  it('keeps the latest choice if an earlier language download finishes later', async () => {
    const { i18n, setI18nLocale } = await import('./index')
    const earlier = setI18nLocale('en')
    await setI18nLocale('zh-CN')
    await earlier
    expect(i18n.global.locale.value).toBe('zh-CN')
  })

  it('restores the saved language before initializing the app', async () => {
    localStorage.setItem('app.locale', 'en')
    const { useLocaleStore } = await import('@/stores/locale')
    const { i18n } = await import('./index')
    const store = useLocaleStore()
    await Promise.all([store.initialize(), store.initialize()])
    expect(store.locale).toBe('en')
    expect(i18n.global.t('common.loading')).toBe('Loading...')
  })

  it('persists only the latest requested language', async () => {
    const { useLocaleStore } = await import('@/stores/locale')
    const { i18n } = await import('./index')
    const store = useLocaleStore()
    await Promise.all([store.setLocale('en'), store.setLocale('zh-TW')])
    expect(store.locale).toBe('zh-TW')
    expect(i18n.global.locale.value).toBe('zh-TW')
    expect(localStorage.getItem('app.locale')).toBe('zh-TW')
  })
})
