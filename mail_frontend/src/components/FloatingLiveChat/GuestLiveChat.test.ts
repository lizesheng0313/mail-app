import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
const realtime = vi.hoisted(() => ({ handlers: {} as Record<string, () => void>, disconnect: vi.fn(), io: vi.fn() }))
vi.mock('socket.io-client', () => ({ io: realtime.io }))
vi.mock('@/services/api', () => ({
  default: api,
  getApiBaseURL: () => "/mail-api/v1",
  extractApiErrorMessage: (_payload: unknown, fallback: string) => fallback,
}))

import GuestLiveChat from './GuestLiveChat.vue'

describe('visitor support chat', () => {
  beforeEach(() => {
    localStorage.clear()
    realtime.handlers = {}
    realtime.io.mockImplementation(() => ({
      on: (event: string, callback: () => void) => { realtime.handlers[event] = callback },
      removeAllListeners: vi.fn(), disconnect: realtime.disconnect
    }))
    api.get.mockReset().mockResolvedValue({ code: 0, data: { items: [] } })
    api.post.mockReset().mockResolvedValue({ code: 0, data: { item: { id: 1 } } })
  })

  afterEach(() => { vi.useRealTimers() })

  it('lets a visitor send without login and keeps the same browser token', async () => {
    const wrapper = mount(GuestLiveChat)
    await wrapper.get('button[aria-label="打开在线客服"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('在线客服')
    expect(wrapper.text()).not.toContain('无需登录，直接发送消息')
    await wrapper.get('textarea').setValue('请问邮箱怎么用？')
    await wrapper.get('[data-testid="guest-chat-send"]').trigger('click')
    await flushPromises()

    const token = localStorage.getItem('live_chat_guest_token_v1') || ''
    expect(token).toMatch(/^[0-9a-f]{64}$/)
    expect(localStorage.getItem('guest_visitor_id_v1')).toBe(token)
    expect(api.post).toHaveBeenCalledWith(
      '/live-chat/guest/messages',
      { content: '请问邮箱怎么用？' },
      expect.objectContaining({
        skipAuth: true,
        headers: { 'X-Guest-Chat-Token': token },
      }),
    )
    wrapper.unmount()

    const reopened = mount(GuestLiveChat)
    await reopened.get('button[aria-label="打开在线客服"]').trigger('click')
    await flushPromises()
    expect(api.get).toHaveBeenCalledWith(
      '/live-chat/guest/messages',
      expect.objectContaining({ headers: { 'X-Guest-Chat-Token': token } }),
    )
    reopened.unmount()
  })

  it('uses separate conversations for separate browser visitor IDs', async () => {
    const first = mount(GuestLiveChat)
    await first.get('button[aria-label="打开在线客服"]').trigger('click')
    await flushPromises()
    await first.get('textarea').setValue('第一位游客')
    await first.get('[data-testid="guest-chat-send"]').trigger('click')
    await flushPromises()
    const firstId = localStorage.getItem('guest_visitor_id_v1')
    first.unmount()

    localStorage.clear()
    const second = mount(GuestLiveChat)
    await second.get('button[aria-label="打开在线客服"]').trigger('click')
    await flushPromises()
    await second.get('textarea').setValue('第二位游客')
    await second.get('[data-testid="guest-chat-send"]').trigger('click')
    await flushPromises()
    const secondId = localStorage.getItem('guest_visitor_id_v1')
    expect(secondId).not.toBe(firstId)
    expect(api.post.mock.calls[0][2].headers['X-Guest-Chat-Token']).toBe(firstId)
    expect(api.post.mock.calls[1][2].headers['X-Guest-Chat-Token']).toBe(secondId)
    second.unmount()
  })
  it('does not poll while open, and receives replies through the visitor socket', async () => {
    vi.useFakeTimers()
    const wrapper = mount(GuestLiveChat)
    try {
      await wrapper.get('button[aria-label="打开在线客服"]').trigger('click')
      await flushPromises()
      const count = api.get.mock.calls.length
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
      expect(api.get).toHaveBeenCalledTimes(count)
      const visitor = localStorage.getItem('live_chat_guest_token_v1')
      expect(realtime.io).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({
        auth: { guest_chat_token: visitor }, transports: ['websocket']
      }))
      api.get.mockResolvedValue({ code: 0, data: { items: [{ id: 2, sender_type: 'admin', content: '客服回复' }] } })
      realtime.handlers.guest_chat_changed()
      await flushPromises()
      expect(api.get).toHaveBeenCalledTimes(count + 1)
      expect(wrapper.text()).toContain('客服回复')
      realtime.handlers.connect()
      await flushPromises()
      expect(api.get).toHaveBeenCalledTimes(count + 2)
      await wrapper.get('button[aria-label="关闭在线客服"]').trigger('click')
      realtime.handlers.guest_chat_changed()
      await flushPromises()
      expect(api.get).toHaveBeenCalledTimes(count + 2)
    } finally { wrapper.unmount() }
    expect(realtime.disconnect).toHaveBeenCalled()
  })

})
