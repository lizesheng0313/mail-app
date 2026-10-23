import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getShareInfo: vi.fn(),
  getShareEmails: vi.fn(),
  getShareEmailDetail: vi.fn(),
}))

vi.mock('@/api/mailboxShare', () => ({ mailboxShareAPI: api }))
const state = vi.hoisted(() => ({ route: null as any }))
vi.mock('vue-router', () => ({ useRoute: () => state.route }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/i18n', () => ({ getCurrentLocale: () => 'zh-CN' }))
vi.mock('@/services/api', () => ({ isTauri: () => false }))
vi.mock('@/utils/message', () => ({ showMessage: vi.fn() }))
const realtime = vi.hoisted(() => ({
  refresh: null as any, filter: null as any, scope: vi.fn(),
  unsubscribeMail: vi.fn(), unsubscribeScope: vi.fn(),
}))
vi.mock('@/services/realtimeClient', () => ({
  registerRealtimeScope: (key: string, auth: unknown) => { realtime.scope(key, auth); return realtime.unsubscribeScope },
  subscribeRealtime: (_events: string[], refresh: unknown, filter: unknown) => {
    realtime.refresh = refresh; realtime.filter = filter; return realtime.unsubscribeMail
  },
}))

import SharePage from './index.vue'

const info = { code: 0, data: {
  mailbox_type: 'external', expire_mode: 'permanent', mailboxes: [{ id: 1, email: 'shared@example.com' }],
} }
const emailList = { code: 0, data: { emails: [{ id: 99 }], pagination: { total: 1 } } }
const mounted: ReturnType<typeof mount>[] = []
const openPage = () => {
  const wrapper = mount(SharePage, { shallow: true, global: { stubs: {
    ThreeColumnLayout: { template: '<main><slot name="left" /><slot name="middle" /><slot name="right" /></main>' },
  } } })
  mounted.push(wrapper)
  return wrapper
}

describe('share page loading', () => {
  beforeEach(() => {
    state.route = reactive({ params: { token: 'public-share' } })
    api.getShareInfo.mockReset().mockResolvedValue(info)
    api.getShareEmails.mockReset().mockResolvedValue(emailList)
    api.getShareEmailDetail.mockReset()
    realtime.refresh = null
    realtime.scope.mockClear()
    realtime.unsubscribeMail.mockClear()
    realtime.unsubscribeScope.mockClear()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    mounted.splice(0).forEach(wrapper => wrapper.unmount())
    vi.restoreAllMocks()
    vi.useRealTimers()
  })
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
  it('updates shared mail on push without idle polling and filters unrelated mailboxes', async () => {
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
      expect(realtime.scope).toHaveBeenCalledWith('share-mail', { share_token: 'public-share' })
      expect(realtime.filter({ mailbox_type: 'system', mailbox_id: 1 })).toBe(false)
      expect(realtime.filter({ mailbox_type: 'external', mailbox_id: 1 })).toBe(true)
      await realtime.refresh()
      await flushPromises()
      expect(api.getShareEmails).toHaveBeenCalledTimes(initial + 1)
      await (wrapper.vm as any).$.setupState.loadEmails()
      await flushPromises()
      expect(api.getShareEmails).toHaveBeenCalledTimes(initial + 2)
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
      expect(api.getShareEmails).toHaveBeenCalledTimes(initial + 2)
    } finally { wrapper.unmount() }
  })

  it('recovers an initial temporary failure and stops querying after recovery', async () => {
    vi.useFakeTimers()
    api.getShareInfo.mockRejectedValueOnce({ response: { status: 503 } })
    const wrapper = openPage()
    await flushPromises()
    expect(wrapper.text()).toContain('sharePage.loadFailed')
    await vi.advanceTimersByTimeAsync(1000)
    await flushPromises()
    expect(wrapper.getComponent({ name: 'EmailList' }).props('emails')).toEqual([{ id: 99 }])
    expect(wrapper.text()).not.toContain('sharePage.loadFailed')
    expect(api.getShareInfo).toHaveBeenCalledTimes(2)
    const emailCalls = api.getShareEmails.mock.calls.length
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(3600000)
    expect(api.getShareInfo).toHaveBeenCalledTimes(2)
    expect(api.getShareEmails).toHaveBeenCalledTimes(emailCalls)
  })

  it('recovers immediately when the network returns after an initial failure', async () => {
    vi.useFakeTimers()
    api.getShareInfo.mockRejectedValueOnce(new Error('offline'))
    openPage()
    await flushPromises()
    window.dispatchEvent(new Event('online'))
    await flushPromises()
    expect(api.getShareInfo).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(3600000)
    expect(api.getShareInfo).toHaveBeenCalledTimes(2)
  })

  it('retries the first failed email list without repeatedly loading mailbox metadata', async () => {
    vi.useFakeTimers()
    api.getShareEmails.mockRejectedValueOnce(new Error('offline'))
    const wrapper = openPage()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1000)
    expect(api.getShareInfo).toHaveBeenCalledTimes(1)
    expect(api.getShareEmails).toHaveBeenCalledTimes(2)
    expect(wrapper.getComponent({ name: 'EmailList' }).props('emails')).toEqual([{ id: 99 }])
  })

  it.each([404, 410])('does not retry a revoked or expired link on initial load (%s)', async status => {
    vi.useFakeTimers()
    api.getShareInfo.mockRejectedValue({ response: { status } })
    openPage()
    await flushPromises()
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(3600000)
    expect(api.getShareInfo).toHaveBeenCalledTimes(1)
    expect(api.getShareEmails).not.toHaveBeenCalled()
    expect(realtime.scope).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([404, 410])('clears stale mail and stops live updates once access ends (%s)', async status => {
    vi.useFakeTimers()
    const wrapper = openPage()
    await flushPromises()
    const page = (wrapper.vm as any).$.setupState
    let finishDetail!: (value: unknown) => void
    api.getShareEmailDetail.mockReturnValue(new Promise(resolve => { finishDetail = resolve }))
    void page.handleSelectEmail({ id: 99 })
    api.getShareEmails.mockRejectedValueOnce({ response: { status } })
    await realtime.refresh()
    await flushPromises()
    finishDetail({ code: 0, data: { content: 'stale secret' } })
    await flushPromises()
    expect(page.emails).toEqual([])
    expect(page.selectedEmail).toBeNull()
    expect(page.modalEmail).toBeNull()
    expect(realtime.unsubscribeMail).toHaveBeenCalledTimes(1)
    expect(realtime.unsubscribeScope).toHaveBeenCalledTimes(1)
    await realtime.refresh()
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(3600000)
    expect(api.getShareEmails).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('cancels failed-request retries on unmount', async () => {
    vi.useFakeTimers()
    api.getShareInfo.mockRejectedValue(new Error('offline'))
    const wrapper = openPage()
    await flushPromises()
    mounted.splice(mounted.indexOf(wrapper), 1)
    wrapper.unmount()
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(3600000)
    expect(api.getShareInfo).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('ignores metadata from an earlier visit even after returning to the same link', async () => {
    let finish!: (value: unknown) => void
    api.getShareInfo.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const wrapper = openPage()
    await flushPromises()
    state.route.params.token = 'other-share'
    await flushPromises()
    state.route.params.token = 'public-share'
    await flushPromises()
    finish({ code: 0, data: { ...info.data, mailboxes: [{ id: 8, email: 'stale@example.com' }] } })
    await flushPromises()
    expect(wrapper.getComponent({ name: 'MailboxList' }).props('mailboxes')).toEqual(info.data.mailboxes)
    expect(api.getShareEmails).toHaveBeenCalledTimes(2)
  })

  it('does not subscribe or load email after a pending initial request resolves on an unmounted page', async () => {
    let finish!: (value: unknown) => void
    api.getShareInfo.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const wrapper = openPage()
    mounted.splice(mounted.indexOf(wrapper), 1)
    wrapper.unmount()
    finish(info)
    await flushPromises()
    expect(api.getShareEmails).not.toHaveBeenCalled()
    expect(realtime.scope).not.toHaveBeenCalled()
  })
})
