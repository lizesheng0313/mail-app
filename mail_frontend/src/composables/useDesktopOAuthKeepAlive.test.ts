import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h } from 'vue'

const mocks = vi.hoisted(() => ({ accounts: vi.fn(), token: vi.fn(), status: vi.fn(), invoke: vi.fn() }))
vi.mock('@/api/batchLogin', () => ({ batchLoginAPI: { getAllAccounts: mocks.accounts, getOAuth2AccessToken: mocks.token, updateMailboxStatus: mocks.status } }))
vi.mock('@/api/mailboxProxy', () => ({ default: {} }))
vi.mock('@/services/api', () => ({ isTauri: () => true, getServerUrl: () => 'https://api.test/v1' }))
vi.mock('@/services/realtimeClient', () => ({ subscribeRealtime: () => () => {} }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke }))

import { useDesktopOAuthKeepAlive } from './useDesktopOAuthKeepAlive'
import { getDesktopMailboxAccounts, stopDesktopMailboxCache } from '@/services/desktopMailboxCache'

let app: ReturnType<typeof createApp>
let service: ReturnType<typeof useDesktopOAuthKeepAlive>
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  localStorage.setItem('token', 'session-test')
  mocks.accounts.mockResolvedValue({ code: 0, data: { accounts: [{ id: 1, auth_type: 'oauth2', status: 'active' }] } })
  mocks.token.mockImplementation(async () => ({ code: 0, data: { access_token: 'access', expires_at: Date.now() + 3600000, refresh_before_at: Date.now() + 3300000, should_cache: true } }))
  app = createApp(defineComponent({ setup() { service = useDesktopOAuthKeepAlive(); return () => h('div') } }))
  app.mount(document.createElement('div'))
})
afterEach(() => { app.unmount(); stopDesktopMailboxCache(); localStorage.clear(); vi.useRealTimers() })

it('shares accounts with collection and checks tokens at expiry instead of every five minutes', async () => {
  await Promise.all([service.start(), getDesktopMailboxAccounts()])
  await vi.advanceTimersByTimeAsync(30 * 60000)
  window.dispatchEvent(new Event('focus'))
  await vi.advanceTimersByTimeAsync(1)
  expect(mocks.accounts).toHaveBeenCalledTimes(1)
  expect(mocks.token).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(25 * 60000)
  await vi.waitFor(() => expect(mocks.token).toHaveBeenCalledTimes(2))
  expect(mocks.accounts).toHaveBeenCalledTimes(1)
})

it('backs off failed renewal without repeatedly fetching the mailbox list', async () => {
  mocks.token.mockRejectedValue(new Error('offline'))
  await service.start()
  await vi.advanceTimersByTimeAsync(4 * 60000)
  expect(mocks.token).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(60000)
  await vi.waitFor(() => expect(mocks.token).toHaveBeenCalledTimes(2))
  expect(mocks.accounts).toHaveBeenCalledTimes(1)
})

it('has no periodic account request when there are no OAuth mailboxes', async () => {
  mocks.accounts.mockResolvedValue({ code: 0, data: { accounts: [] } })
  await service.start()
  await vi.advanceTimersByTimeAsync(60 * 60000)
  expect(mocks.accounts).toHaveBeenCalledTimes(1)
  expect(mocks.token).not.toHaveBeenCalled()
})
