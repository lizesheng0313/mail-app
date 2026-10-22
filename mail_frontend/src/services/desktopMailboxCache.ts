import { batchLoginAPI } from '@/api/batchLogin'
import mailboxProxyApi from '@/api/mailboxProxy'
import { getServerUrl } from './api'
import { subscribeRealtime } from './realtimeClient'

export type MailboxChange = { resource?: 'accounts' | 'proxy' | 'oauth'; mailbox_id?: number }
type Listener = (change: MailboxChange) => void
const listeners = new Set<Listener>()
let identity = ''
let revision = 0
let accounts: any[] | undefined
let loading: Promise<any[]> | undefined
let unsubscribe: (() => void) | undefined
const proxies = new Map<number, { value: any; expires: number }>()
const proxyLoads = new Map<number, Promise<any>>()

export const subscribeDesktopMailboxChanges = (listener: Listener) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function invalidateDesktopMailboxes(change: MailboxChange = {}) {
  revision++
  // Detach in-flight reads; their old revision cannot repopulate the cache.
  loading = undefined
  if (change.resource !== 'proxy') accounts = undefined
  if (change.mailbox_id) {
    proxies.delete(Number(change.mailbox_id))
    proxyLoads.delete(Number(change.mailbox_id))
  } else {
    proxies.clear()
    proxyLoads.clear()
  }
  for (const listener of listeners) listener(change)
}

const onLocalChange = (event: Event) => {
  const detail = (event as CustomEvent).detail || {}
  invalidateDesktopMailboxes({ resource: detail.resource, mailbox_id: Number(detail.mailboxId) || undefined })
}
const onStatusChange = (event: Event) => {
  const detail = (event as CustomEvent).detail
  const account = accounts?.find(account => Number(account.id) === detail?.mailboxId)
  if (account) Object.assign(account, { status: detail.status, error_message: detail.error_message })
}

export function stopDesktopMailboxCache() {
  unsubscribe?.()
  unsubscribe = undefined
  window.removeEventListener('external-mailboxes-changed', onLocalChange)
  window.removeEventListener('external-mailbox-updated', onLocalChange)
  window.removeEventListener('external-mailbox-status', onStatusChange)
  identity = ''
  revision++
  accounts = undefined
  loading = undefined
  proxies.clear()
  proxyLoads.clear()
}

export function startDesktopMailboxCache() {
  const next = `${getServerUrl()}|${localStorage.getItem('token') || ''}`
  if (identity === next) return
  stopDesktopMailboxCache()
  identity = next
  window.addEventListener('external-mailboxes-changed', onLocalChange)
  window.addEventListener('external-mailbox-updated', onLocalChange)
  window.addEventListener('external-mailbox-status', onStatusChange)
  unsubscribe = subscribeRealtime(['mailbox_config_changed'], (payload, event) => {
    invalidateDesktopMailboxes(event === 'realtime_reset' ? {} : payload || {})
  })
}

export function getDesktopMailboxAccounts(): Promise<any[]> {
  const token = localStorage.getItem('token')
  if (!token) return Promise.reject(new Error('登录状态已变化'))
  startDesktopMailboxCache()
  if (accounts) return Promise.resolve(accounts)
  if (loading) return loading
  const version = revision
  const promise: Promise<any> = (async () => {
    const response: any = await batchLoginAPI.getAllAccounts(100, { suppressErrorMessage: true, timeout: 15000 })
    if (token !== localStorage.getItem('token')) throw new Error('登录状态已变化')
    if (version !== revision) return getDesktopMailboxAccounts()
    if (response.code !== 0) throw new Error(response.message || '获取邮箱账号失败')
    accounts = Array.isArray(response.data) ? response.data : response.data?.accounts || []
    return accounts!
  })()
  loading = promise
  void promise.finally(() => { if (loading === promise) loading = undefined }).catch(() => {})
  return promise
}

export function invalidateDesktopRuntimeProxy(id: number) {
  proxies.delete(id)
  proxyLoads.delete(id)
}

export function getDesktopRuntimeProxy(id: number): Promise<any> {
  const token = localStorage.getItem('token')
  if (!token) return Promise.reject(new Error('登录状态已变化'))
  startDesktopMailboxCache()
  const cached = proxies.get(id)
  if (cached && Date.now() < cached.expires) return Promise.resolve(cached.value)
  const pending = proxyLoads.get(id)
  if (pending) return pending
  const version = revision
  let promise!: Promise<any>
  promise = (async () => {
    const response: any = await mailboxProxyApi.getRuntimeProxy(id)
    if (token !== localStorage.getItem('token')) throw new Error('登录状态已变化')
    if (version !== revision || proxyLoads.get(id) !== promise) return getDesktopRuntimeProxy(id)
    if (response.code !== 0) throw new Error(response.message || '获取代理配置失败')
    const value = response.data?.runtime_proxy || null
    // New servers identify expiring API proxies; older servers get a bounded fallback.
    const expires = value ? Number(value.expires_at || 0) || (value.expires_at === null ? Infinity : Date.now() + 300000) : Infinity
    proxies.set(id, { value, expires })
    return value
  })()
  proxyLoads.set(id, promise)
  void promise.finally(() => { if (proxyLoads.get(id) === promise) proxyLoads.delete(id) }).catch(() => {})
  return promise
}
