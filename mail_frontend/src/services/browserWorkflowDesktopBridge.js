import { buildWebSocketURL, isTauri } from '@/services/api'

let activeBridge = null

function createTunnelId() {
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replace(/-/g, '')
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
  return `bwt_${random}`
}

function waitForSocketOpen(socket, label) {
  if (socket.readyState === WebSocket.OPEN) return Promise.resolve()
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (callback, value) => {
      if (settled) return
      settled = true
      socket.removeEventListener('open', onOpen)
      socket.removeEventListener('error', onError)
      socket.removeEventListener('close', onClose)
      callback(value)
    }
    const onOpen = () => finish(resolve)
    const onError = () => finish(reject, new Error(`${label}连接失败`))
    const onClose = () => finish(reject, new Error(`${label}连接已关闭`))
    socket.addEventListener('open', onOpen)
    socket.addEventListener('error', onError)
    socket.addEventListener('close', onClose)
  })
}

function closeSocket(socket) {
  if (!socket || socket.readyState === WebSocket.CLOSED) return
  try { socket.close(1000, 'workflow finished') } catch { /* socket may already be gone */ }
}

export async function connectBrowserWorkflowDesktopBridge({ webSocketDebuggerUrl } = {}) {
  if (!isTauri()) throw new Error('浏览器工作流只能在桌面端执行，请使用肥猫猫桌面端')
  if (!webSocketDebuggerUrl) throw new Error('FMMBrowser 没有返回 CDP 连接地址')

  if (
    activeBridge?.webSocketDebuggerUrl === webSocketDebuggerUrl
    && activeBridge.remoteSocket.readyState === WebSocket.OPEN
    && activeBridge.browserSocket.readyState === WebSocket.OPEN
  ) {
    return activeBridge.options
  }

  await disconnectBrowserWorkflowDesktopBridge()
  const token = String(localStorage.getItem('token') || '').trim()
  if (!token) throw new Error('登录状态已失效，请重新登录桌面端')

  const tunnelId = createTunnelId()
  const remoteUrl = buildWebSocketURL(
    `/browser-workflow-desktop/tunnels/${encodeURIComponent(tunnelId)}/desktop?token=${encodeURIComponent(token)}`,
  )
  const remoteSocket = new WebSocket(remoteUrl)
  const browserSocket = new WebSocket(webSocketDebuggerUrl)
  try {
    await Promise.all([
      waitForSocketOpen(remoteSocket, '云端桌面浏览器隧道'),
      waitForSocketOpen(browserSocket, 'FMMBrowser CDP'),
    ])
  } catch (error) {
    closeSocket(remoteSocket)
    closeSocket(browserSocket)
    throw error
  }

  let closing = false
  const closeBoth = () => {
    if (closing) return
    closing = true
    closeSocket(remoteSocket)
    closeSocket(browserSocket)
    if (activeBridge?.tunnelId === tunnelId) activeBridge = null
  }
  browserSocket.addEventListener('message', (event) => {
    if (remoteSocket.readyState === WebSocket.OPEN) remoteSocket.send(event.data)
  })
  remoteSocket.addEventListener('message', (event) => {
    if (browserSocket.readyState === WebSocket.OPEN) browserSocket.send(event.data)
  })
  browserSocket.addEventListener('close', closeBoth)
  remoteSocket.addEventListener('close', closeBoth)
  browserSocket.addEventListener('error', closeBoth)
  remoteSocket.addEventListener('error', closeBoth)

  const options = { browser_transport: 'desktop_agent', desktop_tunnel_id: tunnelId }
  activeBridge = { tunnelId, remoteSocket, browserSocket, webSocketDebuggerUrl, options }
  return options
}

export async function disconnectBrowserWorkflowDesktopBridge() {
  const bridge = activeBridge
  activeBridge = null
  if (!bridge) return
  closeSocket(bridge.remoteSocket)
  closeSocket(bridge.browserSocket)
}
