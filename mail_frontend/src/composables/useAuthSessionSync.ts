import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { getBrowserInstanceId, getTabSessionId } from '@/services/sessionIdentity'

const AUTH_SYNC_CHANNEL = 'auth-session-sync'
const AUTH_SYNC_STORAGE_KEY = '__auth_session_sync__'
type AuthSyncMessage = {
  type: 'auth-switch'
  browser_instance_id: string
  tab_session_id: string
  user_id: number
  ts: number
}

/** Keep browser tabs on one login identity; no server presence reporting. */
export function useAuthSessionSync() {
  const userStore = useUserStore()
  const browserInstanceId = getBrowserInstanceId()
  const tabSessionId = getTabSessionId()
  let currentUserId = 0
  let channel: BroadcastChannel | null = null
  const postSyncMessage = (message: AuthSyncMessage) => {
    if (channel) {
      channel.postMessage(message)
      return
    }
    localStorage.setItem(AUTH_SYNC_STORAGE_KEY, JSON.stringify(message))
  }


  const handleSyncMessage = (message?: AuthSyncMessage) => {
    if (!message || message.type !== 'auth-switch'
      || message.browser_instance_id !== browserInstanceId
      || message.tab_session_id === tabSessionId) return
    if (currentUserId && currentUserId !== message.user_id) userStore.logout()
  }
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== AUTH_SYNC_STORAGE_KEY || !event.newValue) return
    try { handleSyncMessage(JSON.parse(event.newValue)) } catch { /* Ignore malformed cross-tab messages. */ }
  }
  onMounted(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(AUTH_SYNC_CHANNEL)
      channel.onmessage = event => handleSyncMessage(event.data)
    } else {
      window.addEventListener('storage', handleStorage)
    }
  })
  onBeforeUnmount(() => {
    channel?.close()
    window.removeEventListener('storage', handleStorage)
  })
  watch(() => [userStore.isAuthenticated, userStore.user?.id] as const, ([authenticated, id]) => {
    const nextUserId = authenticated ? Number(id || 0) : 0
    if (nextUserId === currentUserId) return
    currentUserId = nextUserId
    if (!currentUserId) return
    postSyncMessage({ type: 'auth-switch', browser_instance_id: browserInstanceId,
      tab_session_id: tabSessionId, user_id: currentUserId, ts: Date.now() })
  }, { immediate: true })
}
