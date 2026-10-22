import { invokeDesktopMailboxFetch, onMailboxCollected } from '@/services/mailboxCollection'
import { batchLoginAPI } from '@/api/batchLogin'
import { getDesktopMailboxAccounts, getDesktopRuntimeProxy, invalidateDesktopRuntimeProxy, startDesktopMailboxCache, subscribeDesktopMailboxChanges, type MailboxChange } from './desktopMailboxCache'
import { getServerUrl, isTauri } from '@/services/api'
import { getDesktopOAuthAccessToken, runDesktopOAuthMailboxAction } from '@/services/desktopOAuthMailbox'

type ExternalAccount = {
  id: number
  email: string
  password?: string
  protocol?: string
  auth_type?: string
  imap_host?: string
  imap_port?: number
  pop3_host?: string
  pop3_port?: number
  status?: string
  relay_fetch_enabled?: boolean
}

type WatchEvent = { mailboxId: number; generation: number; status: string }
type Watch = { fingerprint: string; generation?: number; connecting: boolean; retry?: number; failures: number }

const POP3_INTERVAL_MS = 5 * 60 * 1000
const IMAP_RETRY_MS = 30 * 1000
const IMAP_MAX_RETRY_MS = 15 * 60 * 1000
const MAX_IDLE_WATCHES = 20
const MAX_FETCH_CONCURRENCY = 3
const RELAY_FOREGROUND_INTERVAL_MS = 8000
const RELAY_FOREGROUND_WINDOW_MS = 10 * 60 * 1000

/** POP3 has no IDLE. IMAP servers without IDLE (or above the local connection cap) use fallback checks. */
export const mailboxSyncMode = (account: ExternalAccount, idleSlotsAvailable: boolean) => {
  if (account.relay_fetch_enabled) return 'relay'
  if (account.auth_type === 'oauth2' || account.protocol?.toLowerCase() === 'imap') {
    return idleSlotsAvailable && account.imap_host ? 'idle' : 'interval'
  }
  return 'interval'
}

class DesktopExternalMailSync {
  private running = false
  private accounts = new Map<number, ExternalAccount>()
  private watches = new Map<number, Watch>()
  private fallback = new Set<number>()
  private fetching = new Map<number, number>()
  private pendingFetch = new Set<number>()
  private activeFetches = 0
  private fetchWaiters: Array<() => void> = []
  private interval?: number
  private nextChecks = new Map<number, number>()
  private lastChecks = new Map<number, number>()
  private relayForegroundId = 0
  private relayForegroundUntil = 0
  private unlisten?: () => void
  private invoke?: <T>(command: string, args?: Record<string, unknown>) => Promise<T>
  private refreshing = false
  private refreshAgain = false
  private userId = 0
  private sessionVersion = 0
  private unsubscribeCache?: () => void
  private unsubscribeCollection?: () => void
  private retries = new Map<number, number>()
  private failures = new Map<number, number>()

  async start(userId: number) {
    if (!isTauri() || !userId || !localStorage.getItem('token')) return
    if (this.running && this.userId === userId) return
    await this.stop()
    this.running = true
    this.userId = userId
    startDesktopMailboxCache()
    const version = ++this.sessionVersion
    const [{ invoke }, { listen }] = await Promise.all([
      import('@tauri-apps/api/core'),
      import('@tauri-apps/api/event')
    ])
    if (!this.running || this.sessionVersion !== version) return
    this.invoke = invoke
    const unlisten = await listen<WatchEvent>('desktop-imap-watch', (event) => {
      void this.handleWatchEvent(event.payload)
    })
    if (!this.running || this.sessionVersion !== version) {
      unlisten()
      return
    }
    this.unlisten = unlisten
    this.unsubscribeCache = subscribeDesktopMailboxChanges(this.onAccountsChanged)
    this.unsubscribeCollection = onMailboxCollected((id, token) => {
      if (!this.running || token !== localStorage.getItem('token') || !this.fallback.has(id)) return
      this.lastChecks.set(id, Date.now())
      this.nextChecks.set(id, Date.now() + this.checkInterval(id))
      this.scheduleChecks()
    })
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    await this.refreshAccounts()
    await this.checkFallbackAccounts()
  }

  async stop() {
    this.sessionVersion++
    this.running = false
    this.userId = 0
    if (this.interval !== undefined) window.clearTimeout(this.interval)
    this.interval = undefined
    this.nextChecks.clear()
    this.lastChecks.clear()
    this.relayForegroundId = 0
    this.relayForegroundUntil = 0
    this.unsubscribeCache?.()
    this.unsubscribeCache = undefined
    this.unsubscribeCollection?.()
    this.unsubscribeCollection = undefined
    for (const timer of this.retries.values()) window.clearTimeout(timer)
    this.retries.clear()
    this.failures.clear()
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    this.unlisten?.()
    this.unlisten = undefined
    for (const watch of this.watches.values()) {
      if (watch.retry !== undefined) window.clearTimeout(watch.retry)
    }
    this.watches.clear()
    this.accounts.clear()
    this.fallback.clear()
    this.pendingFetch.clear()
    this.fetching.clear()
    this.refreshAgain = false
    // Stop server connections even when the page is closed mid-fetch.
    const invoke = this.invoke
    this.invoke = undefined
    await invoke?.('stop_all_imap_watches').catch(() => {})
  }

