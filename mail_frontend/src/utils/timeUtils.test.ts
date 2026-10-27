import { beforeEach, expect, it } from 'vitest'
import { setI18nLocale } from '@/i18n'
import { formatDuration, formatRelativeTime, formatTimestamp } from './timeUtils'

beforeEach(async () => { await setI18nLocale('zh-CN') })

it.each(['ja', 'ko', 'de', 'fr', 'es', 'pt'] as const)('formats dates, relative times and duration in %s', async locale => {
  await setI18nLocale(locale)
  const timestamp = new Date('2026-10-27T12:00:00Z').getTime()
  expect(formatTimestamp(timestamp, 'date')).toBe(new Date(timestamp).toLocaleDateString(locale))
  expect(formatRelativeTime(Date.now() - 120_000)).not.toMatch(/分钟|分鐘|common\./)
  expect(formatDuration(120_000)).toBe(new Intl.NumberFormat(locale, {
    style: 'unit', unit: 'minute', unitDisplay: 'short', minimumFractionDigits: 1, maximumFractionDigits: 1
  }).format(2))
})
