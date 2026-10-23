import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ user: null as any }))
const api = vi.hoisted(() => ({ pending: vi.fn(), acknowledge: vi.fn() }))
const realtime = vi.hoisted(() => ({
  refresh: null as any,
  filter: null as any,
  unsubscribe: vi.fn(),
}))
vi.mock('@/stores/user', () => ({ useUserStore: () => state.user }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/api/notification', () => ({
  getPendingImportantNotifications: api.pending,
  acknowledgeImportantNotification: api.acknowledge,
}))
vi.mock('@/services/realtimeClient', () => ({
  subscribeRealtime: (_events: string[], refresh: unknown, filter: unknown) => {
    realtime.refresh = refresh
    realtime.filter = filter
    return realtime.unsubscribe
  },
}))
import ImportantNotificationCenter from './index.vue'

const notice = { id: 9, notification_type: 'announcement', title: '新公告', content: '发布后出现' }
const result = (items: unknown[] = []) => ({ code: 0, data: { items } })
let wrapper: ReturnType<typeof mount>
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
  vi.spyOn(Math, 'random').mockReturnValue(0)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  state.user = reactive({ isAuthenticated: true, user: { id: 7 } })
  localStorage.setItem('token', 'test-token')
  api.pending.mockReset().mockResolvedValue(result())
  api.acknowledge.mockReset().mockResolvedValue({ code: 0 })
  realtime.unsubscribe.mockClear()
})
afterEach(() => { wrapper?.unmount(); vi.restoreAllMocks(); vi.useRealTimers() })
const open = () => {
  wrapper = mount(ImportantNotificationCenter, { global: { stubs: { teleport: true } } })
  return flushPromises()
}

describe('important notifications', () => {
  it('discovers notices published after login through existing account push events', async () => {
    await open()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    api.pending.mockResolvedValue(result([notice]))
    expect(realtime.filter({ resource: 'announcements' })).toBe(true)
    expect(realtime.filter({ resource: 'notifications' })).toBe(true)
    expect(realtime.filter({ resource: 'outbox' })).toBe(false)
    realtime.refresh()
    await flushPromises()
    expect(wrapper.get('[role="dialog"]').text()).toContain('新公告')
  })

  it('does not periodically query when healthy', async () => {
    await open()
    await vi.advanceTimersByTimeAsync(3600000)
    window.dispatchEvent(new Event('online'))
    await flushPromises()
    expect(api.pending).toHaveBeenCalledTimes(1)
  })

  it('retries only failed requests and stops retrying after success', async () => {
    api.pending.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ code: 1 })
      .mockResolvedValue(result([notice]))
    await open()
    await vi.advanceTimersByTimeAsync(1000)
    expect(api.pending).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(2000)
    expect(wrapper.get('[role="dialog"]').text()).toContain('新公告')
    await vi.advanceTimersByTimeAsync(3600000)
    expect(api.pending).toHaveBeenCalledTimes(3)
  })

  it('does not resurrect an acknowledged notice from an older pending response', async () => {
    api.pending.mockResolvedValueOnce(result([notice]))
    await open()
    let finish!: (value: unknown) => void
    api.pending.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    realtime.refresh()
    await flushPromises()
    await wrapper.get('button').trigger('click')
    await flushPromises()
    finish(result([notice]))
    await flushPromises()
    expect(api.acknowledge).toHaveBeenCalledWith(9, expect.any(Object))
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('excludes a notice while its acknowledgement is still in progress', async () => {
    api.pending.mockResolvedValue(result([notice]))
    let finish!: (value: unknown) => void
    api.acknowledge.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    await open()
    await wrapper.get('button').trigger('click')
    realtime.refresh()
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    api.pending.mockResolvedValue(result())
    finish({ code: 0 })
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('ignores a previous account response after switching accounts', async () => {
    let finish!: (value: unknown) => void
    api.pending.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    await open()
    state.user.user.id = 8
    await flushPromises()
    finish(result([notice]))
    await flushPromises()
    expect(api.pending).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('preserves the current notice when the same account profile is refreshed', async () => {
    api.pending.mockResolvedValue(result([notice]))
    await open()
    state.user.user = { id: 7 }
    await flushPromises()
    expect(api.pending).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[role="dialog"]').text()).toContain('新公告')
  })

  it('removes subscriptions and failed-request timers on unmount', async () => {
    api.pending.mockRejectedValue(new Error('offline'))
    await open()
    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(3600000)
    expect(api.pending).toHaveBeenCalledTimes(1)
    expect(realtime.unsubscribe).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })
})