  private onAccountsChanged = (change: MailboxChange) => {
    for (const id of this.fallback) {
      if (!change.mailbox_id || change.mailbox_id === id) this.nextChecks.set(id, Date.now())
    }
    for (const id of this.retries.keys()) {
      if (!change.mailbox_id || change.mailbox_id === id) this.clearFetchRetry(id)
    }
    for (const id of this.watches.keys()) {
      if (!change.mailbox_id || change.mailbox_id === id) this.removeWatch(id)
    }
    void this.refreshAccounts().then(() => this.checkFallbackAccounts())
  }
  private onVisibilityChange = () => {
    if (!document.hidden && this.running) {
      void this.refreshAccounts().then(() => this.catchUpAll())
    }
  }

  /** The view supplies demand; only this service schedules collection. */
  setRelayForeground(mailboxId: number, restart = false) {
    const previous = this.relayForegroundId
    if (previous === mailboxId && !restart) return
    this.relayForegroundId = mailboxId
    this.relayForegroundUntil = mailboxId ? Date.now() + RELAY_FOREGROUND_WINDOW_MS : 0
    if (previous && this.fallback.has(previous)) {
      this.nextChecks.set(previous, (this.lastChecks.get(previous) || Date.now()) + POP3_INTERVAL_MS)
    }
    if (mailboxId && this.fallback.has(mailboxId)) {
      this.nextChecks.set(mailboxId, this.lastChecks.has(mailboxId)
        ? this.lastChecks.get(mailboxId)! + RELAY_FOREGROUND_INTERVAL_MS : Date.now())
    }
    this.scheduleChecks()
  }

  private checkInterval(id: number) {
    return id === this.relayForegroundId && Date.now() < this.relayForegroundUntil
      && this.accounts.get(id)?.relay_fetch_enabled
      ? RELAY_FOREGROUND_INTERVAL_MS : POP3_INTERVAL_MS
  }

  private scheduleChecks() {
    if (this.interval !== undefined) window.clearTimeout(this.interval)
    this.interval = undefined
    if (!this.running) return
    const due = [...this.nextChecks.entries()]
      .filter(([id]) => this.fallback.has(id) && !this.fetching.has(id) && !this.retries.has(id))
      .map(([, at]) => at)
    if (!due.length) return
    this.interval = window.setTimeout(() => {
      this.interval = undefined
      void this.refreshAccounts().then(() => this.checkFallbackAccounts())
    }, Math.max(0, Math.min(...due) - Date.now()))
  }

  async refreshAccounts() {
    if (!this.running || this.refreshing) {
      this.refreshAgain = this.running
      return
    }
    this.refreshing = true
    const version = this.sessionVersion
    try {
      const result = await getDesktopMailboxAccounts()
      if (!this.running || this.sessionVersion !== version) return
      const list: ExternalAccount[] = result
        .filter((account: ExternalAccount) => Number(account.id) > 0 && account.status === 'active')
        .map((account: ExternalAccount) => ({ ...account, id: Number(account.id) }))
      const next = new Map(list.map((account) => [Number(account.id), account]))
      for (const id of this.accounts.keys()) {
        if (!next.has(id)) this.removeAccount(id)
      }
      this.accounts = next
      let idleSlots = MAX_IDLE_WATCHES
      for (const account of list) {
        const mode = mailboxSyncMode(account, idleSlots > 0)
        if (mode === 'idle') idleSlots--
        if (mode !== 'idle') {
          if (this.watches.has(account.id)) this.removeWatch(account.id)
          this.fallback.add(account.id)
          if (!this.nextChecks.has(account.id)) this.nextChecks.set(account.id, Date.now())
          continue
        }
        const fingerprint = [account.email, account.imap_host, account.imap_port,
          account.auth_type, account.password].join('|')
        const old = this.watches.get(account.id)
        if (old?.fingerprint === fingerprint) continue
        this.removeWatch(account.id)
        this.fallback.delete(account.id)
        this.nextChecks.delete(account.id)
        const watch: Watch = { fingerprint, connecting: false, failures: 0 }
        this.watches.set(account.id, watch)
        void this.startWatch(account, watch)
      }
    } catch (error) {
      console.warn('加载桌面邮箱自动收取账号失败:', error)
    } finally {
      this.refreshing = false
      if (this.refreshAgain) {
        this.refreshAgain = false
        void this.refreshAccounts()
      }
    }
  }

