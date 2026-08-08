import { getApiBaseURL, isTauri } from '@/services/api'
import { connectBrowserWorkflowDesktopBridge, disconnectBrowserWorkflowDesktopBridge } from '@/services/browserWorkflowDesktopBridge'

const invokeTauri = async () => {
  if (!isTauri()) return null
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke
}

function getBrowserProfileId() {
  const userId = String(localStorage.getItem('userId') || '').trim()
  if (/^[0-9]+$/.test(userId)) return `user-${userId}`
  const token = String(localStorage.getItem('token') || '')
  try {
    const payload = token.split('.')[1]
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')))
    const tokenUserId = String(decoded.user_id || decoded.userId || decoded.sub || '').trim()
    if (/^[0-9]+$/.test(tokenUserId)) return `user-${tokenUserId}`
  } catch { /* use a stable token fingerprint when the token is not a JWT */ }
  let hash = 2166136261
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `user-${(hash >>> 0).toString(16)}`
}

function usesLocalBrowserAgent() {
  const baseURL = String(getApiBaseURL() || '')
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(baseURL)
}

async function requestBrowserRuntimeApproval(requestApproval, request) {
  if (typeof requestApproval !== 'function') return false
  return Boolean(await requestApproval(request))
}

async function runBrowserRuntimeOperation(operation, requestApproval, request) {
  while (true) {
    try {
      return await operation()
    } catch (error) {
      const retry = await requestBrowserRuntimeApproval(requestApproval, {
        ...request,
        action: 'retry',
        errorMessage: String(error?.message || error || '浏览器组件操作失败'),
      })
      if (!retry) throw error
    }
  }
}

// This guard is intentionally used only by browser-workflow actions.
export async function ensureBrowserWorkflowRuntime({ onProgress, requestApproval } = {}) {
  if (!isTauri()) {
    return {
      ready: false,
      desktopRequired: true,
      message: '浏览器工作流只能在桌面端执行，请使用肥猫猫桌面端',
    }
  }
  const invoke = await invokeTauri()
  if (!invoke) throw new Error('桌面端浏览器组件接口不可用')
  let status = await invoke('browser_workflow_component_status')
  if (status.installed && status.update_available) {
    const current = status.version || '当前版本'
    const latest = status.latest_version || '新版本'
    const shouldUpdate = await requestBrowserRuntimeApproval(requestApproval, {
      action: 'update',
      currentVersion: current,
      latestVersion: latest,
    })
    if (shouldUpdate) {
      if (status.running) status = await invoke('stop_browser_workflow_component')
      onProgress?.({ stage: 'downloading', downloaded: 0, total: null, message: `准备更新浏览器组件到 ${latest}` })
      status = await runBrowserRuntimeOperation(
        () => invoke('install_browser_workflow_component'),
        requestApproval,
        { operation: 'update', currentVersion: current, latestVersion: latest },
      )
    }
  }
  if (!status.installed) {
    const shouldInstall = await requestBrowserRuntimeApproval(requestApproval, { action: 'install' })
    if (!shouldInstall) return { ready: false, cancelled: true }
    onProgress?.({ stage: 'downloading', downloaded: 0, total: null, message: '准备下载浏览器组件' })
    try {
      status = await runBrowserRuntimeOperation(
        () => invoke('install_browser_workflow_component'),
        requestApproval,
        { operation: 'install' },
      )
    } catch (error) {
      if (String(error?.message || error).includes('取消')) return { ready: false, cancelled: true }
      throw error
    }
  }
  if (!status.running) {
    onProgress?.({ stage: 'starting', downloaded: 0, total: null, message: '正在启动浏览器组件' })
    status = await runBrowserRuntimeOperation(
      () => invoke('start_browser_workflow_component'),
      requestApproval,
      { operation: 'start' },
    )
  }
  onProgress?.({ stage: 'connecting', downloaded: 0, total: null, message: '正在连接本机 FMMBrowser' })
  const profileId = getBrowserProfileId()
  const connection = await invoke('launch_browser_workflow_browser', {
    profileId,
  })
  // 本地桌面端和本地后端在同一台机器上，直接连本机 Browser Agent。
  // 只有线上后端才需要走云端桌面浏览器隧道；本地也走隧道会让
  // FMMBrowser 的 CDP 连接绕一圈，容易在后端接管前被关闭。
  if (usesLocalBrowserAgent()) {
    await disconnectBrowserWorkflowDesktopBridge()
    return {
      ready: true,
      status,
      mode: 'desktop_local',
      desktopOptions: {
        browser_transport: 'local_agent',
        fingerprint_options: { profile_id: profileId },
      },
    }
  }
  const desktopOptions = await connectBrowserWorkflowDesktopBridge({
    webSocketDebuggerUrl: connection.webSocketDebuggerUrl,
  })
  return { ready: true, status, mode: 'desktop', desktopOptions }
}

export { disconnectBrowserWorkflowDesktopBridge }

export async function cancelBrowserWorkflowRuntimeDownload() {
  const invoke = await invokeTauri()
  if (invoke) await invoke('cancel_browser_workflow_component_download')
}

export async function listenBrowserWorkflowRuntimeProgress(callback) {
  if (!isTauri()) return () => {}
  const { listen } = await import('@tauri-apps/api/event')
  return listen('browser-workflow-component-progress', (event) => callback(event.payload))
}
