import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Socket } from 'socket.io-client'

const mocks = vi.hoisted(() => ({
  route: {} as any,
  userStore: {} as any,
  handleSessionUnauthorized: vi.fn(),
  leaveOnlineSession: vi.fn(),
  sendLeaveBeacon: vi.fn(),
}))

vi.mock('vue-router', () => ({ useRoute: () => mocks.route }))
vi.mock('@/stores/user', () => ({ useUserStore: () => mocks.userStore }))
vi.mock('@/api/monitoring', () => ({ monitoringAPI: mocks }))
vi.mock('@/services/api', () => ({ handleSessionUnauthorized: mocks.handleSessionUnauthorized }))
vi.mock('@/services/sessionIdentity', () => ({
  getBrowserInstanceId: () => 'browser-id',
  getTabSessionId: () => 'tab-id',
  getClientPlatform: () => 'web',
  getDeviceType: () => 'desktop',
}))

import { useOnlineSession } from './useOnlineSession'
import { bindOnlineSessionSocket, unbindOnlineSessionSocket } from '@/services/onlineSessionTransport'

const Harness = defineComponent({
  setup() {
    useOnlineSession()
    return () => null
  },
})

describe('online session heartbeat transport', () => {
  let wrapper: ReturnType<typeof mount> | null = null
  let socket: any

  beforeEach(() => {
    vi.useFakeTimers()
    mocks.route = reactive({ fullPath: '/user/mailboxes/system', path: '/user/mailboxes/system' })
    mocks.userStore = reactive({ isAuthenticated: true, user: { id: 1 }, logout: vi.fn() })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.handleSessionUnauthorized.mockReset()
    mocks.leaveOnlineSession.mockReset().mockResolvedValue({})
    mocks.sendLeaveBeacon.mockReset().mockReturnValue(true)
    socket = {
      connected: true,
      timeout: vi.fn().mockReturnThis(),
      emitWithAck: vi.fn().mockResolvedValue({ ok: true }),
    }
  })

  afterEach(() => {
    expect(console.error).not.toHaveBeenCalled()
    wrapper?.unmount()
    wrapper = null
    unbindOnlineSessionSocket(socket)
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('uses the existing socket for enter, periodic heartbeats and route changes without HTTP', async () => {
    bindOnlineSessionSocket(socket, 1)
    wrapper = mount(Harness)
    await flushPromises()
    expect(socket.emitWithAck).toHaveBeenCalledWith('online_session_heartbeat', expect.objectContaining({
      session_id: 'tab-id', browser_instance_id: 'browser-id', user_id: 1, client_platform: 'web',
    }))
    socket.emitWithAck.mockClear()

    await vi.advanceTimersByTimeAsync(90000)
    expect(socket.emitWithAck).toHaveBeenCalledTimes(3)
    mocks.route.fullPath = '/user/domains?page=2'
    await flushPromises()
    expect(socket.emitWithAck).toHaveBeenLastCalledWith('online_session_heartbeat', expect.objectContaining({
      page_path: '/user/domains?page=2',
    }))
    expect(mocks.leaveOnlineSession).not.toHaveBeenCalled()
    expect(mocks.sendLeaveBeacon).not.toHaveBeenCalled()
  })

  it('waits for the shared socket and sends immediately when it connects', async () => {
    wrapper = mount(Harness)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(30000)
    expect(socket.emitWithAck).not.toHaveBeenCalled()
    expect(mocks.leaveOnlineSession).not.toHaveBeenCalled()

    bindOnlineSessionSocket(socket, 1)
    await flushPromises()
    expect(socket.emitWithAck).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(60000)
    expect(socket.emitWithAck).toHaveBeenCalledTimes(3)
    expect(mocks.sendLeaveBeacon).not.toHaveBeenCalled()
  })

  it('waits while disconnected and sends immediately on reconnect', async () => {
    bindOnlineSessionSocket(socket, 1)
    wrapper = mount(Harness)
    await flushPromises()
    socket.emitWithAck.mockClear()
    socket.connected = false
    await vi.advanceTimersByTimeAsync(90000)
    expect(socket.emitWithAck).not.toHaveBeenCalled()
    expect(mocks.leaveOnlineSession).not.toHaveBeenCalled()

    socket.connected = true
    bindOnlineSessionSocket(socket, 1)
    await flushPromises()
    expect(socket.emitWithAck).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(30000)
    expect(socket.emitWithAck).toHaveBeenCalledTimes(2)
  })

  it.each(['rejected', 'timeout'])('retries on the next socket heartbeat when acknowledgement is %s', async (failure) => {
    bindOnlineSessionSocket(socket, 1)
    wrapper = mount(Harness)
    await flushPromises()
    if (failure === 'rejected') socket.emitWithAck.mockResolvedValue({ ok: false })
    else socket.emitWithAck.mockRejectedValue(new Error('operation has timed out'))

    await vi.advanceTimersByTimeAsync(30000)
    expect(socket.emitWithAck).toHaveBeenCalledTimes(2)
    expect(mocks.leaveOnlineSession).not.toHaveBeenCalled()
    expect(socket.timeout).toHaveBeenLastCalledWith(5000)
    socket.emitWithAck.mockResolvedValue({ ok: true })
    await vi.advanceTimersByTimeAsync(30000)
    expect(socket.emitWithAck).toHaveBeenCalledTimes(3)
  })

  it('does not send the new accounts heartbeat through the previous accounts socket', async () => {
    bindOnlineSessionSocket(socket, 2)
    wrapper = mount(Harness)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(30000)
    expect(socket.emitWithAck).not.toHaveBeenCalled()
    expect(mocks.leaveOnlineSession).not.toHaveBeenCalled()
    bindOnlineSessionSocket(socket, 1)
    await flushPromises()
    expect(socket.emitWithAck).toHaveBeenCalledWith('online_session_heartbeat', expect.objectContaining({ user_id: 1 }))
  })

  it('coalesces reconnect, visibility and timer updates while a heartbeat is pending', async () => {
    bindOnlineSessionSocket(socket, 1)
    wrapper = mount(Harness)
    await flushPromises()
    let acknowledge!: (value: any) => void
    socket.emitWithAck.mockClear().mockReturnValue(new Promise(resolve => { acknowledge = resolve }))

    bindOnlineSessionSocket(socket, 1)
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(60000)
    expect(socket.emitWithAck).toHaveBeenCalledTimes(1)
    acknowledge({ ok: true })
    await flushPromises()
    expect(mocks.leaveOnlineSession).not.toHaveBeenCalled()
  })

  it('does not revive a logged out session when a pending socket heartbeat fails', async () => {
    bindOnlineSessionSocket(socket, 1)
    wrapper = mount(Harness)
    await flushPromises()
    let acknowledge!: (value: any) => void
    socket.emitWithAck.mockReturnValue(new Promise(resolve => { acknowledge = resolve }))
    await vi.advanceTimersByTimeAsync(30000)

    mocks.userStore.isAuthenticated = false
    await flushPromises()
    acknowledge({ ok: false })
    await flushPromises()
    expect(mocks.leaveOnlineSession).toHaveBeenCalledTimes(1)
    const sent = socket.emitWithAck.mock.calls.length
    await vi.advanceTimersByTimeAsync(60000)
    expect(socket.emitWithAck).toHaveBeenCalledTimes(sent)
  })

  it('sends a single leave beacon on unload and restores heartbeat after a cached page returns', async () => {
    bindOnlineSessionSocket(socket, 1)
    wrapper = mount(Harness)
    await flushPromises()
    socket.emitWithAck.mockClear()

    window.dispatchEvent(new Event('beforeunload'))
    window.dispatchEvent(new Event('pagehide'))
    await vi.advanceTimersByTimeAsync(60000)
    expect(mocks.sendLeaveBeacon).toHaveBeenCalledTimes(1)
    expect(socket.emitWithAck).not.toHaveBeenCalled()

    window.dispatchEvent(new Event('pageshow'))
    await flushPromises()
    expect(socket.emitWithAck).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(30000)
    expect(socket.emitWithAck).toHaveBeenCalledTimes(2)
  })

  it('does not enter a stale account when logout interrupts an account switch', async () => {
    bindOnlineSessionSocket(socket, 1)
    wrapper = mount(Harness)
    await flushPromises()
    let acknowledge!: (value: any) => void
    socket.emitWithAck.mockReturnValue(new Promise(resolve => { acknowledge = resolve }))
    await vi.advanceTimersByTimeAsync(30000)

    mocks.userStore.user.id = 2
    await flushPromises()
    mocks.userStore.isAuthenticated = false
    await flushPromises()
    acknowledge({ ok: false })
    await flushPromises()
    expect(socket.emitWithAck.mock.calls.every(([, payload]) => payload.user_id === 1)).toBe(true)
    const sent = socket.emitWithAck.mock.calls.length
    await vi.advanceTimersByTimeAsync(60000)
    expect(socket.emitWithAck).toHaveBeenCalledTimes(sent)
  })

  it('keeps heartbeats running if navigation is cancelled before pagehide', async () => {
    bindOnlineSessionSocket(socket, 1)
    wrapper = mount(Harness)
    await flushPromises()
    socket.emitWithAck.mockClear()
    window.dispatchEvent(new Event('beforeunload'))
    await vi.advanceTimersByTimeAsync(30000)
    expect(socket.emitWithAck).toHaveBeenCalledTimes(1)
    expect(mocks.sendLeaveBeacon).not.toHaveBeenCalled()
  })

  it('keeps retrying after an initial socket failure and stops on unmount', async () => {
    socket.emitWithAck.mockRejectedValueOnce(new Error('offline'))
    bindOnlineSessionSocket(socket, 1)
    wrapper = mount(Harness)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(30000)
    expect(socket.emitWithAck).toHaveBeenCalledTimes(2)
    wrapper.unmount()
    wrapper = null

    bindOnlineSessionSocket(socket, 1)
    await vi.advanceTimersByTimeAsync(60000)
    expect(socket.emitWithAck).toHaveBeenCalledTimes(2)
  })

  it('does not let cleanup from an old socket unregister its replacement', async () => {
    const oldSocket = { connected: false } as Socket
    bindOnlineSessionSocket(oldSocket, 1)
    bindOnlineSessionSocket(socket, 1)
    unbindOnlineSessionSocket(oldSocket)
    wrapper = mount(Harness)
    await flushPromises()
    expect(socket.emitWithAck).toHaveBeenCalledTimes(1)
    expect(mocks.leaveOnlineSession).not.toHaveBeenCalled()
  })

  it('handles login revocation through the socket using the token bound to that connection', async () => {
    bindOnlineSessionSocket(socket, 1, 'old-login-token')
    wrapper = mount(Harness)
    await flushPromises()
    localStorage.setItem('token', 'new-login-token')
    const failure = { ok: false, status: 401, detail: { error_code: 'SESSION_REPLACED' } }
    socket.emitWithAck.mockResolvedValue(failure)
    await vi.advanceTimersByTimeAsync(30000)
    expect(mocks.handleSessionUnauthorized).toHaveBeenCalledWith(failure, 'old-login-token')
    expect(mocks.leaveOnlineSession).not.toHaveBeenCalled()
  })
})
