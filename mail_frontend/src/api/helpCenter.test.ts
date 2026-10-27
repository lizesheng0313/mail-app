import { beforeEach, expect, it, vi } from 'vitest'
const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/services/api', () => ({ default: { get } }))
import { helpCenterAPI } from './helpCenter'

beforeEach(() => get.mockClear())

it.each(['ja', 'ko', 'de', 'fr', 'es', 'pt'])('uses the published English help edition for %s', (locale) => {
  helpCenterAPI.listPublicArticles(locale)
  expect(get).toHaveBeenCalledWith('/help-center/articles', { params: { locale: 'en' } })
})

it.each(['zh-CN', 'zh-TW', 'en'])('keeps the existing help edition for %s', (locale) => {
  helpCenterAPI.listPublicArticles(locale)
  expect(get).toHaveBeenCalledWith('/help-center/articles', { params: { locale } })
})
