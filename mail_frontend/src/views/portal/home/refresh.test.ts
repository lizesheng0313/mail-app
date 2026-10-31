import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { i18n, setI18nLocale } from '@/i18n'
import { useUserStore } from '@/stores/user'
import { useMailboxStore } from '@/stores/auth'
import { useMailStore } from '@/stores/mail'
import { emailAPI } from '@/api/email'
import { batchLoginAPI } from '@/api/batchLogin'
import { showMessage } from '@/utils/message'

vi.mock('@/utils/message', () => ({ showMessage: vi.fn() }))
vi.mock('@/services/realtimeClient', () => ({
  registerRealtimeScope: () => vi.fn(),
  subscribeRealtime: () => vi.fn()
}))
import HomePage from './index.vue'

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('manual inbox refresh', () => {
  it('collects the selected external mailbox once, refreshes its mail, and allows retry after failure', async () => {
    vi.useFakeTimers()
    localStorage.setItem('token', 'external-inbox-session')
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    await setI18nLocale('zh-CN')
    const pinia = createPinia()
    setActivePinia(pinia)
    const user = useUserStore()
    user.isAuthenticated = true
    user.user = { id: 1 } as any
    vi.spyOn(useMailboxStore(), 'fetchMailboxes').mockResolvedValue({ success: true } as any)
    vi.spyOn(useMailStore(), 'fetchUserEmails').mockResolvedValue({ success: true } as any)
    const query = vi.spyOn(batchLoginAPI, 'getExternalEmails').mockResolvedValue({
      code: 0, data: { emails: [{ id: 100, mailbox_id: 7 }], pagination: { total: 1 } }
    } as any)
    const history = vi.spyOn(batchLoginAPI, 'fetchAllExternalMailboxesOnline')
    let finish!: (value: any) => void
    const collect = vi.spyOn(batchLoginAPI, 'fetchExternalMailboxOnline')
      .mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div />' } }] })
    await router.push('/')
    const wrapper = mount(HomePage, { shallow: true, global: {
      plugins: [pinia, router, i18n],
      stubs: {
        ThreeColumnLayout: { template: '<div><slot name="middle" /></div>' },
        EmailList: { template: '<section><div data-region="title"><slot name="title-extra" /></div><div data-region="actions"><slot name="actions" /></div></section>' },
        EmailRefreshButton: false
      }
    } })
    try {
      await flushPromises()
      const page = (wrapper.vm as any).$.setupState
      page.mailboxType = 'external'
      await flushPromises()
      const button = wrapper.get('[data-region="title"] button[aria-label="立即刷新"]')
      expect(wrapper.find('[data-region="actions"] button').exists()).toBe(false)
      expect(button.text()).toBe('')
      await button.trigger('click')
      expect(showMessage).toHaveBeenCalledWith('请选择邮箱', 'warning')
      expect(collect).not.toHaveBeenCalled()
      expect(history).not.toHaveBeenCalled()
      page.selectedExternalMailboxId = 7
      await flushPromises()
      await button.trigger('click')
      await button.trigger('click')
      await page.fetchAllExternalEmailsOnline()
      expect(collect).toHaveBeenCalledExactlyOnceWith(7)
      expect(button.attributes('disabled')).toBeDefined()
      expect(button.attributes('aria-busy')).toBe('true')
      expect(page.fetchingExternalEmails).toBe(false)
      expect(history).not.toHaveBeenCalled()
      finish({ code: 0, message: '收取成功' })
      await flushPromises()
      await vi.advanceTimersByTimeAsync(150)
      await flushPromises()
      expect(query).toHaveBeenCalledExactlyOnceWith(1, 20, 7)
      expect(page.externalEmails).toEqual([{ id: 100, mailbox_id: 7 }])
      expect(button.attributes('disabled')).toBeUndefined()
      expect(button.attributes('aria-busy')).toBe('false')

      page.selectedExternalMailboxId = 8
      collect.mockResolvedValueOnce({ code: 1, message: '需要重新授权' } as any)
      await button.trigger('click')
      await flushPromises()
      expect(collect).toHaveBeenLastCalledWith(8)
      expect(showMessage).toHaveBeenCalledWith('需要重新授权', 'error')
      expect(button.attributes('disabled')).toBeUndefined()
      collect.mockResolvedValueOnce({ code: 0 } as any)
      query.mockResolvedValueOnce({
        code: 0, data: { emails: [{ id: 101, mailbox_id: 8 }], pagination: { total: 1 } }
      } as any)
      await button.trigger('click')
      await flushPromises()
      await vi.advanceTimersByTimeAsync(150)
      await flushPromises()
      expect(collect).toHaveBeenCalledTimes(3)
      expect(query).toHaveBeenLastCalledWith(1, 20, 8)
      expect(page.externalEmails).toEqual([{ id: 101, mailbox_id: 8 }])
      expect(button.attributes('disabled')).toBeUndefined()
      expect(history).not.toHaveBeenCalled()

      page.fetchingExternalEmails = true
      await flushPromises()
      await button.trigger('click')
      expect(collect).toHaveBeenCalledTimes(3)
    } finally { wrapper.unmount() }
  })

  it.each(['system', 'hosted'] as const)('refreshes the current %s inbox without losing filters or the open mail', async (type) => {
    vi.useFakeTimers()
    localStorage.setItem('token', 'manual-refresh-session')
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    await setI18nLocale('zh-CN')
    const pinia = createPinia()
    setActivePinia(pinia)
    const user = useUserStore()
    user.isAuthenticated = true
    user.user = { id: 1 } as any
    const mail = useMailStore()
    vi.spyOn(useMailboxStore(), 'fetchMailboxes').mockResolvedValue({ success: true } as any)
    vi.spyOn(mail, 'fetchUserEmails').mockResolvedValue({ success: true } as any)
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div />' } }] })
    await router.push('/')
    const wrapper = mount(HomePage, { shallow: true, global: {
      plugins: [pinia, router, i18n],
      stubs: {
        ThreeColumnLayout: { template: '<div><slot name="middle" /></div>' },
        EmailList: { template: '<section><slot name="title-extra" /></section>' },
        EmailRefreshButton: false
      }
    } })
    try {
      await flushPromises()
      const page = (wrapper.vm as any).$.setupState
      page.mailboxType = type
      mail.selectedEmail = { id: 99, mailbox_type: type, subject: 'Opened mail' } as any
      const selected = mail.selectedEmail
      let finish!: (value: any) => void
      const query = type === 'system'
        ? vi.spyOn(mail, 'fetchMailboxEmails')
        : vi.spyOn(emailAPI, 'getUserEmails')
      query.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
      if (type === 'system') {
        page.selectedMailboxId = 7
        page.showOnlyUnread = true
        mail.currentPage = 3
        mail.searchKeyword = 'invoice'
      } else {
        page.selectedHostedMailboxId = 7
        page.showOnlyUnreadHosted = true
        page.hostedEmailPage = 3
        page.hostedSearchKeyword = 'invoice'
      }
      await flushPromises()
      const button = wrapper.get('button[aria-label="立即刷新"]')
      await button.trigger('click')
      expect(query).toHaveBeenCalledTimes(1)
      const params = { page: 3, page_size: 20, unread: true, search: 'invoice' }
      if (type === 'system') expect(query).toHaveBeenCalledWith(7, params, true)
      else expect(query).toHaveBeenCalledWith({ ...params, type: 'hosted', mailbox_id: 7 })
      expect(button.attributes('disabled')).toBeDefined()
      await button.trigger('click')
      expect(query).toHaveBeenCalledTimes(1)
      finish(type === 'system' ? { success: false } : { code: 1 })
      await flushPromises()
      await vi.advanceTimersByTimeAsync(1200)
      expect(button.attributes('disabled')).toBeUndefined()
      expect(mail.selectedEmail).toBe(selected)

      query.mockResolvedValueOnce(type === 'system' ? { success: true } : {
        code: 0, data: { emails: [{ id: 100 }], pagination: { page: 3, total: 41 } }
      })
      await button.trigger('click')
      await flushPromises()
      await vi.advanceTimersByTimeAsync(1200)
      expect(query).toHaveBeenCalledTimes(2)
      expect(button.attributes('disabled')).toBeUndefined()
      expect(mail.selectedEmail).toBe(selected)
      if (type === 'hosted') expect(page.hostedEmails).toEqual([{ id: 100, mailbox_type: 'hosted' }])
    } finally { wrapper.unmount() }
  })

})
