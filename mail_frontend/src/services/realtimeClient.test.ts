import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ io: vi.fn(), bind: vi.fn(), unbind: vi.fn(), unauthorized: vi.fn() }))
vi.mock('socket.io-client', () => ({ io: mocks.io }))
vi.mock('@/services/api', () => ({ getApiBaseURL: () => '/mail-api/v1', handleSessionUnauthorized: mocks.unauthorized }))
import { registerRealtimeScope, setRealtimeIdentity, stopRealtime, subscribeRealtime } from './realtimeClient'

const cleanups: Array<() => void> = []
const settle = async () => { for (let i = 0; i < 15; i++) await Promise.resolve() }
let sockets: any[]
let response: any
const head = (seq = 0) => ({ 'user:1': { stream: 'stream-1', seq } })
const packet = (seq: number, payload: any = {}) => ({
  epoch: 'boot', scope: 'user:1', stream: 'stream-1', seq, event: 'chat_state_changed', payload,
})

beforeEach(() => {
  stopRealtime()
  vi.useFakeTimers()
  mocks.io.mockReset()
  sockets = []
  response = { ok: true, epoch: 'boot', reset: true, heads: head(), events: [] }
  mocks.io.mockImplementation(() => {
    const handlers: Record<string, (...args: any[]) => void> = {}
    const next: any = {
      connected: false, handlers,
      on: (event: string, callback: any) => { handlers[event] = callback },
      timeout: () => next,
      emitWithAck: vi.fn(async () => response), emit: vi.fn(),
      removeAllListeners: vi.fn(() => Object.keys(handlers).forEach(key => delete handlers[key])),
      disconnect: vi.fn(() => { next.connected = false }),
    }
    sockets.push(next)
    return next
  })
})
afterEach(() => { cleanups.splice(0).forEach(stop => stop()); stopRealtime(); vi.useRealTimers() })

async function connect() {
  setRealtimeIdentity('token', 1)
  const socket = sockets[sockets.length - 1]
  socket.connected = true
  socket.handlers.connect()
  await settle()
  response = { ...response, reset: false }
  return socket
}

