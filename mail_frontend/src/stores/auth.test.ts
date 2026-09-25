import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mailboxAPI } from '@/api/mailbox'
import { useMailboxStore } from './auth'

vi.mock('@/services/productAnalytics', () => ({ trackProductEvent: vi.fn() }))

const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

describe('mailbox loading states', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
    setActivePinia(createPinia())
  })

  it('refreshing the list for sharing does not mark free claim as loading', async () => {
    const pendingList = deferred<any>()
    vi.spyOn(mailboxAPI, 'getMailboxes').mockReturnValue(pendingList.promise)
    const store = useMailboxStore()

    const refresh = store.fetchMailboxes()
    expect(store.loading).toBe(true)
    expect(store.claimingMailbox).toBe(false)

    pendingList.resolve({ code: 0, data: { mailboxes: [] } })
    await refresh
    expect(store.loading).toBe(false)
    expect(store.claimingMailbox).toBe(false)
  })

  it('keeps the claim state until allocation and its list refresh finish', async () => {
    const pendingAllocation = deferred<any>()
    const pendingList = deferred<any>()
    vi.spyOn(mailboxAPI, 'allocateMailbox').mockReturnValue(pendingAllocation.promise)
    vi.spyOn(mailboxAPI, 'getMailboxes').mockReturnValue(pendingList.promise)
    const store = useMailboxStore()

    const allocation = store.allocateMailbox()
    expect(store.claimingMailbox).toBe(true)

    pendingAllocation.resolve({ code: 0, data: { id: 1, email: 'test@example.com' } })
    await Promise.resolve()
    expect(store.claimingMailbox).toBe(true)

    pendingList.resolve({ code: 0, data: { mailboxes: [] } })
    await allocation
    expect(store.claimingMailbox).toBe(false)
  })

  it('marks guest mailbox creation as a claim, not a list refresh', async () => {
    const pendingGuest = deferred<any>()
    vi.spyOn(mailboxAPI, 'getTempMailbox').mockReturnValue(pendingGuest.promise)
    const store = useMailboxStore()

    const creation = store.getTempMailbox()
    expect(store.claimingMailbox).toBe(true)

    pendingGuest.resolve({ code: 0, data: { id: 1, email: 'test@example.com', claim_token: 'token' } })
    const result = await creation
    expect(result.success).toBe(true)
    expect(store.tempMailbox?.email).toBe('test@example.com')
    expect(store.guestMailboxes.some((mailbox) => mailbox.email === 'test@example.com')).toBe(true)
    expect(store.claimingMailbox).toBe(false)
  })

  it('creates one initial guest mailbox and reuses it after revisiting or refreshing', async () => {
    const pendingGuest = deferred<any>()
    const getTempMailbox = vi.spyOn(mailboxAPI, 'getTempMailbox').mockReturnValue(pendingGuest.promise)
    const store = useMailboxStore()

    const firstVisit = store.ensureInitialGuestMailbox()
    const concurrentVisit = await store.ensureInitialGuestMailbox()
    expect(concurrentVisit.skipped).toBe(true)
    expect(getTempMailbox).toHaveBeenCalledTimes(1)

    pendingGuest.resolve({
      code: 0,
      data: { id: 7, email: 'guest@example.test', claim_token: 'claim-token' }
    })
    expect((await firstVisit).success).toBe(true)
    expect((await store.ensureInitialGuestMailbox()).data?.email).toBe('guest@example.test')
    expect(getTempMailbox).toHaveBeenCalledTimes(1)

    setActivePinia(createPinia())
    const refreshedStore = useMailboxStore()
    expect((await refreshedStore.ensureInitialGuestMailbox()).data?.email).toBe('guest@example.test')
    expect(getTempMailbox).toHaveBeenCalledTimes(1)
  })

  it('allows retrying the initial guest mailbox when creation fails', async () => {
    const getTempMailbox = vi.spyOn(mailboxAPI, 'getTempMailbox')
      .mockResolvedValueOnce({ code: 1, message: '服务暂不可用' } as any)
      .mockResolvedValueOnce({
        code: 0,
        data: { id: 8, email: 'retry@example.test', claim_token: 'claim-token' }
      } as any)
    const store = useMailboxStore()

    expect((await store.ensureInitialGuestMailbox()).success).toBe(false)
    expect((await store.ensureInitialGuestMailbox()).success).toBe(true)
    expect(store.guestMailboxes).toHaveLength(1)
    expect(getTempMailbox).toHaveBeenCalledTimes(2)
  })
})
