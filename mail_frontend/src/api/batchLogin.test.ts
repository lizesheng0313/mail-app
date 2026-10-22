import { afterEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('@/services/api', () => ({ default: { post: mocks.post } }))
import { batchLoginAPI } from './batchLogin'

afterEach(() => { localStorage.clear(); mocks.post.mockReset() })
describe('relay collection HTTP requests', () => {
  it('sends one request when page and desktop callers collect the same mailbox concurrently', async () => {
    let finish!: (result: any) => void
    mocks.post.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    localStorage.setItem('token', 'relay-session')
    const automatic = batchLoginAPI.fetchExternalMailboxOnline(7, { suppressErrorMessage: true })
    const manual = batchLoginAPI.fetchExternalMailboxOnline(7)
    await Promise.resolve()
    expect(mocks.post).toHaveBeenCalledTimes(1)
    finish({ code: 0, data: { new_email_count: 2 } })
    expect(await automatic).toEqual(await manual)
    mocks.post.mockResolvedValue({ code: 0, data: { new_email_count: 0 } })
    await batchLoginAPI.fetchExternalMailboxOnline(7)
    expect(mocks.post).toHaveBeenCalledTimes(2)
  })
})
