import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { i18n, setI18nLocale } from '@/i18n'
import { useUserStore } from '@/stores/user'
import { useMailboxStore } from '@/stores/auth'
import { useMailStore } from '@/stores/mail'
import { hostedDomainAPI } from '@/api/hostedDomain'
import smtpAccountsAPI from '@/api/smtpAccounts'
import HomePage from './index.vue'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('workspace loading', () => {
  it('loads system mailboxes and mail in parallel without fetching other mailbox types', async () => {
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
    vi.stubGlobal('WebSocket', class {
      static OPEN = 1
      close() {}
      send() {}
    })
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
    } finally {
      wrapper.unmount()
    }
  })
})
