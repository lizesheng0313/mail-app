import { isTauri } from '@/services/api'

export const openExternalAuthUrl = async (url: string) => {
  if (!url) return

  if (isTauri()) {
    try {
      const { open } = await import('@tauri-apps/plugin-shell')
      await open(url)
      return
    } catch (error) {
      console.error('[Auth] 打开系统浏览器失败，回退到新窗口:', error)
      window.open(url, '_blank')
      return
    }
  }

  window.location.href = url
}
