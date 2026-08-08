import { beforeEach, describe, expect, it, vi } from 'vitest'

const { invoke, connectBrowserWorkflowDesktopBridge } = vi.hoisted(() => ({
  invoke: vi.fn(),
  connectBrowserWorkflowDesktopBridge: vi.fn(),
}))

vi.mock('@/services/api', () => ({
  isTauri: () => true,
}))

vi.mock('@tauri-apps/api/core', () => ({
  invoke,
}))

vi.mock('@/services/browserWorkflowDesktopBridge', () => ({
  connectBrowserWorkflowDesktopBridge,
  disconnectBrowserWorkflowDesktopBridge: vi.fn(),
}))

import { ensureBrowserWorkflowRuntime } from './browserWorkflowRuntime'

describe('browser workflow runtime prompts', () => {
  beforeEach(() => {
    invoke.mockReset()
    connectBrowserWorkflowDesktopBridge.mockReset()
    localStorage.setItem('token', 'test-token')
    connectBrowserWorkflowDesktopBridge.mockResolvedValue({
      browser_transport: 'desktop_agent',
      desktop_tunnel_id: 'tunnel-1',
    })
    invoke.mockImplementation(async (command) => {
      if (command === 'browser_workflow_component_status') {
        const statusCalls = invoke.mock.calls.filter(([name]) => name === command).length
        return statusCalls === 1
          ? { installed: false, running: false }
          : { installed: true, running: true }
      }
      if (command === 'install_browser_workflow_component') return { installed: true, running: false }
      if (command === 'start_browser_workflow_component') return { installed: true, running: true }
      if (command === 'launch_browser_workflow_browser') return { webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/browser/test' }
      throw new Error(`unexpected command: ${command}`)
    })
  })

  it('delegates install and start confirmation to the application dialog', async () => {
    const nativeConfirm = vi.spyOn(window, 'confirm')
    const requestApproval = vi.fn().mockResolvedValue(true)

    const result = await ensureBrowserWorkflowRuntime({ requestApproval })

    expect(result.ready).toBe(true)
    expect(nativeConfirm).not.toHaveBeenCalled()
    expect(requestApproval.mock.calls.map(([request]) => request.action)).toEqual(['install', 'start'])
    nativeConfirm.mockRestore()
  })

  it('asks the same dialog whether a failed component install should be retried', async () => {
    let installAttempts = 0
    invoke.mockImplementation(async (command) => {
      if (command === 'browser_workflow_component_status') {
        const statusCalls = invoke.mock.calls.filter(([name]) => name === command).length
        return statusCalls === 1
          ? { installed: false, running: false }
          : { installed: true, running: true }
      }
      if (command === 'install_browser_workflow_component') {
        installAttempts += 1
        if (installAttempts === 1) throw new Error('下载失败')
        return { installed: true, running: false }
      }
      if (command === 'start_browser_workflow_component') return { installed: true, running: true }
      if (command === 'launch_browser_workflow_browser') return { webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/browser/test' }
      throw new Error(`unexpected command: ${command}`)
    })
    const requestApproval = vi.fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)

    const result = await ensureBrowserWorkflowRuntime({ requestApproval })

    expect(result.ready).toBe(true)
    expect(installAttempts).toBe(2)
    expect(requestApproval.mock.calls.map(([request]) => request.action)).toEqual(['install', 'retry', 'start'])
    expect(requestApproval.mock.calls[1][0].errorMessage).toBe('下载失败')
  })
})
