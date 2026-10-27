import { createI18n } from 'vue-i18n'
import { describe, expect, it, vi } from 'vitest'
import en from './messages/en'
import ja from './messages/ja'
import ko from './messages/ko'
import de from './messages/de'
import fr from './messages/fr'
import es from './messages/es'
import pt from './messages/pt'

type Messages = { [key: string]: string | Messages }
const flatten = (messages: Messages, prefix = ''): Record<string, string> => Object.assign({},
  ...Object.entries(messages).map(([key, value]) => typeof value === 'string'
    ? { [`${prefix}${key}`]: value }
    : flatten(value, `${prefix}${key}.`))
)
const source = flatten(en)
const parameters = (text: string) => (text.match(/\{[^{}]*\}/g) || []).sort()
const locales = { ja, ko, de, fr, es, pt }

describe('complete translated UI messages', () => {
  it.each(Object.entries(locales))('%s preserves all keys, parameters and payment units', (locale, messages) => {
    const translated = flatten(messages)
    expect(Object.keys(translated).sort()).toEqual(Object.keys(source).sort())
    for (const [key, text] of Object.entries(translated)) {
      if (source[key].trim()) expect(text.trim(), key).not.toBe('')
      else expect(text.trim(), key).toBe('')
      expect(parameters(text), key).toEqual(parameters(source[key]))
      expect(text, key).not.toMatch(/ZXQ\w*QXZ/)
      expect(text.match(/^\s*/)?.[0], key).toBe(source[key].match(/^\s*/)?.[0])
      expect(text.match(/\s*$/)?.[0], key).toBe(source[key].match(/\s*$/)?.[0])
    }
    for (const key of ['paypalRecharge.quote', 'paypalRecharge.price', 'paypalRecharge.amount']) {
      expect(translated[key], key).toContain('USD')
    }
    expect(translated['paypalRecharge.cnyQuote']).toContain('CNY')
    expect(translated['common.loading']).not.toBe(en.common.loading)
    expect(translated['login.submitLogin']).not.toBe(en.login.submitLogin)
  })

  it.each(Object.entries(locales))('%s compiles and renders every message through vue-i18n', (locale, messages) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const i18n = createI18n({ legacy: false, locale, messages: { [locale]: messages }, missingWarn: false, fallbackWarn: false })
      for (const [key, text] of Object.entries(flatten(messages))) {
        const named = Object.fromEntries([...text.matchAll(/\{(\w+)\}/g)].map(([, name]) => [name, name === 'count' ? 2 : 'sample']))
        expect(i18n.global.t(key, named), key).not.toBe(key)
      }
      expect(error).not.toHaveBeenCalled()
      expect(i18n.global.t('batchAdd.inputPlaceholder')).toContain('you@163.com')
      expect(i18n.global.t('triggerModal.placeholderSender')).toContain('admin@example.com')
      expect(i18n.global.t('automationModal.extractRulesPlaceholder')).toBe('[{"selector": "h1", "field": "title"}]')
      expect(i18n.global.t('inventoryModal.placeholderSingle')).toContain('account(at)example.com|password456')
      expect(i18n.global.t('paypalRecharge.quote', { usd: '3.50', coins: '3.50' })).toContain('3.50')
    } finally {
      error.mockRestore()
    }
  })
})
