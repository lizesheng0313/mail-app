import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAllAccounts: vi.fn(),
  fetchRelay: vi.fn(),
  getRuntimeProxy: vi.fn(),
  invoke: vi.fn(),
  listen: vi.fn(),
  listener: null as null | ((event: any) => void)
}))

vi.mock('@/api/batchLogin', () => ({
  batchLoginAPI: {
    getAllAccounts: mocks.getAllAccounts,
    fetchExternalMailboxOnline: mocks.fetchRelay
  }
}))
vi.mock('@/api/mailboxProxy', () => ({
  default: { getRuntimeProxy: mocks.getRuntimeProxy }
}))
vi.mock('@/services/api', () => ({
  getServerUrl: () => 'http://localhost:8088/mail-api/v1',
  isTauri: () => true
}))
vi.mock('@/services/desktopOAuthMailbox', () => ({
  getDesktopOAuthAccessToken: vi.fn(),
  runDesktopOAuthMailboxAction: vi.fn()
}))
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke }))
vi.mock('@tauri-apps/api/event', () => ({ listen: mocks.listen }))

import { invalidateDesktopMailboxes, stopDesktopMailboxCache } from './desktopMailboxCache'
import { desktopExternalMailSync, mailboxSyncMode } from './desktopExternalMailSync'

const emit = (mailboxId: number, generation: number, status: string) => {
  mocks.listener?.({ payload: { mailboxId, generation, status } })
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.setItem('token', 'local-test-token')
  mocks.listener = null
  mocks.listen.mockImplementation(async (_name, callback) => {
    mocks.listener = callback
    return () => { mocks.listener = null }
  })
  mocks.getRuntimeProxy.mockResolvedValue({ code: 0, data: { runtime_proxy: null } })
  mocks.invoke.mockImplementation(async (command) => {
    if (command === 'start_imap_watch') return 7
    if (command === 'fetch_emails') return { count: 2 }
    return undefined
  })
  mocks.fetchRelay.mockResolvedValue({ code: 0, data: { new_email_count: 1 } })
})

afterEach(async () => {
  await desktopExternalMailSync.stop()
  stopDesktopMailboxCache()
  vi.useRealTimers()
  localStorage.clear()
})

