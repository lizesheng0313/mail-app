import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getShareInfo: vi.fn(),
  getShareEmails: vi.fn()
}))

vi.mock('@/api/mailboxShare', () => ({ mailboxShareAPI: api }))
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { token: 'public-share' } }) }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/i18n', () => ({ getCurrentLocale: () => 'zh-CN' }))
vi.mock('@/services/api', () => ({ isTauri: () => false, buildWebSocketURL: vi.fn() }))

import SharePage from './index.vue'

describe('share page loading', () => {
  let socket: any
  beforeEach(() => {
    vi.stubGlobal('WebSocket', class {
      static OPEN = 1
      readyState = 1
      constructor() { socket = this }
      close() {}
      send() {}
    })
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
  it('shows mailboxes while the slower email request is still pending', async () => {
    api.getShareInfo.mockResolvedValue({
      code: 0,
      data: {
        mailbox_type: 'external',
        expire_mode: 'permanent',
        mailboxes: [{ id: 1, email: 'shared@example.com' }]
      }
    })
    let resolveEmails!: (value: unknown) => void
    api.getShareEmails.mockReturnValue(new Promise(resolve => { resolveEmails = resolve }))

    const wrapper = mount(SharePage, {
      shallow: true,
      global: {
        stubs: {
          ThreeColumnLayout: {
            template: '<main><slot name="left" /><slot name="middle" /></main>'
          },
          MailboxList: {
            name: 'MailboxList',
            props: ['mailboxes'],
            template: '<div data-testid="mailboxes">{{ mailboxes[0]?.email }}</div>'
          }
        }
      }
    })

    try {
      await flushPromises()
      expect(api.getShareEmails).toHaveBeenCalledWith('public-share', expect.any(Object))
      expect(wrapper.get('[data-testid="mailboxes"]').text()).toBe('shared@example.com')
      expect(wrapper.getComponent({ name: 'EmailList' }).props('emptyText')).toBe('sharePage.loadingEmails')

      // 用户可以在初次邮件请求完成前选择邮箱，较旧的响应不能覆盖新列表。
      api.getShareEmails.mockResolvedValueOnce({
        code: 0, data: { emails: [{ id: 99 }], pagination: { total: 1 } }
      })
      wrapper.getComponent({ name: 'MailboxList' }).vm.$emit('select', { id: 1 })
      await flushPromises()
      expect(api.getShareEmails).toHaveBeenLastCalledWith('public-share', expect.objectContaining({ mailbox_id: 1 }))
      expect(wrapper.getComponent({ name: 'EmailList' }).props('emails')).toEqual([{ id: 99 }])

      resolveEmails({ code: 0, data: { emails: [{ id: 42 }], pagination: { total: 1 } } })
      await flushPromises()
      expect(wrapper.getComponent({ name: 'EmailList' }).props('emptyText')).toBe('mail.noEmails')
      expect(wrapper.getComponent({ name: 'EmailList' }).props('emails')).toEqual([{ id: 99 }])
    } finally {
      wrapper.unmount()
    }
  })
  it('uses push and reconnect catch-up for external shares without recurring list requests', async () => {
    vi.useFakeTimers()
    api.getShareInfo.mockResolvedValue({ code: 0, data: {
      mailbox_type: 'external', expire_mode: 'permanent', mailboxes: [{ id: 1, email: 'shared@example.com' }]
    } })
    api.getShareEmails.mockResolvedValue({ code: 0, data: { emails: [], pagination: { total: 0 } } })
    const wrapper = mount(SharePage, { shallow: true })
    try {
      await flushPromises()
      const initial = api.getShareEmails.mock.calls.length
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
      expect(api.getShareEmails).toHaveBeenCalledTimes(initial)
      socket.onmessage({ data: JSON.stringify({ type: 'ready' }) })
      await flushPromises()
      expect(api.getShareEmails).toHaveBeenCalledTimes(initial + 1)
      socket.onmessage({ data: JSON.stringify({ type: 'email.received', mailbox_type: 'external', mailbox_id: 1, email_id: 9 }) })
      await flushPromises()
      expect(api.getShareEmails).toHaveBeenCalledTimes(initial + 2)
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
      expect(api.getShareEmails).toHaveBeenCalledTimes(initial + 2)
    } finally { wrapper.unmount() }
  })

})
