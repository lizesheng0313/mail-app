import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getAccounts: vi.fn(), refresh: null as any, unsubscribe: vi.fn() }))
vi.mock('vue-i18n', async (original) => ({
  ...await original<typeof import('vue-i18n')>(),
  useI18n: () => ({ t: (key: string) => key })
}))
vi.mock('@/api/batchLogin', () => ({ batchLoginAPI: { getAccounts: mocks.getAccounts } }))
vi.mock('@/api/mailboxTags', () => ({ mailboxTagsAPI: { getBatchMailboxTags: vi.fn().mockResolvedValue({ data: {} }) } }))
vi.mock('@/services/realtimeClient', () => ({
  subscribeRealtime: (_events: string[], refresh: unknown) => {
    mocks.refresh = refresh
    return mocks.unsubscribe
  }
}))
import ExternalMailboxList from './MailboxList.vue'

const response = (id: number, email: string) => ({ code: 0, data: {
  accounts: [{ id, email, status: 'active', protocol: 'pop3' }],
  pagination: { page: 1, total_pages: 1, total: 1 }
} })
const open = () => mount(ExternalMailboxList, {
  global: { stubs: { MailboxTags: true, Pagination: true, ConfirmDialog: true } }
})
afterEach(() => { vi.restoreAllMocks(); mocks.getAccounts.mockReset(); mocks.unsubscribe.mockReset() })

describe('external mailbox configuration delivery', () => {
  it('shares concurrent reads of the same page and emits metadata from that response', async () => {
    let finish!: (value: unknown) => void
    mocks.getAccounts.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
    const wrapper = open()
    try {
      const first = (wrapper.vm as any).loadAccounts()
      const second = (wrapper.vm as any).loadAccounts()
      expect(mocks.getAccounts).toHaveBeenCalledTimes(1)
      finish(response(1, 'shared@example.test'))
      await Promise.all([first, second])
      expect(wrapper.emitted('accounts-loaded')).toHaveLength(1)
      expect(wrapper.text()).toContain('shared@example.test')
    } finally { wrapper.unmount() }
  })
  it('renders a manual reload and keeps existing rows on failure without a socket subscription', async () => {
    mocks.getAccounts.mockResolvedValueOnce(response(1, 'first@example.test'))
    const wrapper = open()
    try {
      await (wrapper.vm as any).loadAccounts()
      expect(wrapper.text()).toContain('first@example.test')
      const invalidations = vi.fn()
      window.addEventListener('external-mailboxes-changed', invalidations)
      try {
        mocks.getAccounts.mockResolvedValueOnce(response(2, 'second@example.test'))
        await (wrapper.vm as any).loadAccounts(1, true)
        await flushPromises()
        expect(wrapper.text()).toContain('second@example.test')
        expect(wrapper.text()).not.toContain('first@example.test')
        expect(invalidations).not.toHaveBeenCalled()
        vi.spyOn(console, 'error').mockImplementation(() => {})
        mocks.getAccounts.mockRejectedValueOnce(new Error('temporary query failure'))
        expect(await (wrapper.vm as any).loadAccounts(1, true)).toBe(false)
        expect(wrapper.text()).toContain('second@example.test')
      } finally {
        window.removeEventListener('external-mailboxes-changed', invalidations)
      }
    } finally {
      wrapper.unmount()
    }
    expect(mocks.unsubscribe).not.toHaveBeenCalled()
  })

  it('does not overwrite a newer manual reload with an older pending query', async () => {
    let finish!: (value: unknown) => void
    mocks.getAccounts.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
    const wrapper = open()
    try {
      const older = (wrapper.vm as any).loadAccounts()
      mocks.getAccounts.mockResolvedValueOnce(response(2, 'newer@example.test'))
      await (wrapper.vm as any).loadAccounts(1, true)
      finish(response(1, 'older@example.test'))
      await older
      await flushPromises()
      expect(wrapper.text()).toContain('newer@example.test')
      expect(wrapper.text()).not.toContain('older@example.test')
    } finally {
      wrapper.unmount()
    }
  })
})