describe('desktop external mail sync', () => {
  it('selects IDLE only for locally connected IMAP and bounds the connections', () => {
    expect(mailboxSyncMode({ id: 1, email: 'a@test', protocol: 'imap', imap_host: 'imap.test' }, true)).toBe('idle')
    expect(mailboxSyncMode({ id: 1, email: 'a@test', protocol: 'imap', imap_host: 'imap.test' }, false)).toBe('interval')
    expect(mailboxSyncMode({ id: 2, email: 'b@test', protocol: 'pop3' }, true)).toBe('interval')
    expect(mailboxSyncMode({ id: 3, email: 'c@test', protocol: 'pop3', relay_fetch_enabled: true }, true)).toBe('relay')
  })

  it('starts an IMAP watcher and fetches only after ready or a new-mail notification', async () => {
    mocks.getAllAccounts.mockResolvedValue({ code: 0, data: { accounts: [{
      id: 1, email: 'imap@test.local', password: 'secret', protocol: 'imap',
      imap_host: 'imap.test.local', imap_port: 993, status: 'active'
    }] } })
    const synced = vi.fn()
    window.addEventListener('external-mailbox-synced', synced)
    try {
      await desktopExternalMailSync.start(42)
      await vi.waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith('start_imap_watch', expect.objectContaining({ mailboxId: 1 })))
      expect(mocks.invoke.mock.calls.some(([command]) => command === 'fetch_emails')).toBe(false)
      emit(1, 7, 'ready')
      await vi.waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith('fetch_emails', expect.objectContaining({ protocol: 'imap', mailboxId: 1 })))
      expect(synced).toHaveBeenCalledTimes(1)
    } finally {
      window.removeEventListener('external-mailbox-synced', synced)
    }
  })

  it('checks POP3 on startup and falls back when IDLE is unsupported', async () => {
    mocks.getAllAccounts.mockResolvedValue({ code: 0, data: { accounts: [
      { id: 2, email: 'pop@test.local', password: 'secret', protocol: 'pop3', pop3_host: 'pop.test.local', pop3_port: 995, status: 'active' },
      { id: 3, email: 'imap@test.local', password: 'secret', protocol: 'imap', imap_host: 'imap.test.local', imap_port: 993, status: 'active' }
    ] } })
    await desktopExternalMailSync.start(42)
    expect(mocks.invoke).toHaveBeenCalledWith('fetch_emails', expect.objectContaining({ mailboxId: 2, protocol: 'pop3' }))
    emit(3, 7, 'unsupported')
    await vi.waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith('fetch_emails', expect.objectContaining({ mailboxId: 3, protocol: 'imap' })))
    await desktopExternalMailSync.stop()
    expect(mocks.invoke).toHaveBeenCalledWith('stop_all_imap_watches')
  })

  it('checks POP3 again every five minutes while the desktop session stays open', async () => {
    vi.useFakeTimers()
    mocks.getAllAccounts.mockResolvedValue({ code: 0, data: { accounts: [{
      id: 2, email: 'pop@test.local', password: 'secret', protocol: 'pop3',
      pop3_host: 'pop.test.local', pop3_port: 995, status: 'active'
    }] } })
    await desktopExternalMailSync.start(42)
    expect(mocks.invoke.mock.calls.filter(([command]) => command === 'fetch_emails')).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000)
    expect(mocks.invoke.mock.calls.filter(([command]) => command === 'fetch_emails')).toHaveLength(2)
    expect(mocks.getAllAccounts).toHaveBeenCalledTimes(1)
    expect(mocks.getRuntimeProxy).toHaveBeenCalledTimes(1)
  })

  it('limits simultaneous fetches when many IMAP accounts become ready together', async () => {
    mocks.getAllAccounts.mockResolvedValue({ code: 0, data: { accounts: [1, 2, 3, 4].map((id) => ({
      id, email: `imap${id}@test.local`, password: 'secret', protocol: 'imap',
      imap_host: 'imap.test.local', imap_port: 993, status: 'active'
    })) } })
    const releases: Array<(result: { count: number }) => void> = []
    mocks.invoke.mockImplementation(async (command) => {
      if (command === 'start_imap_watch') return 7
      if (command === 'fetch_emails') return await new Promise((resolve) => releases.push(resolve))
      return undefined
    })
    await desktopExternalMailSync.start(42)
    await vi.waitFor(() => expect(mocks.invoke.mock.calls.filter(([command]) => command === 'start_imap_watch')).toHaveLength(4))
    for (const id of [1, 2, 3, 4]) emit(id, 7, 'ready')
    await vi.waitFor(() => expect(releases).toHaveLength(3))
    releases[0]({ count: 0 })
    await vi.waitFor(() => expect(releases).toHaveLength(4))
    releases.slice(1).forEach((release) => release({ count: 0 }))
  })

  it('retries failed uploads without repeatedly querying account or proxy configuration', async () => {
    vi.useFakeTimers()
    mocks.getAllAccounts.mockResolvedValue({ code: 0, data: { accounts: [{ id: 2, email: 'pop@test', protocol: 'pop3', status: 'active' }] } })
    let attempts = 0
    mocks.invoke.mockImplementation(async command => {
      if (command !== 'fetch_emails') return
      if (++attempts === 1) throw { message: '本地收取成功，但同步到服务器失败', failure_kind: 'network' }
      return { count: 0 }
    })
    await desktopExternalMailSync.start(42)
    expect(attempts).toBe(1)
    await vi.advanceTimersByTimeAsync(5000)
    expect(attempts).toBe(2)
    await vi.advanceTimersByTimeAsync(10000)
    expect(attempts).toBe(2)
    expect(mocks.getAllAccounts).toHaveBeenCalledTimes(1)
    expect(mocks.getRuntimeProxy).toHaveBeenCalledTimes(1)
  })

  it('uses changed credentials on the next fetch after a configuration push', async () => {
    const account = { id: 2, email: 'pop@test', protocol: 'pop3', password: 'old', status: 'active' }
    mocks.getAllAccounts.mockResolvedValue({ code: 0, data: { accounts: [account] } })
    await desktopExternalMailSync.start(42)
    mocks.getAllAccounts.mockResolvedValue({ code: 0, data: { accounts: [{ ...account, password: 'new' }] } })
    invalidateDesktopMailboxes({ resource: 'accounts', mailbox_id: 2 })
    await vi.waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith('fetch_emails', expect.objectContaining({ password: 'new' })))
    expect(mocks.getAllAccounts).toHaveBeenCalledTimes(2)
  })

  it('does not let repeated IDLE events bypass failed upload backoff', async () => {
    vi.useFakeTimers()
    mocks.getAllAccounts.mockResolvedValue({ code: 0, data: { accounts: [{
      id: 1, email: 'imap@test', protocol: 'imap', imap_host: 'imap.test', status: 'active'
    }] } })
    let reject!: (error: unknown) => void
    let attempts = 0
    mocks.invoke.mockImplementation(async command => {
      if (command === 'start_imap_watch') return 7
      if (command === 'fetch_emails' && ++attempts === 1) return new Promise((_resolve, fail) => { reject = fail })
      return { count: 0 }
    })
    await desktopExternalMailSync.start(42)
    await vi.advanceTimersByTimeAsync(0)
    emit(1, 7, 'ready')
    await vi.advanceTimersByTimeAsync(0)
    for (let i = 0; i < 20; i++) emit(1, 7, 'changed')
    reject({ message: '本地收取成功，但同步到服务器失败', failure_kind: 'network' })
    await vi.advanceTimersByTimeAsync(0)
    expect(attempts).toBe(1)
    for (let i = 0; i < 20; i++) emit(1, 7, 'changed')
    await vi.advanceTimersByTimeAsync(4999)
    expect(attempts).toBe(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(attempts).toBe(2)
  })
})
