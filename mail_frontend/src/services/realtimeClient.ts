import { io, type Socket } from 'socket.io-client'
import { getApiBaseURL, handleSessionUnauthorized } from '@/services/api'
import { bindOnlineSessionSocket, unbindOnlineSessionSocket } from './onlineSessionTransport'
import { createRealtimeRefresh } from './realtimeRefresh'

type Cursor = { stream: string; seq: number }
type Packet = Cursor & { epoch: string; scope: string; event: string; payload: any }
type Listener = (payload?: any, event?: string) => unknown | Promise<unknown>
type Scope = { share_token?: string; guest_mailboxes?: { id: number; claim_token?: string }[]; guest_chat_token?: string; login_state?: string }
let identity = { token: '', userId: 0 }
let socket: Socket | null = null
let signature = ''
let enabled = true
let epoch: string | null = null
let cursors: Record<string, Cursor> = {}
let syncRunning = false
let syncAgain = false
let needsSnapshot = true
let resumeQueued = false
let heartbeat: ReturnType<typeof setInterval> | undefined
let syncRetry: ReturnType<typeof setTimeout> | undefined
const scopes = new Map<string, Scope>()
const listeners = new Set<{ events: string[]; listener: Listener; invalidate: () => void; dispose: () => void }>()
const rawListeners = new Map<string, Set<Listener>>()

function dispatch(event: string, payload?: any) {
  for (const listener of listeners) {
    if (event === 'realtime_reset' || listener.events.includes(event)) {
      // Each listener owns its snapshot/retry queue, independent of other views.
      listener.listener(payload, event)
    }
  }
}

function receive(packet: Packet) {
  if (!packet || typeof packet.seq !== 'number') return
  if (epoch !== packet.epoch) { void sync(); return }
  const cursor = cursors[packet.scope]
  if (!cursor || cursor.stream !== packet.stream || packet.seq > cursor.seq + 1) {
    void sync(); return
  }
  if (packet.seq <= cursor.seq) return
  cursors[packet.scope] = { stream: packet.stream, seq: packet.seq }
  dispatch(packet.event, packet.payload)
}

async function sync() {
  const current = socket
  if (!current?.connected || syncRetry) return
  if (syncRunning) { syncAgain = true; return }
  syncRunning = true
  try {
    const result = await current.timeout(8000).emitWithAck('realtime_sync', { epoch, cursors: { ...cursors } })
    if (current !== socket) return
    if (result?.status === 401) handleSessionUnauthorized(result, identity.token)
    if (!result?.ok) {
      if (result?.status !== 401) scheduleSync(result?.retry_after_ms || 2000)
      return
    }
    if (result.reset || epoch !== result.epoch || needsSnapshot) {
      needsSnapshot = false
      epoch = result.epoch
      cursors = result.heads || {}
      dispatch('realtime_reset')
    } else {
      for (const packet of result.events || []) receive(packet)
      // Removed/expired capabilities must not remain subscribed locally.
      for (const scope of Object.keys(cursors)) if (!(scope in result.heads)) delete cursors[scope]
    }
  } catch {
    if (current === socket) scheduleSync(2000)
  } finally {
    syncRunning = false
    if (syncAgain) { syncAgain = false; void sync() }
  }
}

function scheduleSync(delay: number) {
  if (syncRetry || !socket?.connected) return
  syncRetry = setTimeout(() => { syncRetry = undefined; void sync() }, Math.min(30000, Math.max(1000, delay)))
}

function disconnect() {
  if (syncRetry) clearTimeout(syncRetry)
  syncRetry = undefined
  if (heartbeat) clearInterval(heartbeat)
  heartbeat = undefined
  if (socket) {
    unbindOnlineSessionSocket(socket)
    socket.removeAllListeners()
    socket.disconnect()
  }
  socket = null
}

