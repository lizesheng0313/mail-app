import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ accounts: vi.fn(), proxy: vi.fn(), token: vi.fn(), refresh: vi.fn(), realtime: null as any }))
vi.mock('@/api/batchLogin', () => ({ batchLoginAPI: { getAllAccounts: mocks.accounts, getOAuth2AccessToken: mocks.token, refreshOAuth2Token: mocks.refresh } }))
vi.mock('@/api/mailboxProxy', () => ({ default: { getRuntimeProxy: mocks.proxy } }))
vi.mock('./api', () => ({ getServerUrl: () => 'https://api.test/v1' }))
vi.mock('./realtimeClient', () => ({ subscribeRealtime: (_events: any, listener: any) => { mocks.realtime = listener; return () => {} } }))

import { getDesktopMailboxAccounts, getDesktopRuntimeProxy, invalidateDesktopMailboxes, stopDesktopMailboxCache } from './desktopMailboxCache'
import { clearDesktopOAuthTokens, forceRefreshDesktopOAuthAccessToken, getDesktopOAuthAccessToken, runDesktopOAuthMailboxAction } from './desktopOAuthMailbox'
import { dispatchMailboxStatus } from './mailboxChanges'

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  stopDesktopMailboxCache()
  clearDesktopOAuthTokens()
  localStorage.setItem('token', 'session-a')
  mocks.accounts.mockResolvedValue({ code: 0, data: { accounts: [{ id: 1 }] } })
  mocks.proxy.mockResolvedValue({ code: 0, data: { runtime_proxy: null } })
  mocks.token.mockImplementation(async () => ({ code: 0, data: { access_token: 'access', email: 'a@test', imap_host: 'imap.test', imap_port: 993, expires_at: Date.now() + 3600000, refresh_before_at: Date.now() + 3300000, should_cache: true } }))
  mocks.refresh.mockResolvedValue({ code: 0 })
})
afterEach(() => { stopDesktopMailboxCache(); clearDesktopOAuthTokens(); localStorage.clear(); vi.useRealTimers() })

