import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ io: vi.fn(), bind: vi.fn(), unbind: vi.fn(), unauthorized: vi.fn() }))
vi.mock('socket.io-client', () => ({ io: mocks.io }))
vi.mock('@/services/api', () => ({ getApiBaseURL: () => '/mail-api/v1', handleSessionUnauthorized: mocks.unauthorized }))
vi.mock('./onlineSessionTransport', () => ({ bindOnlineSessionSocket: mocks.bind, unbindOnlineSessionSocket: mocks.unbind }))
import { registerRealtimeScope, setRealtimeIdentity, stopRealtime, subscribeRealtime } from './realtimeClient'

const cleanups: Array<() => void> = []
const settle = async () => { for (let i = 0; i < 15; i++) await Promise.resolve() }
let sockets: any[]
let response: any
const head = (seq = 0) => ({ 'user:1': { stream: 'stream-1', seq } })
const packet = (seq: number, payload: any = {}) => ({
  epoch: 'boot', scope: 'user:1', stream: 'stream-1', seq, event: 'mail_changed', payload,
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
  it('shares one live connection, and replaces it when authentication/capabilities change', async () => {
    const socket = await connect()
    setRealtimeIdentity('token', 1)
    cleanups.push(subscribeRealtime(['mail_changed'], vi.fn()))
    cleanups.push(subscribeRealtime(['account_state_changed'], vi.fn()))
    expect(mocks.io).toHaveBeenCalledTimes(1)
    cleanups.push(registerRealtimeScope('share', { share_token: 'secret' }))
    expect(socket.disconnect).toHaveBeenCalledOnce()
    expect(mocks.io).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({
      auth: expect.objectContaining({ token: 'token', share_token: 'secret', realtime_version: 1 }),
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
    cleanups.push(subscribeRealtime(['mail_changed'], refresh))
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
    const stop = subscribeRealtime(['mail_changed'], refresh)
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
    cleanups.push(subscribeRealtime(['mail_changed'], refresh))
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
    cleanups.push(subscribeRealtime(['mail_changed'], refresh))
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
})
