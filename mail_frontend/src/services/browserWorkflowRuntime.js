import { isTauri } from '@/services/api'

const invokeTauri = async () => {
  if (!isTauri()) return null
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke
}

// This guard is intentionally used only by browser-workflow actions.
export async function ensureBrowserWorkflowRuntime({ onProgress } = {}) {
  if (!isTauri()) return { ready: true, mode: 'web' }
  const invoke = await invokeTauri()
  if (!invoke) throw new Error('桌面端浏览器组件接口不可用')
  let status = await invoke('browser_workflow_component_status')
  if (status.installed && status.update_available) {
    const current = status.version || '当前版本'
    const latest = status.latest_version || '新版本'
    const shouldUpdate = window.confirm(`浏览器组件有新版本（${current} → ${latest}）。现在更新吗？\n选择取消可继续使用当前版本。`)
    if (shouldUpdate) {
      if (status.running) status = await invoke('stop_browser_workflow_component')
      onProgress?.({ stage: 'downloading', downloaded: 0, total: null, message: `准备更新浏览器组件到 ${latest}` })
      status = await invoke('install_browser_workflow_component')
    } else if (status.running) {
      return { ready: true, status, mode: 'reused' }
    }
  }
  if (status.running) return { ready: true, status, mode: 'reused' }
  if (!status.installed) {
    const shouldInstall = window.confirm('浏览器工作流需要安装独立浏览器组件。现在下载吗？')
    if (!shouldInstall) return { ready: false, cancelled: true }
    onProgress?.({ stage: 'downloading', downloaded: 0, total: null, message: '准备下载浏览器组件' })
    try {
      status = await invoke('install_browser_workflow_component')
    } catch (error) {
      if (String(error?.message || error).includes('取消')) return { ready: false, cancelled: true }
      throw error
    }
  }
  if (!status.running) {
    const shouldStart = window.confirm('浏览器组件已安装但尚未启动。现在启动并继续本次工作流吗？')
    if (!shouldStart) return { ready: false, cancelled: true }
    status = await invoke('start_browser_workflow_component')
  }
  return { ready: true, status, mode: 'started' }
}

export async function cancelBrowserWorkflowRuntimeDownload() {
  const invoke = await invokeTauri()
  if (invoke) await invoke('cancel_browser_workflow_component_download')
}

export async function listenBrowserWorkflowRuntimeProgress(callback) {
  if (!isTauri()) return () => {}
  const { listen } = await import('@tauri-apps/api/event')
  return listen('browser-workflow-component-progress', (event) => callback(event.payload))
}
