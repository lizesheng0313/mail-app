import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRealtimeRefresh } from './realtimeRefresh'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('snapshot refresh coordination', () => {
  it('combines push, local completion and manual refresh before querying', async () => {
    const fetch = vi.fn(async () => true)
    const queue = createRealtimeRefresh(fetch, { delay: 150 })
    const pushed = queue.request()
    queue.invalidate()
    const manual = queue.request()
    await vi.advanceTimersByTimeAsync(150)
    expect(await pushed).toBe(true)
    expect(await manual).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(3600000)
    expect(fetch).toHaveBeenCalledTimes(1)
    queue.dispose()
  })

  it('queries again when new changes arrive after a query has started', async () => {
    let finish!: () => void
    const fetch = vi.fn().mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve }))
      .mockResolvedValue(undefined)
    const queue = createRealtimeRefresh(fetch, { delay: 150 })
    const first = queue.request()
    await vi.advanceTimersByTimeAsync(150)
    const newer = queue.request()
    queue.invalidate()
    finish()
    await vi.advanceTimersByTimeAsync(150)
    expect(await first).toBe(true)
    expect(await newer).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(2)
    queue.dispose()
  })

  it('retries failed queries and cancels pending work when the view closes', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true)
    const queue = createRealtimeRefresh(fetch, { delay: 150 })
    const failed = queue.request()
    await vi.advanceTimersByTimeAsync(150)
    expect(await failed).toBe(false)
    await vi.advanceTimersByTimeAsync(1300)
    expect(fetch).toHaveBeenCalledTimes(2)
    const cancelled = queue.request()
    queue.dispose()
    expect(await cancelled).toBe(false)
    await vi.advanceTimersByTimeAsync(3600000)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
