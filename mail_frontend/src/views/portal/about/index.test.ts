import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import fallbackArticles from '@/data/helpCenterFallback.json'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: () => '帮助中心' }) }))
vi.mock('@/components/PageHeader/index.vue', () => ({ default: { template: '<header />' } }))
vi.mock('@/api/helpCenter', () => ({
  default: { listPublicArticles: vi.fn() }
}))

import helpCenterAPI from '@/api/helpCenter'
import AboutPage from './index.vue'

const cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup())
  vi.restoreAllMocks()
})

const createPage = async (path = '/about') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/about', component: AboutPage }]
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(defineComponent({ template: '<router-view />' }), {
    global: { plugins: [router] }
  })
  cleanups.push(() => wrapper.unmount())
  await flushPromises()
  return { wrapper, router }
}

describe('Help center', () => {
  it('finds guides by title and opens the best match with Enter', async () => {
    vi.mocked(helpCenterAPI.listPublicArticles).mockResolvedValue({ data: { articles: [] } } as any)
    const { wrapper, router } = await createPage()
    const search = wrapper.get('input#help-search')

    await search.setValue('复制邮箱')
    const results = wrapper.get('section[aria-label="帮助中心搜索结果"]')
    expect(results.text()).toContain('复制邮箱地址')
    expect(results.findAll('a')[0].attributes('href')).toBe('/about?help=help_temp_copy')
    expect(wrapper.find('aside').exists()).toBe(false)

    await search.trigger('keydown.enter')
    await flushPromises()
    expect(router.currentRoute.value.query.help).toBe('help_temp_copy')
    expect((search.element as HTMLInputElement).value).toBe('')
    expect(wrapper.get('main h2').text()).toBe('复制邮箱地址')
  })

  it('searches article text, ignores case, and shows a useful empty state', async () => {
    vi.mocked(helpCenterAPI.listPublicArticles).mockResolvedValue({ data: { articles: [] } } as any)
    const { wrapper } = await createPage()
    const search = wrapper.get('input#help-search')

    await search.setValue('只显示前缀')
    expect(wrapper.get('section[aria-label="帮助中心搜索结果"] a[href="/about?help=help_advanced_api"]').text()).toContain('访问密钥')

    await search.setValue('dns')
    expect(wrapper.get('section[aria-label="帮助中心搜索结果"]').text()).toContain('配置并验证 DNS')

    await search.setValue('不存在的搜索词123')
    expect(wrapper.get('section[aria-label="帮助中心搜索结果"]').text()).toContain('没有找到相关指南')
    await search.trigger('keydown.esc')
    expect(wrapper.find('section[aria-label="帮助中心搜索结果"]').exists()).toBe(false)
  })

  it('searches the current database articles after they load', async () => {
    const imported = fallbackArticles.map((article) => article.article_key === 'help_temp_copy'
      ? { ...article, content_html: '<p>独有搜索测试词</p>' }
      : article)
    vi.mocked(helpCenterAPI.listPublicArticles).mockResolvedValue({ data: { articles: imported } } as any)
    const { wrapper } = await createPage()
    await wrapper.get('input#help-search').setValue('独有搜索测试词')
    expect(wrapper.find('section[aria-label="帮助中心搜索结果"] a[href="/about?help=help_temp_copy"]').exists()).toBe(true)
  })

  it('uses only the available interface screenshots, without generated diagrams', () => {
    expect(fallbackArticles).toHaveLength(61)
    expect(fallbackArticles.filter((article) => article.content_html.includes('<img ')).map((article) => article.article_key)).toEqual([
      'help_start_account', 'help_start_choose', 'help_account_register', 'help_temp_create',
      'help_temp_custom', 'help_temp_copy', 'help_temp_read', 'help_domain_add', 'help_domain_dns',
      'help_domain_dns_aliyun', 'help_mail_share', 'help_mail_search', 'help_advanced_2fa',
      'help_advanced_clients'
    ])
    expect(fallbackArticles.some((article) => article.content_html.includes('/help-center/guide/'))).toBe(false)
    const copyGuide = fallbackArticles.find((article) => article.article_key === 'help_temp_copy')
    expect(copyGuide?.content_html).toContain('/help-center/copy-mailbox-hover.gif')
    expect(copyGuide?.content_html).toContain('复制邮箱')
    expect(copyGuide?.content_html).not.toContain('共享给别人')
  })

  it('renders every help screenshot at its half-resolution display width', () => {
    const widths: Record<string, string> = {
      '/help-center/login-entry.webp': '590',
      '/help-center/mail-types.webp': '905',
      '/help-center/register-entry.webp': '156',
      '/help-center/get-mailbox.webp': '810',
      '/help-center/custom-mailbox.webp': '810',
      '/help-center/copy-mailbox-hover.gif': '392',
      '/help-center/share-mailbox-menu.webp': '392',
      '/help-center/share-mailbox-settings.webp': '512',
      '/help-center/inbox-search-refresh.webp': '400',
      '/help-center/tool-2fa-entry.webp': '305',
      '/help-center/miniapp-qr.webp': '165',
      '/help-center/domain-add-local-demo.png': '896',
      '/help-center/domain-dns-local-demo.png': '896',
      '/help-center/aliyun-dns-records.png': '905',
      '/help-center/aliyun-dns-txt-form.png': '765',
      '/help-center/aliyun-dns-mx-form.png': '765'
    }
    const seen = new Set<string>()
    for (const article of fallbackArticles) {
      const container = document.createElement('div')
      container.innerHTML = article.content_html
      for (const image of container.querySelectorAll('img')) {
        const src = image.getAttribute('src') || ''
        seen.add(src)
        expect(image.getAttribute('width')).toBe(widths[src])
      }
    }
    expect([...seen].sort()).toEqual(Object.keys(widths).sort())
  })

  it('hides generated diagrams still present in previously imported database articles', async () => {
    const imported = fallbackArticles.map((article) =>
      article.article_key === 'help_temp_copy'
        ? {
            ...article,
            content_html: `${article.content_html}<figure class="help-illustration"><img src="/help-center/guide/help_temp_copy.svg" alt="复制邮箱地址操作示意图，非页面截图"><figcaption>操作示意图，非页面截图；请以当前页面实际显示为准。</figcaption></figure>`
          }
        : article
    )
    vi.mocked(helpCenterAPI.listPublicArticles).mockResolvedValue({ data: { articles: imported } } as any)
    const { wrapper } = await createPage('/about?help=help_temp_copy')
    expect(wrapper.get('main').text()).toContain('复制邮箱地址')
    expect(wrapper.find('main figure.help-illustration').exists()).toBe(false)
    expect(wrapper.get('main').text()).not.toContain('非页面截图')
  })

  it('shows all six menu groups even before the content SQL is imported', async () => {
    vi.mocked(helpCenterAPI.listPublicArticles).mockResolvedValue({ data: { articles: [] } } as any)
    const { wrapper } = await createPage()
    const sections = wrapper.findAll('aside a[href^="/about?help=help_category_"]')
    expect(sections.map((section) => section.text())).toEqual([
      '邮箱', '个人中心', '开发者', '自动化', '邮件触达', '工具'
    ])
    expect(wrapper.text()).not.toContain('暂无菜单')
    expect(wrapper.get('aside a[href="/about?help=help_temp_copy"]').text()).toBe('复制邮箱地址')
    expect(wrapper.get('aside a[href="/about?help=help_domain_dns"]').text()).toBe('配置并验证 DNS')
  })

  it('keeps the full guide visible when the database still has the old four articles', async () => {
    const oldArticles = fallbackArticles
      .filter((article) => ['product', 'feature', 'feature1_1', 'feature_1_2'].includes(article.article_key))
      .map((article) => ({ ...article, parent_key: '' }))
    vi.mocked(helpCenterAPI.listPublicArticles).mockResolvedValue({ data: { articles: oldArticles } } as any)
    const { wrapper } = await createPage()
    expect(wrapper.findAll('aside a[href^="/about?help=help_category_"]')).toHaveLength(6)
    expect(wrapper.text()).toContain('邮件触达')
  })

  it('opens a deep guide with its category and topic visible in the menu', async () => {
    vi.mocked(helpCenterAPI.listPublicArticles).mockResolvedValue({ data: { articles: [] } } as any)
    const { wrapper } = await createPage('/about?help=help_temp_copy')
    expect(wrapper.get('main h2').text()).toBe('复制邮箱地址')
    expect(wrapper.get('aside a[href="/about?help=feature1_1"]').text()).toBe('临时邮箱')
    expect(wrapper.get('aside a[href="/about?help=help_temp_copy"]').attributes('aria-current')).toBe('page')
    expect(wrapper.get('main').text()).toContain('···')
    expect(wrapper.get('main img').attributes('src')).toBe('/help-center/copy-mailbox-hover.gif')
    expect(wrapper.get('main img').attributes('width')).toBe('392')
  })

  it('shows the real component screenshots for sharing a mailbox', async () => {
    vi.mocked(helpCenterAPI.listPublicArticles).mockResolvedValue({ data: { articles: [] } } as any)
    const { wrapper } = await createPage('/about?help=help_mail_share')
    expect(wrapper.get('main h2').text()).toBe('分享邮箱给别人')
    expect(wrapper.findAll('main img').map((image) => image.attributes('src'))).toEqual([
      '/help-center/share-mailbox-menu.webp',
      '/help-center/share-mailbox-settings.webp'
    ])
    expect(wrapper.findAll('main img').map((image) => image.attributes('width'))).toEqual(['392', '512'])
    expect(wrapper.get('main').text()).toContain('只发给信任的人')
  })

  it('shows the existing inbox screenshot when explaining where to refresh mail', async () => {
    vi.mocked(helpCenterAPI.listPublicArticles).mockResolvedValue({ data: { articles: [] } } as any)
    const { wrapper } = await createPage('/about?help=help_temp_read')
    expect(wrapper.get('main img').attributes('src')).toBe('/help-center/inbox-search-refresh.webp')
    expect(wrapper.get('main img').attributes('width')).toBe('400')
  })

  it('changes only the selected item and keeps the sidebar still when navigating', async () => {
    vi.mocked(helpCenterAPI.listPublicArticles).mockResolvedValue({ data: { articles: [] } } as any)
    const { wrapper, router } = await createPage('/about?help=help_temp_copy')
    const sidebar = wrapper.get('aside').element as HTMLElement
    const content = wrapper.get('main').element as HTMLElement
    const scrollWindow = vi.spyOn(window, 'scrollTo')
    sidebar.scrollTop = 120
    content.scrollTop = 240

    const parent = wrapper.get('aside a[href="/about?help=feature1_1"]')
    const selected = wrapper.get('aside a[href="/about?help=help_temp_copy"]')
    expect(parent.classes()).not.toContain('bg-primary-50')
    expect(selected.classes()).toContain('font-normal')
    expect(selected.classes()).toContain('bg-primary-50')

    await wrapper.get('aside a[href="/about?help=help_temp_read"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.help).toBe('help_temp_read')
    expect(sidebar.scrollTop).toBe(120)
    expect(content.scrollTop).toBe(0)
    expect(scrollWindow).not.toHaveBeenCalled()
    expect(wrapper.get('aside a[href="/about?help=help_temp_read"]').classes()).toContain('font-normal')
  })

  it('uses complete database content when all six groups have been imported', async () => {
    const imported = fallbackArticles.map((article) =>
      article.article_key === 'help_category_mailboxes'
        ? { ...article, title: '邮箱指南' }
        : article
    )
    vi.mocked(helpCenterAPI.listPublicArticles).mockResolvedValue({ data: { articles: imported } } as any)
    const { wrapper } = await createPage()
    expect(wrapper.get('aside a[href="/about?help=help_category_mailboxes"]').text()).toBe('邮箱指南')
  })

  it('links to the DNS provider guide and explains the external control panel fields', async () => {
    vi.mocked(helpCenterAPI.listPublicArticles).mockResolvedValue({ data: { articles: [] } } as any)
    const { wrapper } = await createPage('/about?help=help_domain_dns_cloudflare')
    expect(wrapper.get('main h2').text()).toBe('Cloudflare 添加 DNS 记录')
    expect(wrapper.get('main').text()).toContain('DNS → Records')
    expect(wrapper.get('main a[href="https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/"]').attributes('rel')).toContain('noopener')
  })

  it('shows the supplied redacted Aliyun screenshots and clarifies the record values', async () => {
    vi.mocked(helpCenterAPI.listPublicArticles).mockResolvedValue({ data: { articles: [] } } as any)
    const { wrapper } = await createPage('/about?help=help_domain_dns_aliyun')
    expect(wrapper.findAll('main img').map((image) => image.attributes('src'))).toEqual([
      '/help-center/aliyun-dns-records.png',
      '/help-center/aliyun-dns-txt-form.png',
      '/help-center/aliyun-dns-mx-form.png'
    ])
    expect(wrapper.get('main').text()).toContain('TXT 不填优先级')
    expect(wrapper.get('main').text()).toContain('优先级请填本站给出的数字')
    expect(wrapper.get('main').text()).not.toContain('SPF')
  })

  it('maps each site DNS column to provider fields and explains separate TXT/MX records', async () => {
    vi.mocked(helpCenterAPI.listPublicArticles).mockResolvedValue({ data: { articles: [] } } as any)
    const add = await createPage('/about?help=help_domain_add')
    expect(add.wrapper.get('main').text()).toContain('在“域名”框只填域名本身')
    expect(add.wrapper.get('main').text()).toContain('DNS 配置')
    expect(add.wrapper.get('main img').attributes('src')).toBe('/help-center/domain-add-local-demo.png')

    const dns = await createPage('/about?help=help_domain_dns')
    expect(dns.wrapper.get('main img').attributes('src')).toBe('/help-center/domain-dns-local-demo.png')
    const rows = dns.wrapper.findAll('main table tr').map((row) => row.text())
    expect(rows).toHaveLength(6)
    expect(rows[1]).toContain('主机记录')
    expect(rows[1]).toContain('Name')
    expect(rows[2]).toContain('记录类型')
    expect(rows[3]).toContain('Mail server')
    expect(rows[4]).toContain('Priority')
    expect(rows[5]).toContain('不填写')
    expect(dns.wrapper.get('main').text()).toContain('每一行都是一条要单独保存的 DNS 记录')
    expect(dns.wrapper.get('main').text()).toContain('立即验证DNS')
  })

  it('separates account social login from mailbox OAuth and warns that password verification needs desktop', async () => {
    vi.mocked(helpCenterAPI.listPublicArticles).mockResolvedValue({ data: { articles: [] } } as any)
    const social = await createPage('/about?help=help_account_social_login')
    expect(social.wrapper.get('main').text()).toContain('不是把微信、Gmail 或 Outlook 邮箱添加到收件箱')
    const verify = await createPage('/about?help=help_external_verify')
    expect(verify.wrapper.get('main').text()).toContain('桌面客户端')
    expect(verify.wrapper.get('main').text()).toContain('不会自动把所有通过的账号加入收件箱')
  })

  it('states the actual controls and important limits in the mailbox and account guides', () => {
    const content = (key: string) => fallbackArticles.find((article) => article.article_key === key)?.content_html || ''
    expect(content('help_domain_add')).toContain('“未匹配邮箱代收”默认开启')
    expect(content('help_domain_catchall')).toContain('admin@该域名')
    expect(content('help_domain_create')).toContain('“随机获取”')
    expect(content('help_mail_share')).toContain('复制邮箱地址只供对方发信')
    expect(content('help_external_send')).toContain('桌面客户端')
    expect(content('help_advanced_api')).toContain('关闭弹窗后列表只显示前缀')
    expect(content('help_advanced_reach')).toContain('行为明细')
    expect(content('help_mail_copy')).not.toContain('<img ')
  })
})