describe('shared application realtime transport', () => {
  it('keeps unrelated business events out of the transport, including on reconnect', async () => {
    const refresh = vi.fn()
    cleanups.push(subscribeRealtime(['payment_changed', 'mailbox_config_changed', 'presence_changed', 'login_changed', 'external_mail_fetch_event', 'email_reach_event'], refresh, undefined, { immediate: true }))
    const socket = await connect()
    socket.handlers.realtime_event({ ...packet(1), event: 'mail_changed' })
    socket.handlers.connect()
    await settle()
    expect(refresh).not.toHaveBeenCalled()
  })


  it('refreshes new mail immediately, deduplicates replay, and catches up after reconnect', async () => {
    const refresh = vi.fn()
    cleanups.push(subscribeRealtime(['mail_changed'], refresh))
    const socket = await connect()
    refresh.mockClear()
    const delivery = { ...packet(1), event: 'mail_changed', payload: { type: 'email.received', mailbox_type: 'system', mailbox_id: 7, email_id: 99 } }
    socket.handlers.realtime_event(delivery)
    socket.handlers.realtime_event(delivery)
    await settle()
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(refresh).toHaveBeenLastCalledWith(delivery.payload, 'mail_changed')
    socket.handlers.connect()
    await settle()
    expect(refresh).toHaveBeenCalledTimes(2)
    expect(refresh).toHaveBeenLastCalledWith(undefined, 'realtime_reset')
    const count = refresh.mock.calls.length
    await vi.advanceTimersByTimeAsync(60000)
    expect(refresh).toHaveBeenCalledTimes(count)
  })

  it('does not reset views or check cursors when switching windows', async () => {
    const refresh = vi.fn()
    cleanups.push(subscribeRealtime(['chat_state_changed'], refresh))
    const socket = await connect()
    refresh.mockClear()
    socket.emitWithAck.mockClear()
    for (let i = 0; i < 5; i++) {
      window.dispatchEvent(new Event('focus'))
      document.dispatchEvent(new Event('visibilitychange'))
      await settle()
    }
    expect(refresh).not.toHaveBeenCalled()
    expect(socket.emitWithAck).not.toHaveBeenCalled()
    expect(socket.disconnect).not.toHaveBeenCalled()
  })
  it('shares one live connection, and replaces it when authentication/capabilities change', async () => {
    const socket = await connect()
    setRealtimeIdentity('token', 1)
    cleanups.push(subscribeRealtime(['chat_state_changed'], vi.fn()))
    cleanups.push(subscribeRealtime(['account_state_changed'], vi.fn()))
    expect(mocks.io).toHaveBeenCalledTimes(1)
    cleanups.push(registerRealtimeScope('guest', { guest_chat_token: 'a'.repeat(64) }))
    expect(socket.disconnect).toHaveBeenCalledOnce()
    expect(mocks.io).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({
      auth: expect.objectContaining({ token: 'token', guest_chat_token: 'a'.repeat(64), realtime_version: 1 }),
    }))
    const old = sockets[sockets.length - 1]
    setRealtimeIdentity('', 0)
    expect(old.disconnect).toHaveBeenCalledOnce()
    expect(mocks.io).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({
      auth: expect.objectContaining({ token: '' }),
    }))
  })

  it('deduplicates notifications and replays gaps through the socket without idle list polling', async () => {
    const refresh = vi.fn()
    cleanups.push(subscribeRealtime(['chat_state_changed'], refresh))
    const socket = await connect()
    expect(refresh).toHaveBeenCalledTimes(1) // authoritative initial snapshot
    socket.handlers.realtime_event(packet(1, { id: 1 }))
    socket.handlers.realtime_event(packet(1, { id: 1 }))
    await settle()
    expect(refresh).toHaveBeenCalledTimes(2)
    response = { ok: true, epoch: 'boot', reset: false, heads: head(3), events: [packet(2), packet(3)] }
    socket.handlers.realtime_event(packet(3))
    await settle()
    expect(socket.emitWithAck).toHaveBeenLastCalledWith('realtime_sync', expect.objectContaining({
      cursors: { 'user:1': { stream: 'stream-1', seq: 1 } },
    }))
    const count = refresh.mock.calls.length
    response = { ...response, events: [] }
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
    expect(refresh).toHaveBeenCalledTimes(count)
    socket.handlers.connect() // reconnect always checks authoritative state
    await settle()
    expect(refresh).toHaveBeenCalledTimes(count + 1)
  })

  it('retries failed snapshots without losing dirty state and cancels retries on unsubscribe', async () => {
    const refresh = vi.fn().mockResolvedValueOnce(false).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(true)
    const stop = subscribeRealtime(['chat_state_changed'], refresh)
    cleanups.push(stop)
    const socket = await connect()
    expect(refresh).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1400)
    expect(refresh).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(2400)
    expect(refresh).toHaveBeenCalledTimes(3)
    refresh.mockResolvedValue(false)
    socket.handlers.realtime_event(packet(1))
    await settle()
    expect(refresh).toHaveBeenCalledTimes(4)
    stop()
    await vi.advanceTimersByTimeAsync(60000)
    expect(refresh).toHaveBeenCalledTimes(4)
  })

  it('requests a snapshot after a server restart and does not dispatch stale epochs', async () => {
    const refresh = vi.fn()
    cleanups.push(subscribeRealtime(['chat_state_changed'], refresh))
    const socket = await connect()
    response = { ok: true, epoch: 'new-boot', reset: true, heads: head(0), events: [] }
    socket.handlers.realtime_event({ ...packet(9), epoch: 'new-boot' })
    await settle()
    expect(refresh).toHaveBeenCalledTimes(2)
    response = { ...response, reset: false }
    socket.handlers.realtime_event({ ...packet(1), epoch: 'new-boot' })
    await settle()
    expect(refresh).toHaveBeenCalledTimes(3)
  })

  it('coalesces different changes into a snapshot and respects retry backoff under a flood', async () => {
    let finish!: (result?: unknown) => void
    const refresh = vi.fn(() => new Promise(resolve => { finish = resolve }))
    cleanups.push(subscribeRealtime(['chat_state_changed'], refresh))
    const socket = await connect()
    finish(true)
    await settle()
    socket.handlers.realtime_event(packet(1, { mailbox_type: 'system' }))
    socket.handlers.realtime_event(packet(2, { mailbox_type: 'hosted' }))
    socket.handlers.realtime_event(packet(3, { mailbox_type: 'external' }))
    finish(true)
    await settle()
    expect(refresh).toHaveBeenLastCalledWith(undefined, 'realtime_reset')
    finish(false)
    await settle()
    const count = refresh.mock.calls.length
    for (let seq = 4; seq < 40; seq++) socket.handlers.realtime_event(packet(seq))
    await settle()
    expect(refresh).toHaveBeenCalledTimes(count)
    await vi.advanceTimersByTimeAsync(1400)
    expect(refresh).toHaveBeenCalledTimes(count + 1)
    finish(true)
    await settle()
  })

  it('backs off cursor synchronization and clears authenticated state on server revocation', async () => {
    mocks.unauthorized.mockClear()
    const socket = await connect()
    response = { ok: false, retry_after_ms: 1000 }
    socket.handlers.realtime_event(packet(3))
    await settle()
    const calls = socket.emitWithAck.mock.calls.length
    for (let i = 0; i < 30; i++) socket.handlers.realtime_event(packet(3))
    await settle()
    expect(socket.emitWithAck).toHaveBeenCalledTimes(calls)
    response = { ok: true, epoch: 'boot', reset: false, heads: head(3), events: [packet(1), packet(2), packet(3)] }
    await vi.advanceTimersByTimeAsync(1000)
    expect(socket.emitWithAck).toHaveBeenCalledTimes(calls + 1)
    socket.handlers.disconnect('io server disconnect')
    expect(mocks.unauthorized).toHaveBeenCalledWith({ detail: '会话已失效' }, 'token')
  })

  it('replaces a stale connected transport immediately when the browser comes online', async () => {
    const old = await connect()
    window.dispatchEvent(new Event('online'))
    await settle()
    expect(old.disconnect).toHaveBeenCalledOnce()
    expect(mocks.io).toHaveBeenCalledTimes(2)
    const next = sockets[sockets.length - 1]
    next.connected = true
    next.handlers.connect()
    await settle()
    expect(next.emitWithAck).toHaveBeenCalledOnce()
  })

  it('does not let an outstanding acknowledgement delay or overwrite a new connection', async () => {
    const refresh = vi.fn()
    cleanups.push(subscribeRealtime(['chat_state_changed'], refresh))
    const old = await connect()
    let finish!: (result: any) => void
    old.emitWithAck.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    old.handlers.realtime_event(packet(3))
    cleanups.push(registerRealtimeScope('new-capability', { guest_chat_token: 'b'.repeat(64) }))
    const next = sockets[sockets.length - 1]
    next.connected = true
    next.handlers.connect()
    await settle()
    expect(next.emitWithAck).toHaveBeenCalledOnce()
    const count = refresh.mock.calls.length
    finish({ ok: true, epoch: 'obsolete', reset: true, heads: head(99), events: [] })
    await settle()
    expect(refresh).toHaveBeenCalledTimes(count)
    next.handlers.realtime_event(packet(1))
    await settle()
    expect(refresh).toHaveBeenCalledTimes(count + 1)
  })
})
