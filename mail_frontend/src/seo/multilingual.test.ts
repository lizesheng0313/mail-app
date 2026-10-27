import { expect, it } from 'vitest'
import { applyPageSeo } from './index'
import { localeOptions } from '@/i18n/locales'

it.each(localeOptions)('sets the correct page and Open Graph language for $value', ({ value, ogLocale }) => {
  applyPageSeo({ title: 'Test', description: 'Test description', lang: value })
  expect(document.documentElement.lang).toBe(value)
  expect(document.head.querySelector('meta[property="og:locale"]')?.getAttribute('content')).toBe(ogLocale)
})
