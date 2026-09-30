import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/helpCenter', () => ({
  default: {
    listAdminArticles: vi.fn(),
    saveArticle: vi.fn(),
    deleteArticle: vi.fn(),
    uploadImage: vi.fn()
  }
}))
vi.mock('@/utils/message', () => ({ showMessage: vi.fn() }))

import helpCenterAPI from '@/api/helpCenter'
import AdminHelpCenter from './index.vue'

const article = {
  article_key: 'help_example',
  parent_key: '',
  title: '原文标题',
  content_html: '<p>原文内容</p>',
  sort_order: 1,
  enabled: true,
  translations: {
    en: { title: 'Old English', content_html: '<p>Old body</p>', stale: true },
    'zh-TW': { title: '繁體標題', content_html: '<p>繁體內容</p>', stale: false }
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(helpCenterAPI.listAdminArticles).mockResolvedValue({ data: { articles: [article] } } as any)
  vi.mocked(helpCenterAPI.saveArticle).mockResolvedValue({ data: { article_key: 'help_example' } } as any)
})

describe('Help center language editor', () => {
  it('shows stale translations and saves English without rewriting the Chinese source', async () => {
    const wrapper = mount(AdminHelpCenter)
    await flushPromises()

    expect(wrapper.text()).toContain('待更新')
    await wrapper.findAll('button').find((button) => button.text().includes('English'))!.trigger('click')
    const titleInput = wrapper.findAll('label').find((label) => label.text().includes('翻译标题'))!.find('input')
    expect((titleInput.element as HTMLInputElement).value).toBe('Old English')
    await titleInput.setValue('Updated English')
    await wrapper.get('textarea').setValue('Updated English body')
    await wrapper.findAll('button').find((button) => button.text() === '保存')!.trigger('click')
    await flushPromises()

    expect(helpCenterAPI.saveArticle).toHaveBeenCalledWith('help_example', expect.objectContaining({
      article_key: 'help_example',
      locale: 'en',
      title: 'Updated English',
      content_html: '<p>Updated English body</p>'
    }))
    expect(article.title).toBe('原文标题')
    wrapper.unmount()
  })
})
