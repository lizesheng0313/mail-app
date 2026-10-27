import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { localeOptions } from './locales'

beforeEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('language loading', () => {
  it.each([
    ['zh-CN', 'zh-CN'], ['zh-SG', 'zh-CN'], ['zh-TW', 'zh-TW'], ['zh-Hant', 'zh-TW'],
    ['zh_HK', 'zh-TW'], ['en-US', 'en'], ['fr-FR', 'fr'], ['fr-CA', 'fr'], ['de-DE', 'de'],
    ['ja-JP', 'ja'], ['ko-KR', 'ko'], ['es-MX', 'es'], ['pt-BR', 'pt'], ['pt-PT', 'pt'],
    ['FR_fr', 'fr'], ['it-IT', 'en'], ['french', 'en'], ['', 'zh-CN']
  ])('selects %s browser language as %s', async (browser, expected) => {
    const { normalizeLocale } = await import('./index')
    expect(normalizeLocale(browser)).toBe(expected)
  })

  it.each(localeOptions.filter(option => !option.value.startsWith('zh')))(
    'loads $value with an English fallback without downloading the other languages', async ({ value }) => {
      const { i18n, setI18nLocale } = await import('./index')
      expect(i18n.global.availableLocales).toEqual(['zh-CN'])
      await setI18nLocale(value)
      expect(i18n.global.locale.value).toBe(value)
      expect(i18n.global.availableLocales.sort()).toEqual([...new Set(['zh-CN', 'en', value])].sort())
      expect(i18n.global.t('common.loading')).not.toBe('common.loading')
    }
  )

  it('uses the first supported browser preference and respects an explicit saved choice', async () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['it-IT', 'fr-CA', 'en-US'])
    const { detectInitialLocale } = await import('./index')
    expect(detectInitialLocale()).toBe('fr')
    localStorage.setItem('app.locale', 'ko')
    expect(detectInitialLocale()).toBe('ko')
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
    const earlier = setI18nLocale('ja')
    await setI18nLocale('zh-CN')
    await earlier
    expect(i18n.global.locale.value).toBe('zh-CN')
  })

  it('restores the saved language before initializing the app', async () => {
    localStorage.setItem('app.locale', 'fr')
    const { useLocaleStore } = await import('@/stores/locale')
    const { i18n } = await import('./index')
    const store = useLocaleStore()
    await Promise.all([store.initialize(), store.initialize()])
    expect(store.locale).toBe('fr')
    expect(i18n.global.t('common.loading')).toBe('Chargement...')
  })

  it('persists only the latest requested language', async () => {
    const { useLocaleStore } = await import('@/stores/locale')
    const { i18n } = await import('./index')
    const store = useLocaleStore()
    await Promise.all([store.setLocale('ja'), store.setLocale('de')])
    expect(store.locale).toBe('de')
    expect(i18n.global.locale.value).toBe('de')
    expect(localStorage.getItem('app.locale')).toBe('de')
  })
})