describe('shared desktop configuration cache', () => {
  it('applies collection status locally without clearing accounts, proxies or tokens', async () => {
    await getDesktopMailboxAccounts()
    await getDesktopRuntimeProxy(1)
    await getDesktopOAuthAccessToken(1)
    dispatchMailboxStatus(1, 'failed', 'auth failed')
    expect((await getDesktopMailboxAccounts())[0]).toMatchObject({ status: 'failed', error_message: 'auth failed' })
    await getDesktopRuntimeProxy(1)
    await getDesktopOAuthAccessToken(1)
    expect(mocks.accounts).toHaveBeenCalledTimes(1)
    expect(mocks.proxy).toHaveBeenCalledTimes(1)
    expect(mocks.token).toHaveBeenCalledTimes(1)
  })
  it('performs and deduplicates forced renewal behind an ordinary token read', async () => {
    let resolve!: (response: any) => void
    mocks.token.mockImplementationOnce(() => new Promise(done => { resolve = done }))
    const ordinary = getDesktopOAuthAccessToken(1)
    const first = forceRefreshDesktopOAuthAccessToken(1)
    const second = forceRefreshDesktopOAuthAccessToken(1)
    resolve({ code: 0, data: { access_token: 'old', expires_at: Date.now() + 3600000 } })
    expect((await ordinary).access_token).toBe('old')
    expect((await first).access_token).toBe('access')
    expect((await second).access_token).toBe('access')
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(mocks.token).toHaveBeenCalledTimes(2)
  })

  it('does not start queued forced renewal in a replacement login session', async () => {
    let resolve!: (response: any) => void
    mocks.token.mockImplementationOnce(() => new Promise(done => { resolve = done }))
    const ordinary = getDesktopOAuthAccessToken(1).catch(() => {})
    const forced = forceRefreshDesktopOAuthAccessToken(1)
    localStorage.setItem('token', 'session-b')
    resolve({ code: 0, data: { access_token: 'old' } })
    await ordinary
    await expect(forced).rejects.toThrow('配置已变化')
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('shares the initial account read and keeps it across scheduled checks', async () => {
    await Promise.all([getDesktopMailboxAccounts(), getDesktopMailboxAccounts()])
    await vi.advanceTimersByTimeAsync(3600000)
    await getDesktopMailboxAccounts()
    expect(mocks.accounts).toHaveBeenCalledTimes(1)
    mocks.realtime({ resource: 'accounts' }, 'mailbox_config_changed')
    await getDesktopMailboxAccounts()
    expect(mocks.accounts).toHaveBeenCalledTimes(2)
  })
  it('does not let an old response overwrite a newer configuration', async () => {
    let resolve: any
    mocks.accounts.mockImplementationOnce(() => new Promise(done => { resolve = done }))
    const old = getDesktopMailboxAccounts()
    invalidateDesktopMailboxes()
    mocks.accounts.mockResolvedValue({ code: 0, data: { accounts: [{ id: 2 }] } })
    expect(await getDesktopMailboxAccounts()).toEqual([{ id: 2 }])
    resolve({ code: 0, data: { accounts: [{ id: 1 }] } })
    expect(await old).toEqual([{ id: 2 }])
  })
  it('caches no-proxy decisions and deduplicates concurrent requests', async () => {
    await Promise.all([getDesktopRuntimeProxy(1), getDesktopRuntimeProxy(1)])
    await vi.advanceTimersByTimeAsync(3600000)
    expect(await getDesktopRuntimeProxy(1)).toBeNull()
    expect(mocks.proxy).toHaveBeenCalledTimes(1)
  })
  it('expires dynamic proxies while keeping fixed proxies until configuration changes', async () => {
    mocks.proxy.mockResolvedValueOnce({ code: 0, data: { runtime_proxy: { host: 'proxy.test', expires_at: Date.now() + 10000 } } })
    await getDesktopRuntimeProxy(1)
    await vi.advanceTimersByTimeAsync(10001)
    await getDesktopRuntimeProxy(1)
    expect(mocks.proxy).toHaveBeenCalledTimes(2)
    invalidateDesktopMailboxes({ resource: 'proxy', mailbox_id: 1 })
    await getDesktopRuntimeProxy(1)
    expect(mocks.proxy).toHaveBeenCalledTimes(3)
  })
  it('does not treat a failed proxy lookup as permission to connect directly', async () => {
    mocks.proxy.mockRejectedValueOnce(new Error('offline'))
    await expect(getDesktopRuntimeProxy(1)).rejects.toThrow('offline')
    await getDesktopRuntimeProxy(1)
    expect(mocks.proxy).toHaveBeenCalledTimes(2)
  })
  it('clears configuration when the login session changes', async () => {
    await getDesktopMailboxAccounts()
    await getDesktopRuntimeProxy(1)
    localStorage.setItem('token', 'session-b')
    await getDesktopMailboxAccounts()
    await getDesktopRuntimeProxy(1)
    expect(mocks.accounts).toHaveBeenCalledTimes(2)
    expect(mocks.proxy).toHaveBeenCalledTimes(2)
  })

  it('does not retry a stale account lookup after logout', async () => {
    let resolve: any
    mocks.accounts.mockImplementationOnce(() => new Promise(done => { resolve = done }))
    const result = getDesktopMailboxAccounts()
    localStorage.removeItem('token')
    stopDesktopMailboxCache()
    resolve({ code: 0, data: { accounts: [{ id: 1, password: 'old' }] } })
    await expect(result).rejects.toThrow('登录状态已变化')
    expect(mocks.accounts).toHaveBeenCalledTimes(1)
  })
})

describe('desktop OAuth token reuse', () => {
  it('deduplicates requests and renews only when the declared refresh time is reached', async () => {
    await Promise.all([getDesktopOAuthAccessToken(1), getDesktopOAuthAccessToken(1)])
    await vi.advanceTimersByTimeAsync(5 * 60000)
    await getDesktopOAuthAccessToken(1)
    expect(mocks.token).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(50 * 60000)
    await getDesktopOAuthAccessToken(1)
    expect(mocks.token).toHaveBeenCalledTimes(2)
  })
  it('refreshes once after an authentication failure and retries the mailbox action', async () => {
    const action = vi.fn().mockRejectedValueOnce(new Error('XOAUTH2 invalid token')).mockResolvedValueOnce('ok')
    expect(await runDesktopOAuthMailboxAction(1, action)).toBe('ok')
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(action).toHaveBeenCalledTimes(2)
  })
  it('invalidates tokens on account changes but retains them on proxy changes', async () => {
    await getDesktopOAuthAccessToken(1)
    invalidateDesktopMailboxes({ resource: 'proxy' })
    await getDesktopOAuthAccessToken(1)
    expect(mocks.token).toHaveBeenCalledTimes(1)
    invalidateDesktopMailboxes({ resource: 'oauth', mailbox_id: 1 })
    await getDesktopOAuthAccessToken(1)
    expect(mocks.token).toHaveBeenCalledTimes(2)
  })
  it('does not return a token fetched for a logged-out session', async () => {
    let resolve: any
    mocks.token.mockImplementationOnce(() => new Promise(done => { resolve = done }))
    const result = getDesktopOAuthAccessToken(1)
    localStorage.setItem('token', 'session-b')
    resolve({ code: 0, data: { access_token: 'old-secret' } })
    await expect(result).rejects.toThrow('配置已变化')
    expect(localStorage.getItem('old-secret')).toBeNull()
  })
})
