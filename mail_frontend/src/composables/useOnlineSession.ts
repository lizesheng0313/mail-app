import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { monitoringAPI } from '@/api/monitoring'
import { useUserStore } from '@/stores/user'
import { onOnlineSessionSocketReady, sendOnlineSessionHeartbeat } from '@/services/onlineSessionTransport'
import {
  getBrowserInstanceId,
  getClientPlatform,
  getDeviceType,
  getTabSessionId
} from '@/services/sessionIdentity'

const AUTH_SYNC_CHANNEL = 'auth-session-sync'
const AUTH_SYNC_STORAGE_KEY = '__auth_session_sync__'
const HEARTBEAT_INTERVAL_MS = 30000

type AuthSyncMessage = {
  type: 'auth-switch'
  browser_instance_id: string
  tab_session_id: string
  user_id: number
  ts: number
}

export function useOnlineSession() {
  const route = useRoute()
  const userStore = useUserStore()
  const browserInstanceId = getBrowserInstanceId()
  const tabSessionId = getTabSessionId()
  const clientPlatform = getClientPlatform()
  const deviceType = getDeviceType()
  const userAgent = navigator.userAgent

  let heartbeatTimer: number | null = null
  let currentUserId: number | null = null
  let channel: BroadcastChannel | null = null
  let stopSocketReadyListener: (() => void) | null = null
  let heartbeatRequest: Promise<void> | null = null
  let sessionVersion = 0
  let pageLeaving = false

  const buildPayload = (userId?: number | null) => ({
    session_id: tabSessionId,
    browser_instance_id: browserInstanceId,
    page_path: route.fullPath || route.path || '/',
    client_platform: clientPlatform,
    device_type: deviceType,
    user_agent: userAgent,
    user_id: userId ?? currentUserId ?? undefined
  })

  const postSyncMessage = (message: AuthSyncMessage) => {
    if (channel) {
      channel.postMessage(message)
      return
    }
    localStorage.setItem(AUTH_SYNC_STORAGE_KEY, JSON.stringify(message))
  }

  const leaveWithBeacon = (userId?: number | null) => {
    const ok = monitoringAPI.sendLeaveBeacon(buildPayload(userId))
    return ok
  }

  const clearHeartbeat = () => {
    if (heartbeatTimer) {
      window.clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  const refreshOnlineSession = () => {
    if (!currentUserId || pageLeaving) return Promise.resolve()
    if (heartbeatRequest) return heartbeatRequest
    const payload = buildPayload(currentUserId)
    const request = (async () => {
      try {
        await sendOnlineSessionHeartbeat(payload)
      } catch (error) {
        console.error('在线心跳失败:', error)
      }
    })().finally(() => {
      if (heartbeatRequest === request) heartbeatRequest = null
    })
    heartbeatRequest = request
    return request
  }

  const startHeartbeat = () => {
    clearHeartbeat()
    heartbeatTimer = window.setInterval(() => {
      void refreshOnlineSession()
    }, HEARTBEAT_INTERVAL_MS)
  }

  const enterSession = async (userId: number) => {
    currentUserId = userId
    const version = ++sessionVersion
    postSyncMessage({
      type: 'auth-switch',
      browser_instance_id: browserInstanceId,
      tab_session_id: tabSessionId,
      user_id: userId,
      ts: Date.now()
    })
    await refreshOnlineSession()
    if (currentUserId === userId && sessionVersion === version && !pageLeaving) startHeartbeat()
  }

  const leaveSession = async (userId?: number | null) => {
    clearHeartbeat()
    const targetUserId = userId ?? currentUserId
    currentUserId = null
    sessionVersion += 1
    if (!targetUserId) return
    // 先等正在进行的上报结束，避免旧心跳在退出后把会话重新标为在线。
    await heartbeatRequest
    if (currentUserId === targetUserId) return
    try {
      await monitoringAPI.leaveOnlineSession(buildPayload(targetUserId))
    } catch (error) {
      console.error('离开在线会话失败:', error)
    }
  }

  const forceLogoutByAuthSwitch = async (nextUserId: number) => {
    if (!currentUserId || currentUserId === nextUserId) return
    await leaveSession(currentUserId)
    userStore.logout()
  }

  const handleSyncMessage = async (message?: AuthSyncMessage) => {
    if (!message || message.type !== 'auth-switch') return
    if (message.browser_instance_id !== browserInstanceId) return
    if (message.tab_session_id === tabSessionId) return
    await forceLogoutByAuthSwitch(message.user_id)
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== AUTH_SYNC_STORAGE_KEY || !event.newValue) return
    try {
      const message = JSON.parse(event.newValue) as AuthSyncMessage
      void handleSyncMessage(message)
    } catch (error) {
      console.error('解析认证同步消息失败:', error)
    }
  }

  const handlePageHide = () => {
    if (!currentUserId || pageLeaving) return
    pageLeaving = true
    clearHeartbeat()
    leaveWithBeacon(currentUserId)
  }

  const handlePageShow = () => {
    if (!pageLeaving) return
    pageLeaving = false
    if (!currentUserId) return
    void refreshOnlineSession()
    startHeartbeat()
  }

  onMounted(() => {
    stopSocketReadyListener = onOnlineSessionSocketReady(() => { void refreshOnlineSession() })
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(AUTH_SYNC_CHANNEL)
      channel.onmessage = (event) => {
        void handleSyncMessage(event.data as AuthSyncMessage)
      }
    } else {
      window.addEventListener('storage', handleStorage)
    }

    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('pageshow', handlePageShow)
  })

  onBeforeUnmount(() => {
    pageLeaving = true
    clearHeartbeat()
    stopSocketReadyListener?.()
    channel?.close()
    channel = null
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener('pagehide', handlePageHide)
    window.removeEventListener('pageshow', handlePageShow)
  })

  watch(
    () => route.fullPath,
    () => { void refreshOnlineSession() }
  )

  watch(
    () => [userStore.isAuthenticated, userStore.user?.id] as const,
    async ([isAuthenticated, userId]) => {
      if (isAuthenticated && userId) {
        if (currentUserId === userId) {
          return
        }
        if (currentUserId && currentUserId !== userId) {
          await leaveSession(currentUserId)
        }
        if (!userStore.isAuthenticated || userStore.user?.id !== userId) return
        await enterSession(userId)
        return
      }

      if (!isAuthenticated && currentUserId) {
        await leaveSession(currentUserId)
      }
    },
    { immediate: true }
  )

  return {
    leaveWithBeacon
  }
}