  private removeWatch(id: number) {
    const watch = this.watches.get(id)
    if (watch?.retry !== undefined) window.clearTimeout(watch.retry)
    this.watches.delete(id)
    void this.invoke?.('stop_imap_watch', { mailboxId: id }).catch(() => {})
  }

  private removeAccount(id: number) {
    const retry = this.retries.get(id)
    if (retry !== undefined) window.clearTimeout(retry)
    this.retries.delete(id)
    this.failures.delete(id)
    this.removeWatch(id)
    this.fallback.delete(id)
    this.nextChecks.delete(id)
    this.lastChecks.delete(id)
    this.pendingFetch.delete(id)
  }

  private async proxy(id: number) {
    return getDesktopRuntimeProxy(id)
  }

  private async startWatch(account: ExternalAccount, watch: Watch) {
    if (!this.running || watch.connecting || this.watches.get(account.id) !== watch) return
    const version = this.sessionVersion
    watch.connecting = true
    try {
      const oauth = account.auth_type === 'oauth2'
        ? await getDesktopOAuthAccessToken(account.id)
        : null
      const proxy = await this.proxy(account.id)
      if (!this.running || this.sessionVersion !== version || this.watches.get(account.id) !== watch) return
      const generation = await this.invoke?.<number>('start_imap_watch', {
        mailboxId: account.id,
        email: oauth?.email || account.email,
        password: oauth ? '' : account.password || '',
        host: oauth?.imap_host || account.imap_host,
        port: oauth?.imap_port || account.imap_port || 993,
        accessToken: oauth?.access_token || null,
        proxy
      })
      if (this.sessionVersion === version && this.watches.get(account.id) === watch) watch.generation = generation
      else void this.invoke?.('stop_imap_watch', { mailboxId: account.id, generation })
    } catch (error) {
      console.warn(`IMAP IDLE 启动失败，邮箱 ${account.id}:`, error)
      this.retryWatch(account, watch)
    } finally {
      watch.connecting = false
    }
  }

  private retryWatch(account: ExternalAccount, watch: Watch) {
    if (!this.running || this.watches.get(account.id) !== watch) return
    if (watch.retry !== undefined) window.clearTimeout(watch.retry)
    const delay = Math.min(IMAP_RETRY_MS * 2 ** Math.min(watch.failures++, 5), IMAP_MAX_RETRY_MS)
    watch.retry = window.setTimeout(() => {
      watch.retry = undefined
      void this.startWatch(account, watch)
    }, delay)
  }

  private async handleWatchEvent(event: WatchEvent) {
    const watch = this.watches.get(event.mailboxId)
    const account = this.accounts.get(event.mailboxId)
    if (!this.running || !watch || !account ||
      (watch.generation !== undefined && watch.generation !== event.generation)) return
    if (event.status === 'ready' || event.status === 'changed') {
      if (event.status === 'ready') watch.failures = 0
      // READY also repairs messages missed while the desktop app was closed.
      await this.fetchAccount(account)
    } else if (event.status === 'unsupported') {
      this.removeWatch(account.id)
      this.fallback.add(account.id)
      void this.fetchAccount(account)
    } else if (event.status === 'disconnected') {
      this.retryWatch(account, watch)
    }
  }

  private async checkFallbackAccounts() {
    const version = this.sessionVersion
    if (this.relayForegroundId && Date.now() >= this.relayForegroundUntil) this.setRelayForeground(0)
    const ids = [...this.fallback].filter(id => (this.nextChecks.get(id) || 0) <= Date.now())
    // A bounded batch avoids opening hundreds of POP3 connections at once.
    for (let offset = 0; offset < ids.length && this.running && this.sessionVersion === version; offset += 2) {
      await Promise.all(ids.slice(offset, offset + 2).map((id) => {
        const account = this.accounts.get(id)
        return account && !this.retries.has(id) ? this.fetchAccount(account) : Promise.resolve()
      }))
    }
    this.scheduleChecks()
  }

  private async catchUpAll() {
    const version = this.sessionVersion
    const accounts = [...this.accounts.values()]
    for (let offset = 0; offset < accounts.length && this.running && this.sessionVersion === version; offset += 2) {
      await Promise.all(accounts.slice(offset, offset + 2).map((account) => this.fetchAccount(account)))
    }
  }

  private async acquireFetchSlot(): Promise<() => void> {
    if (this.activeFetches < MAX_FETCH_CONCURRENCY) {
      this.activeFetches++
    } else {
      await new Promise<void>((resolve) => this.fetchWaiters.push(resolve))
    }
    return () => {
      const next = this.fetchWaiters.shift()
      if (next) next()
      else this.activeFetches--
    }
  }

