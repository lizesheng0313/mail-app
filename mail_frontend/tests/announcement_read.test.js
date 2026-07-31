import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  post: vi.fn()
}))

vi.mock('@/services/api', () => ({ default: api }))

import { markAnnouncementAsRead } from '../src/api/announcement'

describe('announcement read requests', () => {
  beforeEach(() => {
    api.post.mockReset()
  })

  it('deduplicates concurrent reads and uses POST', async () => {
    let resolveRequest
    api.post.mockReturnValue(new Promise((resolve) => {
      resolveRequest = resolve
    }))

    const first = markAnnouncementAsRead(25)
    const second = markAnnouncementAsRead(25)

    expect(first).toBe(second)
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(api.post).toHaveBeenCalledWith('/announcements/25/read')

    resolveRequest({ code: 0 })
    await first

    await markAnnouncementAsRead(25)
    expect(api.post).toHaveBeenCalledTimes(2)
  })
})
