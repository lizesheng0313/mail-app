import { afterEach, describe, expect, it, vi } from 'vitest'
import { collectMailbox, invokeDesktopMailboxFetch } from './mailboxCollection'

afterEach(() => localStorage.clear())

describe('shared mailbox collection', () => {
  it('joins manual and automatic native collection and permits a later refresh', async () => {
    let finish!: (value: any) => void
    const invoke = vi.fn(() => new Promise<any>(resolve => { finish = resolve }))
    const args = { mailboxId: 1, token: 'session', serverUrl: 'http://local.test', protocol: 'imap' }
    const automatic = invokeDesktopMailboxFetch(invoke, args)
    const manual = invokeDesktopMailboxFetch(invoke, args)
    await Promise.resolve()
    expect(invoke).toHaveBeenCalledTimes(1)
    finish({ count: 3 })
    expect(await automatic).toEqual({ count: 3 })
    expect(await manual).toEqual({ count: 3 })
    invoke.mockResolvedValueOnce({ count: 0 })
    expect(await invokeDesktopMailboxFetch(invoke, args)).toEqual({ count: 0 })
    expect(invoke).toHaveBeenCalledTimes(2)
  })

  it('does not join requests across users, servers or mailboxes', async () => {
    const action = vi.fn(async () => ({ count: 0 }))
    await Promise.all([
      collectMailbox(1, 'relay', action, 'a', 'server1'),
      collectMailbox(1, 'relay', action, 'b', 'server1'),
      collectMailbox(1, 'relay', action, 'a', 'server2'),
      collectMailbox(2, 'relay', action, 'a', 'server1'),
    ])
    expect(action).toHaveBeenCalledTimes(4)
  })

  it('shares relay requests from every caller and releases failures for retry', async () => {
    const action = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ count: 1 })
    const first = collectMailbox(2, 'relay', action)
    const second = collectMailbox(2, 'relay', action)
    await expect(first).rejects.toThrow('offline')
    await expect(second).rejects.toThrow('offline')
    expect(action).toHaveBeenCalledTimes(1)
    expect(await collectMailbox(2, 'relay', action)).toEqual({ count: 1 })
    expect(action).toHaveBeenCalledTimes(2)
  })
})
