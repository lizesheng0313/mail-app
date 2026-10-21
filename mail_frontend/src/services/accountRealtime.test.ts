import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dispatchAccountState, subscribeAccountState } from './accountRealtime'

const cleanups: Array<() => void> = []
const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve() }
beforeEach(() => { localStorage.setItem('token', 'test-session'); vi.useFakeTimers() })
afterEach(() => { cleanups.splice(0).forEach(stop => stop()); vi.useRealTimers(); localStorage.clear() })

describe('account view refresh', () => {
  it('makes no idle requests and refreshes only for the matching resource or reconnect', async () => {
    const refresh = vi.fn()
    cleanups.push(subscribeAccountState(['notifications'], refresh))
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
    expect(refresh).not.toHaveBeenCalled()
    dispatchAccountState('outbox')
    await settle()
    expect(refresh).not.toHaveBeenCalled()
    dispatchAccountState('notifications')
    await settle()
    expect(refresh).toHaveBeenCalledTimes(1)
    dispatchAccountState('all')
    await settle()
    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it('coalesces events during a request and cancels queued work on unmount', async () => {
    let resolve!: () => void
    const refresh = vi.fn(() => new Promise<void>(done => { resolve = done }))
    const stop = subscribeAccountState(['outbox'], refresh)
    cleanups.push(stop)
    dispatchAccountState('outbox')
    dispatchAccountState('outbox')
    dispatchAccountState('outbox')
    expect(refresh).toHaveBeenCalledTimes(1)
    resolve()
    await settle()
    expect(refresh).toHaveBeenCalledTimes(2)
    dispatchAccountState('outbox')
    stop()
    resolve()
    await settle()
    dispatchAccountState('all')
    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it('catches up on foreground entry and stops requesting after logout', async () => {
    const refresh = vi.fn()
    cleanups.push(subscribeAccountState(['announcements'], refresh))
    window.dispatchEvent(new Event('focus'))
    await settle()
    expect(refresh).toHaveBeenCalledTimes(1)
    localStorage.removeItem('token')
    window.dispatchEvent(new Event('online'))
    dispatchAccountState('all')
    await settle()
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})