function connect() {
  if (!enabled) return
  const auth = Object.assign({ realtime_version: 1, token: identity.token }, ...scopes.values())
  const nextSignature = JSON.stringify(auth)
  if (socket && signature === nextSignature) return
  disconnect()
  signature = nextSignature
  epoch = null
  cursors = {}
  const base = getApiBaseURL()
  const server = /^https?:\/\//.test(base) ? base.replace(/\/mail-api\/v1\/?$/, '') : window.location.origin
  const current = io(server, {
    path: '/mail-api/v1/live-chat/socket.io', transports: ['websocket'], auth,
    withCredentials: true, reconnection: true, reconnectionAttempts: Infinity,
    reconnectionDelay: 1000, reconnectionDelayMax: 30000, randomizationFactor: 0.5, timeout: 8000,
  })
  socket = current
  current.on('connect', () => {
    if (syncRetry) clearTimeout(syncRetry)
    syncRetry = undefined
    needsSnapshot = true
    if (identity.userId && identity.token) bindOnlineSessionSocket(current, identity.userId, identity.token)
    void sync()
    for (const listener of rawListeners.get('connect') || []) listener()
  })
  current.on('disconnect', (reason: string) => {
    unbindOnlineSessionSocket(current)
    if (reason === 'io server disconnect' && identity.token) {
      handleSessionUnauthorized({ detail: '会话已失效' }, identity.token)
    }
    for (const listener of rawListeners.get('disconnect') || []) listener()
  })
  current.on('connect_error', () => {
    for (const listener of rawListeners.get('disconnect') || []) listener()
  })
  current.on('realtime_event', receive)
  // Only chat content keeps its legacy wire event. Other changes use replay.
  current.on('chat_event', payload => {
    for (const listener of rawListeners.get('chat_event') || []) listener(payload)
  })
  heartbeat = setInterval(() => { void sync() }, 20000)
}

export function setRealtimeIdentity(token: string, userId: number) {
  enabled = true
  identity = { token, userId }
  connect()
}

export function registerRealtimeScope(key: string, scope: Scope) {
  scopes.set(key, scope)
  connect()
  return () => { if (scopes.delete(key)) connect() }
}

export function onRealtimeEvent(event: string, listener: Listener) {
  if (!rawListeners.has(event)) rawListeners.set(event, new Set())
  rawListeners.get(event)!.add(listener)
  if (event === 'connect' && socket?.connected) listener()
  return () => { rawListeners.get(event)?.delete(listener) }
}

export function emitRealtime(event: string, payload: unknown): boolean {
  if (!socket?.connected) return false
  socket.emit(event, payload)
  return true
}

/** Snapshot callbacks must throw or return false on failure; retries are bounded in rate. */
export function subscribeRealtime(events: string[], refresh: Listener,
  filter?: (payload: any, event: string) => boolean, options: { immediate?: boolean } = {}) {
  let payload: any
  let event = 'realtime_reset'
  let pending = false
  const queue = createRealtimeRefresh(async () => {
    const nextPayload = payload
    const nextEvent = event
    pending = false
    try {
      const result = await refresh(nextPayload, nextEvent)
      if (result !== false) return result
    } catch {
      // Multiple invalidations or a failed partial update require a snapshot;
      // retaining only the latest payload could silently lose another change.
    }
    pending = true
    payload = undefined
    event = 'realtime_reset'
    return false
  })
  const entry = {
    events,
    listener(nextPayload: any, nextEvent = '') {
      if (filter && nextEvent !== 'realtime_reset' && !filter(nextPayload, nextEvent)) return
      payload = pending ? undefined : nextPayload
      event = pending ? 'realtime_reset' : nextEvent
      pending = true
      queue.invalidate()
    },
    invalidate: queue.invalidate,
    dispose: queue.dispose,
  }
  listeners.add(entry)
  if (options.immediate) entry.listener(undefined, 'realtime_reset')
  return () => { listeners.delete(entry); queue.dispose() }
}

export function refreshRealtimeViews() {
  if (document.hidden || resumeQueued) return
  resumeQueued = true
  queueMicrotask(() => {
    resumeQueued = false
    if (!document.hidden) { dispatch('realtime_reset'); void sync() }
  })
}

window.addEventListener('focus', refreshRealtimeViews)
window.addEventListener('online', refreshRealtimeViews)
document.addEventListener('visibilitychange', refreshRealtimeViews)

export function stopRealtime() {
  enabled = false
  disconnect()
  signature = ''
  epoch = null
  cursors = {}
}
