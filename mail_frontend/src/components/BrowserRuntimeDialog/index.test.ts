import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import BrowserRuntimeDialog from './index.vue'

describe('BrowserRuntimeDialog', () => {
  it('uses the application dialog instead of the native confirm dialog', async () => {
    const nativeConfirm = vi.spyOn(window, 'confirm')
    const wrapper = mount(BrowserRuntimeDialog, {
      props: {
        visible: true,
        phase: 'confirm',
        title: '安装浏览器组件',
        description: '浏览器工作流需要安装独立浏览器组件。',
        confirmText: '立即安装',
        cancelText: '取消',
      },
    })

    expect(wrapper.text()).toContain('安装浏览器组件')
    expect(wrapper.text()).toContain('浏览器工作流需要安装独立浏览器组件。')
    expect(nativeConfirm).not.toHaveBeenCalled()

    await wrapper.get('[data-testid="browser-runtime-confirm"]').trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    nativeConfirm.mockRestore()
  })

  it('shows download progress and keeps cancellation in the same dialog', async () => {
    const wrapper = mount(BrowserRuntimeDialog, {
      props: {
        visible: true,
        phase: 'downloading',
        title: '安装浏览器组件',
        progress: 42,
        progressTotal: 100,
        progressMessage: '正在下载浏览器组件',
        cancelText: '取消本次操作',
      },
    })

    expect(wrapper.get('[data-testid="browser-runtime-progress"]').attributes('value')).toBe('42')
    expect(wrapper.text()).toContain('正在下载浏览器组件')

    await wrapper.get('[data-testid="browser-runtime-cancel"]').trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('shows the error state with a retry action', async () => {
    const wrapper = mount(BrowserRuntimeDialog, {
      props: {
        visible: true,
        phase: 'error',
        title: '浏览器组件操作失败',
        errorMessage: '下载失败，请重试',
        confirmText: '重试',
        cancelText: '取消',
      },
    })

    expect(wrapper.text()).toContain('下载失败，请重试')

    await wrapper.get('[data-testid="browser-runtime-confirm"]').trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })
})