  private async fetchAccount(account: ExternalAccount) {
    const id = Number(account.id)
    const version = this.sessionVersion
    if (this.retries.has(id)) return
    if (!this.running || (!this.invoke && !account.relay_fetch_enabled) || this.fetching.has(id)) {
      if (this.fetching.has(id)) this.pendingFetch.add(id)
      return
    }
    const token = localStorage.getItem('token') || ''
    if (!token) return
    this.fetching.set(id, version)
    const releaseSlot = await this.acquireFetchSlot()
    try {
      if (!this.running || this.sessionVersion !== version || !localStorage.getItem('token')) return
      // A queued collection may outlive an account deletion or configuration edit.
      const current = this.accounts.get(id)
      if (!current) return
      account = current
      if (account.relay_fetch_enabled) {
        const response: any = await batchLoginAPI.fetchExternalMailboxOnline(id, {
          suppressErrorMessage: true
        })
        if (response.code !== 0) throw new Error(response.message || '线路收取失败')
        const newCount = Number(response.data?.new_email_count || 0)
        if (this.running && this.sessionVersion === version && newCount > 0) {
          window.dispatchEvent(new CustomEvent('external-mailbox-synced', {
            detail: { mailboxId: id, newCount }
          }))
        }
        if (this.sessionVersion === version) this.clearFetchRetry(id)
        return
      }
      const proxy = await this.proxy(id)
      if (!this.running || this.sessionVersion !== version) return
      const shared = {
        mailboxId: id,
        token,
        serverUrl: getServerUrl(),
        proxy
      }
      let result: any
      if (account.auth_type === 'oauth2') {
        result = await runDesktopOAuthMailboxAction(id, (oauth) => {
          if (!this.running || this.sessionVersion !== version) throw new Error('自动收取已停止')
          return invokeDesktopMailboxFetch(this.invoke!, {
            ...shared,
            email: oauth.email,
            password: '',
            protocol: 'imap',
            host: oauth.imap_host,
            port: oauth.imap_port,
            authType: 'oauth2',
            accessToken: oauth.access_token
          })
        })
      } else {
        const imap = account.protocol?.toLowerCase() === 'imap'
        result = await invokeDesktopMailboxFetch(this.invoke!, {
          ...shared,
          email: account.email,
          password: account.password || '',
          protocol: imap ? 'imap' : 'pop3',
          host: (imap ? account.imap_host : account.pop3_host) || null,
          port: (imap ? account.imap_port : account.pop3_port) || null
        })
      }
      if (this.running && this.sessionVersion === version && Number(result?.count || 0) > 0) {
        window.dispatchEvent(new CustomEvent('external-mailbox-synced', {
          detail: { mailboxId: id, newCount: Number(result.count) }
        }))
      }
      if (this.sessionVersion === version) this.clearFetchRetry(id)
      // A single IDLE event can cover more than the native batch limit. Drain
      // the persisted cursor before waiting for a new notification.
      if (this.running && this.sessionVersion === version && result?.has_more === true) {
        this.pendingFetch.add(id)
      }
    } catch (error) {
      console.warn(`桌面邮箱 ${id} 自动收取失败，稍后重试:`, error)
      const message = String((error as any)?.message || error)
      if (!message.includes('同步') && (error as any)?.failure_kind === 'network') invalidateDesktopRuntimeProxy(id)
      if ((error as any)?.failure_kind !== 'auth' && this.running && this.sessionVersion === version && !this.retries.has(id)) {
        const failures = (this.failures.get(id) || 0) + 1
        this.failures.set(id, failures)
        const timer = window.setTimeout(() => {
          this.retries.delete(id)
          const current = this.accounts.get(id)
          if (current && this.running) void this.fetchAccount(current)
        }, Math.min(5000 * 2 ** Math.min(failures - 1, 6), POP3_INTERVAL_MS))
        this.retries.set(id, timer)
      }
    } finally {
      releaseSlot()
      if (this.fetching.get(id) === version) this.fetching.delete(id)
      if (this.running && this.sessionVersion === version && this.fallback.has(id)) {
        this.lastChecks.set(id, Date.now())
        this.nextChecks.set(id, Date.now() + this.checkInterval(id))
        this.scheduleChecks()
      }
      if (this.sessionVersion === version && this.pendingFetch.delete(id) && this.running) {
        const latest = this.accounts.get(id)
        if (latest && !this.retries.has(id)) void this.fetchAccount(latest)
      }
    }
  }

  private clearFetchRetry(id: number) {
    this.failures.delete(id)
    const retry = this.retries.get(id)
    if (retry !== undefined) window.clearTimeout(retry)
    this.retries.delete(id)
  }
}

export const desktopExternalMailSync = new DesktopExternalMailSync()
