import browserWorkflowApi from '@/api/browserWorkflow'

/** Execution logs use a separate, single-use-ticket WebSocket protocol. */
export function createWorkflowExecutionConnection(
  executionId: string,
  onEvent: (payload: any) => unknown,
  onUnavailable: () => void,
) {
  let active = false
  let socket: WebSocket | null = null
  let retry: ReturnType<typeof setTimeout> | undefined
  let deadline: ReturnType<typeof setTimeout> | undefined
  let heartbeat: ReturnType<typeof setTimeout> | undefined
  let retryDelay = 3000
  let lastResponseAt = 0
  let version = 0
  let connecting = false
  let warned = false

  const retire = () => {
    version++
    connecting = false
    clearTimeout(deadline)
    clearTimeout(heartbeat)
    deadline = heartbeat = undefined
    const current = socket
    socket = null
    if (current) {
      current.onopen = current.onmessage = current.onclose = current.onerror = null
      try { current.close() } catch { /* Already closed. */ }
    }
  }
  const warn = () => {
    if (!warned) { warned = true; onUnavailable() }
  }
  const recover = () => {
    retire()
    if (!active || retry !== undefined) return
    warn()
    const delay = retryDelay + Math.floor(Math.random() * 1000)
    retryDelay = Math.min(retryDelay * 2, 30000)
    retry = setTimeout(() => { retry = undefined; void connect() }, delay)
  }
  const scheduleHeartbeat = (current: WebSocket) => {
    clearTimeout(heartbeat)
    heartbeat = setTimeout(() => {
      if (socket !== current) return
      try {
        deadline = setTimeout(recover, 10000)
        current.send(JSON.stringify({ type: 'ping' }))
      } catch { recover() }
    }, 25000)
  }
  const connect = async () => {
    if (!active || socket || connecting) return
    connecting = true
    const connectingVersion = ++version
    // Covers both a stalled ticket request and a socket that never sends its snapshot.
    deadline = setTimeout(recover, 10000)
    try {
      const response = await browserWorkflowApi.createExecutionSocketTicket(executionId, { suppressErrorMessage: true })
      if (!active || version !== connectingVersion) return
      const ticket = String(response?.data?.ticket || '')
      if (!ticket) throw new Error('Missing execution socket ticket')
      const current = new WebSocket(browserWorkflowApi.executionSocketUrl(executionId, ticket))
      socket = current
      connecting = false
      lastResponseAt = Date.now()
      current.onmessage = event => {
        if (socket !== current) return
        let payload: any
        try { payload = JSON.parse(String(event.data)) } catch { return }
        if (!payload || typeof payload !== 'object') return
        lastResponseAt = Date.now()
        if (payload.type === 'execution_snapshot' || payload.type === 'pong') {
          clearTimeout(deadline)
          deadline = undefined
          scheduleHeartbeat(current)
          if (payload.type === 'pong') return
          retryDelay = 3000
          warned = false
        }
        // Reconnect receives the current snapshot from the server; no HTTP polling.
        void Promise.resolve().then(() => {
          if (active && socket === current) return onEvent(payload)
        }).catch(error => {
          if (socket !== current) return
          console.warn('处理执行日志失败:', error)
          recover()
        })
      }
      current.onclose = event => {
        if (socket !== current) return
        if ([4401, 4403, 4404].includes(event.code)) { stop(); warn() }
        else recover()
      }
      current.onerror = () => { if (socket === current) recover() }
    } catch (error: any) {
      if (!active || version !== connectingVersion) return
      if ([401, 403, 404, 410].includes(error?.response?.status)) { stop(); warn() }
      else recover()
    }
  }
  const resume = () => {
    if (!active) return
    if (socket && Date.now() - lastResponseAt > 35000) recover()
    else if (!socket && !connecting) {
      clearTimeout(retry)
      retry = undefined
      void connect()
    }
  }
  const onVisibility = () => { if (document.visibilityState !== 'hidden') resume() }
  const start = () => {
    if (active) return
    active = true
    window.addEventListener('online', resume)
    document.addEventListener('visibilitychange', onVisibility)
    void connect()
  }
  const stop = () => {
    active = false
    clearTimeout(retry)
    retry = undefined
    retire()
    window.removeEventListener('online', resume)
    document.removeEventListener('visibilitychange', onVisibility)
  }
  return { start, stop }
}
