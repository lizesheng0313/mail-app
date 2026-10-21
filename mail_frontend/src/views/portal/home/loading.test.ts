import { flushPromises, mount } from '@vue/test-utils'
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
const realtime = vi.hoisted(() => ({ refresh: null as any }))
vi.mock('@/services/realtimeClient', () => ({
  registerRealtimeScope: () => vi.fn(),
  subscribeRealtime: (events: string[], refresh: unknown) => {
    if (events.includes('mail_changed')) realtime.refresh = refresh
    return vi.fn()
  },
}))
import HomePage from './index.vue'

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('workspace loading', () => {
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
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
      expect(backgroundEmails).not.toHaveBeenCalled()
      expect(emails).toHaveBeenCalledTimes(1)
      await realtime.refresh({ mailbox_type: 'external', mailbox_id: 7, email_id: 99 }, 'mail_changed')
      await flushPromises()
      expect(backgroundEmails).toHaveBeenCalledTimes(1)
      expect(backgroundEmails).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'external' }))
    } finally {
      wrapper.unmount()
    }
  })
})
