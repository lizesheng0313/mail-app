import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ get: vi.fn(), listeners: new Map<string, () => Promise<unknown>>() }))
vi.mock('./api', () => ({ default: { get: mocks.get } }))
vi.mock('./accountRealtime', () => ({
  subscribeAccountState: (resources: string[], refresh: () => Promise<unknown>) => {
    mocks.listeners.set(resources[0], refresh)
    return () => { mocks.listeners.delete(resources[0]) }
  }
}))
import { accountUnreadCount, refreshUnreadCounts, retainAccountUnread, withUnreadMutation } from './accountUnread'

const cleanups: Array<() => void> = []
let caseId = 0
beforeEach(() => {
  vi.useFakeTimers(); mocks.get.mockReset()
  localStorage.setItem('token', `session-${++caseId}`)
  mocks.get.mockResolvedValue({ code: 0, data: { count: 1 } })
})
afterEach(() => {
  cleanups.splice(0).forEach(stop => stop())
  localStorage.clear(); vi.useRealTimers()
})

describe('shared unread snapshots', () => {
  it('applies command results without count requests and ignores an older query', async () => {
    cleanups.push(retainAccountUnread())
    let finish!: (result: any) => void
    mocks.get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const old = refreshUnreadCounts(['notifications'])
    await withUnreadMutation('notifications', Promise.resolve({ code: 0, data: { unread_count: 2 } }))
    expect(accountUnreadCount.value).toBe(2)
    finish({ code: 0, data: { count: 8 } })
    await old
    expect(accountUnreadCount.value).toBe(2)
    expect(mocks.get).toHaveBeenCalledTimes(1)
    await mocks.listeners.get('notifications')!()
    expect(accountUnreadCount.value).toBe(1) // New incoming notices still refresh.
  })

  it('does not apply a failed or old-session command result', async () => {
    cleanups.push(retainAccountUnread())
    await withUnreadMutation('notifications', Promise.resolve({ code: 1, data: { unread_count: 50 } }))
    let finish!: (result: any) => void
    const old = withUnreadMutation('notifications', new Promise(resolve => { finish = resolve }))
    localStorage.setItem('token', 'replacement-session')
    finish({ code: 0, data: { unread_count: 99 } })
    await old
    expect(accountUnreadCount.value).toBe(0)
    expect(mocks.get).not.toHaveBeenCalled()
  })
  it('shares the first request, keeps resource changes separate and makes no idle requests', async () => {
    cleanups.push(retainAccountUnread(), retainAccountUnread())
    await Promise.all([refreshUnreadCounts(undefined, true), refreshUnreadCounts(undefined, true)])
    expect(mocks.get).toHaveBeenCalledTimes(2)
    expect(accountUnreadCount.value).toBe(2)
    await mocks.listeners.get('notifications')!()
    expect(mocks.get).toHaveBeenCalledTimes(3)
    expect(mocks.get).toHaveBeenLastCalledWith('/notifications/unread-count', expect.anything())
    await vi.advanceTimersByTimeAsync(3600000)
    expect(mocks.get).toHaveBeenCalledTimes(3)
  })

  it('rechecks a change that arrives while an older unread query is pending', async () => {
    cleanups.push(retainAccountUnread())
    let finish!: (result: any) => void
    mocks.get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const initial = refreshUnreadCounts(['notifications'], true)
    const changed = mocks.listeners.get('notifications')!()
    mocks.get.mockResolvedValue({ code: 0, data: { count: 4 } })
    finish({ code: 0, data: { count: 1 } })
    await initial; await changed
    expect(mocks.get).toHaveBeenCalledTimes(2)
    expect(accountUnreadCount.value).toBe(4)
  })

  it('does not apply a previous session response or keep retrying after the last view closes', async () => {
    const release = retainAccountUnread()
    let finish!: (result: any) => void
    mocks.get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const old = refreshUnreadCounts(['notifications'])
    localStorage.setItem('token', 'new-session')
    mocks.get.mockResolvedValue({ code: 0, data: { count: 3 } })
    await refreshUnreadCounts(['notifications'])
    finish({ code: 0, data: { count: 99 } })
    await old
    expect(accountUnreadCount.value).toBe(3)
    mocks.get.mockRejectedValueOnce(new Error('offline'))
    expect(await refreshUnreadCounts(['notifications'])).toBe(false)
    release()
    await vi.advanceTimersByTimeAsync(3600000)
    expect(mocks.get).toHaveBeenCalledTimes(3)
  })
})
