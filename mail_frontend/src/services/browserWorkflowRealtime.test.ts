import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWorkflowExecutionConnection } from './browserWorkflowRealtime'

const api = vi.hoisted(() => ({
  createExecutionSocketTicket: vi.fn(),
  executionSocketUrl: vi.fn((id, ticket) => `ws://test/${id}?ticket=${ticket}`),
}))
vi.mock('@/api/browserWorkflow', () => ({ default: api }))

class FakeSocket {
  static instances: FakeSocket[] = []
  onopen: any
  onclose: any
  onmessage: any
  onerror: any
  send = vi.fn()
  close = vi.fn()
  constructor(public url: string) { FakeSocket.instances.push(this) }
  message(payload: unknown) { this.onmessage?.({ data: JSON.stringify(payload) }) }
}
const connections: ReturnType<typeof createWorkflowExecutionConnection>[] = []
beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(Math, 'random').mockReturnValue(0)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.stubGlobal('WebSocket', FakeSocket)
  FakeSocket.instances = []
  api.createExecutionSocketTicket.mockReset().mockResolvedValue({ code: 0, data: { ticket: 'first' } })
  api.executionSocketUrl.mockClear()
})
afterEach(() => {
  connections.splice(0).forEach(connection => connection.stop())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
async function setup() {
  const onEvent = vi.fn()
  const onUnavailable = vi.fn()
  const connection = createWorkflowExecutionConnection('execution-7', onEvent, onUnavailable)
  connections.push(connection)
  connection.start()
  await Promise.resolve()
  return { connection, socket: FakeSocket.instances[0], onEvent, onUnavailable }
}

describe('workflow execution log recovery', () => {
  it('renews the single-use ticket and receives the current snapshot on reconnect', async () => {
    const { socket, onEvent, onUnavailable } = await setup()
    socket.message({ type: 'execution_snapshot', record: { status: 'running' } })
    await Promise.resolve()
    api.createExecutionSocketTicket.mockResolvedValue({ code: 0, data: { ticket: 'replacement' } })
    socket.onclose({ code: 1011 })
    await vi.advanceTimersByTimeAsync(3000)
    const replacement = FakeSocket.instances[1]
    expect(replacement.url).toBe('ws://test/execution-7?ticket=replacement')
    replacement.message({ type: 'execution_snapshot', record: { status: 'succeeded' } })
    await Promise.resolve()
    expect(onEvent).toHaveBeenLastCalledWith({ type: 'execution_snapshot', record: { status: 'succeeded' } })
    expect(api.createExecutionSocketTicket).toHaveBeenCalledTimes(2)
    expect(onUnavailable).toHaveBeenCalledTimes(1)
  })

  it('sends heartbeats without requerying a healthy execution', async () => {
    const { socket } = await setup()
    socket.message({ type: 'execution_snapshot' })
    for (let index = 0; index < 5; index++) {
      await vi.advanceTimersByTimeAsync(25000)
      expect(socket.send).toHaveBeenLastCalledWith(JSON.stringify({ type: 'ping' }))
      socket.message({ type: 'pong' })
    }
    expect(api.createExecutionSocketTicket).toHaveBeenCalledTimes(1)
    expect(socket.close).not.toHaveBeenCalled()
  })

  it('reconnects when heartbeat responses stop', async () => {
    const { socket } = await setup()
    socket.message({ type: 'execution_snapshot' })
    await vi.advanceTimersByTimeAsync(35000)
    expect(socket.close).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(3000)
    expect(FakeSocket.instances).toHaveLength(2)
  })

  it('times out an open socket that never sends its initial snapshot', async () => {
    await setup()
    await vi.advanceTimersByTimeAsync(13000)
    expect(FakeSocket.instances).toHaveLength(2)
  })

  it('discards an old ticket that arrives after its connection attempt timed out', async () => {
    let finish!: (response: unknown) => void
    api.createExecutionSocketTicket.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    await setup()
    await vi.advanceTimersByTimeAsync(13000)
    expect(FakeSocket.instances).toHaveLength(1)
    finish({ code: 0, data: { ticket: 'late' } })
    await Promise.resolve()
    expect(FakeSocket.instances).toHaveLength(1)
    expect(FakeSocket.instances[0].url).toContain('ticket=first')
  })

  it('retries transport errors and warns once per outage', async () => {
    const { socket, onUnavailable } = await setup()
    socket.onerror()
    await vi.advanceTimersByTimeAsync(3000)
    FakeSocket.instances[1].onerror()
    await vi.advanceTimersByTimeAsync(6000)
    expect(FakeSocket.instances).toHaveLength(3)
    expect(onUnavailable).toHaveBeenCalledTimes(1)
  })

  it.each([4401, 4403, 4404])('stops retrying a permanently rejected socket (%s)', async code => {
    const { socket } = await setup()
    socket.onclose({ code })
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(120000)
    expect(api.createExecutionSocketTicket).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([401, 403, 404, 410])('stops retrying a rejected ticket request (%s)', async status => {
    api.createExecutionSocketTicket.mockRejectedValue({ response: { status } })
    await setup()
    await vi.advanceTimersByTimeAsync(120000)
    expect(api.createExecutionSocketTicket).toHaveBeenCalledTimes(1)
    expect(FakeSocket.instances).toHaveLength(0)
  })

  it('recovers immediately on network restoration after a transient ticket failure', async () => {
    api.createExecutionSocketTicket.mockRejectedValueOnce(new Error('offline'))
    await setup()
    window.dispatchEvent(new Event('online'))
    await Promise.resolve()
    expect(api.createExecutionSocketTicket).toHaveBeenCalledTimes(2)
    expect(FakeSocket.instances).toHaveLength(1)
  })

  it('ignores malformed messages while continuing to deliver valid events', async () => {
    const { socket, onEvent } = await setup()
    socket.onmessage({ data: 'not json' })
    socket.message(null)
    socket.message(7)
    socket.message({ type: 'execution_event', event: { node_id: 'node-1' } })
    await Promise.resolve()
    expect(onEvent).toHaveBeenCalledExactlyOnceWith({ type: 'execution_event', event: { node_id: 'node-1' } })
  })

  it('resynchronizes after an event handler fails', async () => {
    const { socket, onEvent } = await setup()
    onEvent.mockImplementationOnce(() => { throw new Error('snapshot failed') })
    socket.message({ type: 'execution_snapshot' })
    await vi.advanceTimersByTimeAsync(3000)
    expect(FakeSocket.instances).toHaveLength(2)
  })

  it('stops timers and discards queued events after leaving the page', async () => {
    const { connection, socket, onEvent } = await setup()
    const staleMessage = socket.onmessage
    const staleError = socket.onerror
    socket.message({ type: 'execution_snapshot' })
    connection.stop()
    staleMessage({ data: JSON.stringify({ type: 'execution_event' }) })
    staleError()
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(120000)
    expect(onEvent).not.toHaveBeenCalled()
    expect(FakeSocket.instances).toHaveLength(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not create a late connection when a ticket arrives after leaving the page', async () => {
    let finish!: (response: unknown) => void
    api.createExecutionSocketTicket.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const { connection } = await setup()
    connection.stop()
    finish({ code: 0, data: { ticket: 'late' } })
    await Promise.resolve()
    expect(FakeSocket.instances).toHaveLength(0)
    expect(vi.getTimerCount()).toBe(0)
  })
})
