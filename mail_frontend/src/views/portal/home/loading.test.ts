import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { batchLoginAPI } from '@/api/batchLogin'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { i18n, setI18nLocale } from '@/i18n'
import { useUserStore } from '@/stores/user'
import { useMailboxStore } from '@/stores/auth'
import { useMailStore } from '@/stores/mail'
import { hostedDomainAPI } from '@/api/hostedDomain'
import { emailAPI } from '@/api/email'
import smtpAccountsAPI from '@/api/smtpAccounts'
import mailboxProxyApi from '@/api/mailboxProxy'
import { stopDesktopMailboxCache } from '@/services/desktopMailboxCache'
const realtime = vi.hoisted(() => ({ refresh: null as any, invoke: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: realtime.invoke }))
vi.mock('@/services/realtimeClient', () => ({
  registerRealtimeScope: () => vi.fn(),
  subscribeRealtime: (events: string[], refresh: unknown) => {
    if (events.includes('mail_changed')) realtime.refresh = refresh
    return vi.fn()
  },
}))
import HomePage from './index.vue'

afterEach(() => {
  stopDesktopMailboxCache()
  vi.useRealTimers()
  localStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('workspace loading', () => {
  it('keeps successful local collection on the local route without rewriting active status', async () => {
    vi.useFakeTimers()
    localStorage.setItem('token', 'local-manual-session')
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    const pinia = createPinia()
    setActivePinia(pinia)
    const user = useUserStore()
    user.isAuthenticated = true
    user.user = { id: 1 } as any
    vi.spyOn(useMailboxStore(), 'fetchMailboxes').mockResolvedValue({ success: true } as any)
    vi.spyOn(useMailStore(), 'fetchUserEmails').mockResolvedValue({ success: true } as any)
    vi.spyOn(mailboxProxyApi, 'getRuntimeProxy').mockResolvedValue({ code: 0, data: { runtime_proxy: null } } as any)
    vi.spyOn(batchLoginAPI, 'getAllAccounts').mockResolvedValue({ code: 0, data: { accounts: [{
      id: 7, email: 'local@example.test', auth_type: 'password', protocol: 'imap', status: 'active',
      imap_host: 'imap.example.test', imap_port: 993
    }] } } as any)
    vi.spyOn(batchLoginAPI, 'getExternalEmails').mockResolvedValue({ code: 0, data: { emails: [], pagination: { total: 0 } } } as any)
    const status = vi.spyOn(batchLoginAPI, 'updateMailboxStatus').mockResolvedValue({ code: 0 } as any)
    const relay = vi.spyOn(batchLoginAPI, 'updateExternalMailboxRelayFetchMode').mockResolvedValue({ code: 0 } as any)
    realtime.invoke.mockResolvedValue({ count: 0 })
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div />' } }] })
    await router.push('/')
    const wrapper = mount(HomePage, { shallow: true, global: { plugins: [pinia, router, i18n] } })
    try {
      await flushPromises()
      vi.stubGlobal('__TAURI_INTERNALS__', {})
      const actions = (wrapper.vm as any).$.setupState
      actions.mailboxType = 'external'
      actions.selectedExternalMailboxId = 7
      const manual = actions.fetchExternalMailboxEmails()
      await flushPromises()
      await vi.advanceTimersByTimeAsync(150)
      await manual
      expect(realtime.invoke).toHaveBeenCalledWith('fetch_emails', expect.objectContaining({ mailboxId: 7, protocol: 'imap' }))
      expect(status).not.toHaveBeenCalled()
      expect(relay).not.toHaveBeenCalled()
    } finally { wrapper.unmount() }
  })
  it('stops manual collection and account verification when proxy lookup fails', async () => {
    localStorage.setItem('token', 'test-session')
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    const pinia = createPinia()
    setActivePinia(pinia)
    const user = useUserStore()
    user.isAuthenticated = true
    user.user = { id: 1 } as any
    vi.spyOn(useMailboxStore(), 'fetchMailboxes').mockResolvedValue({ success: true } as any)
    vi.spyOn(useMailStore(), 'fetchUserEmails').mockResolvedValue({ success: true } as any)
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div />' } }] })
    await router.push('/')
    const wrapper = mount(HomePage, { shallow: true, global: { plugins: [pinia, router, i18n] } })
    try {
      await flushPromises()
      vi.stubGlobal('__TAURI_INTERNALS__', {})
      const actions = (wrapper.vm as any).$.setupState
      vi.spyOn(mailboxProxyApi, 'getRuntimeProxy').mockRejectedValue(new Error('proxy offline'))
      await expect(actions.loadMailboxRuntimeProxy(7)).rejects.toThrow('proxy offline')
      vi.spyOn(mailboxProxyApi, 'previewRuntimeProxy').mockResolvedValue({ code: 1, message: '代理配置无效' } as any)
      await expect(actions.previewMailboxRuntimeProxy('a@test', null, 1)).rejects.toThrow('代理配置无效')
    } finally {
      wrapper.unmount()
    }
  })

  it('loads system mailboxes and mail in parallel without fetching other mailbox types', async () => {
    vi.useFakeTimers()
    localStorage.setItem('token', 'test-session')
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    const backgroundEmails = vi.spyOn(emailAPI, 'getUserEmails').mockResolvedValue({ code: 0, data: { emails: [] } } as any)
    await setI18nLocale('zh-CN')
    const pinia = createPinia()
    setActivePinia(pinia)
    const user = useUserStore()
    user.isAuthenticated = true
    user.user = { id: 1 } as any
    let finishMailboxes!: () => void
    const mailboxes = vi.spyOn(useMailboxStore(), 'fetchMailboxes').mockReturnValue(
      new Promise(resolve => { finishMailboxes = () => resolve({ success: true }) })
    )
    const emails = vi.spyOn(useMailStore(), 'fetchUserEmails').mockResolvedValue({ success: true } as any)
    const domains = vi.spyOn(hostedDomainAPI, 'listAllDomains')
    const smtp = vi.spyOn(smtpAccountsAPI, 'getAccounts')
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div />' } }] })
    await router.push('/')
    const wrapper = mount(HomePage, { shallow: true, global: { plugins: [pinia, router, i18n] } })
    try {
      await flushPromises()
      expect(mailboxes).toHaveBeenCalledTimes(1)
      expect(emails).toHaveBeenCalledTimes(1)
      expect(domains).not.toHaveBeenCalled()
      expect(smtp).not.toHaveBeenCalled()
      finishMailboxes()
      await flushPromises()
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
      expect(backgroundEmails).not.toHaveBeenCalled()
      expect(emails).toHaveBeenCalledTimes(1)
      backgroundEmails.mockResolvedValueOnce({ code: 0, data: { emails: [{
        id: 99, subject: 'New local receipt', is_read: false, received_at: Date.now()
      }] } } as any)
      window.dispatchEvent(new CustomEvent('external-mailbox-synced', { detail: { mailboxId: 7 } }))
      await flushPromises()
      expect(backgroundEmails).toHaveBeenCalledTimes(1)
      expect(backgroundEmails).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'external' }))
      expect(document.title).toContain('来新消息了')
      expect(realtime.refresh).toBeNull()
    } finally {
      wrapper.unmount()
    }
  })

  it('updates collected mail without a WebSocket echo and combines local and manual refreshes', async () => {
    vi.useFakeTimers()
    localStorage.setItem('token', 'test-session')
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    const pinia = createPinia()
    setActivePinia(pinia)
    const user = useUserStore()
    user.isAuthenticated = true
    user.user = { id: 1 } as any
    const accounts = [{ id: 7, email: 'test@example.test', auth_type: 'oauth2' }]
    const accountQuery = vi.spyOn(batchLoginAPI, 'getAccounts').mockResolvedValue({ code: 0, data: { accounts } } as any)
    const emails = vi.spyOn(batchLoginAPI, 'getExternalEmails').mockResolvedValue({ code: 0, data: { emails: [], pagination: { total: 0 } } } as any)
    vi.spyOn(batchLoginAPI, 'getExternalMailFetchAllStatus').mockResolvedValue({ code: 0, data: null } as any)
    vi.spyOn(smtpAccountsAPI, 'getAccounts').mockResolvedValue({ code: 0, data: { accounts: [] } } as any)
    const List = defineComponent({
      emits: ['accounts-loaded'], template: '<div />',
      setup(_, { emit, expose }) {
        expose({ loadAccounts: async () => {
          await batchLoginAPI.getAccounts(1, 20)
          emit('accounts-loaded', accounts)
        } })
      }
    })
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div />' } }] })
    await router.push('/')
    const wrapper = mount(HomePage, { shallow: true, props: { initialMailboxType: 'external' },
      global: { plugins: [pinia, router, i18n], stubs: {
        ThreeColumnLayout: { template: '<div><slot name="left" /><slot name="middle" /><slot name="right" /></div>' },
        ExternalMailboxList: List
      } } })
    try {
      await flushPromises()
      await vi.advanceTimersByTimeAsync(150)
      await flushPromises()
      expect(accountQuery).toHaveBeenCalledTimes(1)
      expect(emails).toHaveBeenCalledTimes(1)
      const actions = (wrapper.vm as any).$.setupState
      expect(actions.externalMailboxAuthTypeMap[7]).toBe('oauth2')
      const titleQuery = vi.spyOn(emailAPI, 'getUserEmails')
      hidden.mockReturnValue(true)
      window.dispatchEvent(new CustomEvent('external-mailbox-synced', { detail: { mailboxId: 7 } }))
      const manual = actions.handleRefreshExternalEmails({ mailboxId: 7 })
      await vi.advanceTimersByTimeAsync(150)
      await manual
      expect(emails).toHaveBeenCalledTimes(2)
      expect(emails).toHaveBeenLastCalledWith(1, 20, 7)
      expect(accountQuery).toHaveBeenCalledTimes(2)
      expect(titleQuery).not.toHaveBeenCalled()

      let finish!: (value: any) => void
      emails.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
      const older = actions.loadExternalMailboxEmails()
      await vi.advanceTimersByTimeAsync(150)
      actions.selectedExternalMailboxId = 8
      const newer = actions.loadExternalMailboxEmails()
      finish({ code: 0, data: { emails: [{ id: 1, subject: 'stale mailbox' }], pagination: { total: 1 } } })
      await older
      expect(actions.externalEmails).toEqual([])
      await vi.advanceTimersByTimeAsync(150)
      await newer
      expect(emails).toHaveBeenLastCalledWith(1, 20, 8)
      titleQuery.mockResolvedValue({ code: 0, data: { emails: [], pagination: { total: 0 } } } as any)
      const search = actions.handleSearchExternalEmails('invoice')
      await vi.advanceTimersByTimeAsync(150)
      await search
      expect(titleQuery).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'invoice', mailbox_id: 8 }))
      window.dispatchEvent(new CustomEvent('external-mailbox-synced', { detail: { mailboxId: 8 } }))
      await flushPromises()
      await vi.advanceTimersByTimeAsync(150)
      await flushPromises()
      expect(titleQuery).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'invoice', mailbox_id: 8 }))
      expect(actions.externalSearchKeyword).toBe('invoice')
      const queries = titleQuery.mock.calls.length
      await vi.advanceTimersByTimeAsync(3600000)
      expect(emails).toHaveBeenCalledTimes(4)
      expect(titleQuery).toHaveBeenCalledTimes(queries)
      expect(realtime.refresh).toBeNull()
    } finally { wrapper.unmount() }
  })

})
