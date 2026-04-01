import { onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { monitoringAPI } from '@/api/monitoring'
import { getClientPlatform, getTabSessionId } from '@/services/sessionIdentity'

/**
 * 页面访问统计组合式函数
 * 用于自动记录页面访问（PV/UV）
 */
export function usePageTracking() {
  const route = useRoute()
  const sessionId = getTabSessionId()
  const clientPlatform = getClientPlatform()
  
  // 记录页面访问
  const recordPageView = async (customPage?: string) => {
    try {
      const page = customPage || route.path
      const userAgent = navigator.userAgent
      await monitoringAPI.recordPageView({
        page,
        user_agent: userAgent,
        session_id: sessionId,
        client_platform: clientPlatform
      })
    } catch (error) {
      console.error('❌ 记录页面访问失败:', error)
    }
  }
  
  // 防抖计时器
  let debounceTimer: number | null = null
  
  // 防抖的页面访问记录
  const debouncedRecordPageView = (customPage?: string) => {
    if (debounceTimer) {
      window.clearTimeout(debounceTimer)
    }

    debounceTimer = window.setTimeout(() => {
      recordPageView(customPage)
    }, 1000) // 1秒防抖
  }
  
  // 页面加载时记录访问
  onMounted(() => {
    debouncedRecordPageView()
  })

  watch(
    () => route.fullPath,
    () => {
      debouncedRecordPageView()
    }
  )
  
  // 页面卸载时清理
  onUnmounted(() => {
    if (debounceTimer) {
      window.clearTimeout(debounceTimer)
    }
  })
  
  return {
    recordPageView: debouncedRecordPageView
  }
}
