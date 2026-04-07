<template>
  <div class="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
    <Transition name="floating-panel">
      <div
        v-if="visible"
        class="flex h-[min(78vh,760px)] w-[min(420px,calc(100vw-1rem))] flex-col overflow-hidden rounded-[28px] border border-primary-100 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
      >
        <div class="border-b border-primary-200 bg-gradient-to-r from-primary-800 via-primary-700 to-primary-500 px-4 py-3 text-white">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-sm font-semibold">全站聊天室</p>
              <p class="mt-1 text-xs text-primary-50/90">登录用户可实时聊天交流。</p>
            </div>
            <div class="flex items-center gap-3">
              <div class="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                {{ onlineCount }} 在线
              </div>
              <button
                class="rounded-lg p-2 text-primary-100 transition-colors hover:bg-white/10 hover:text-white"
                @click="visible = false"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div class="mt-3 flex items-center gap-2 text-xs text-primary-50/90">
            <span class="inline-block h-2 w-2 rounded-full" :class="statusDotClass"></span>
            <span>{{ statusText }}</span>
          </div>
        </div>

        <div
          ref="messageContainerRef"
          class="min-h-0 flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-primary-50 via-white to-gray-50 px-4 py-4"
          @scroll="handleMessageScroll"
        >
          <div
            v-if="loadingMoreHistory"
            class="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-center text-sm text-gray-500"
          >
            正在加载更早聊天记录...
          </div>

          <div
            v-else-if="hasMoreHistory && messages.length > 0"
            class="text-center text-xs text-gray-400"
          >
            上滑加载更早消息
          </div>

          <div
            v-if="!userStore.isAuthenticated"
            class="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm leading-6 text-yellow-800"
          >
            未登录也能查看聊天记录，登录后才可以参与发言。
          </div>

          <div v-if="loadingHistory" class="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">
            聊天记录加载中...
          </div>

          <div
            v-for="item in messages"
            :key="item.id"
            class="flex w-full"
            :class="isSelf(item) ? 'justify-end' : 'justify-start'"
          >
            <div
              class="flex max-w-[88%] items-end gap-3"
              :class="isSelf(item) ? 'flex-row-reverse' : ''"
            >
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold shadow-sm"
                :class="isSelf(item) ? 'bg-primary-600 text-white' : getOtherAvatarClass(item)"
              >
                {{ item.user.avatar_text }}
              </div>

              <div
                class="flex min-w-0 flex-col"
                :class="isSelf(item) ? 'items-end' : 'items-start'"
              >
                <div
                  class="mb-1 flex items-center gap-2 text-xs text-gray-400"
                  :class="isSelf(item) ? 'justify-end' : 'justify-start'"
                >
                  <span class="font-medium text-gray-700">{{ item.user.display_name }}</span>
                  <span
                  v-if="item.user.is_admin"
                  class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                  >
                    管理员
                  </span>
                  <span>{{ formatTime(item.created_at_ms) }}</span>
                </div>

                <div
                  class="max-w-full rounded-[22px] px-4 py-3 text-sm leading-6 shadow-sm"
                  :class="isSelf(item)
                    ? 'rounded-br-md bg-primary-600 text-white'
                    : getOtherBubbleClass(item)"
                >
                  <p class="whitespace-pre-wrap break-words text-left">{{ item.content }}</p>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="!loadingHistory && messages.length === 0"
            class="rounded-2xl border border-dashed border-gray-300 bg-white/70 px-4 py-6 text-center text-sm text-gray-500"
          >
            还没人发言，你可以先打个招呼。
          </div>
        </div>

        <div class="border-t border-gray-200 px-4 py-4">
          <div class="flex items-end gap-3 rounded-2xl border border-primary-100 bg-white px-3 py-3 shadow-sm">
            <textarea
              v-model="draft"
              rows="1"
              class="min-h-[24px] min-w-0 flex-1 resize-none border-0 bg-transparent p-0 text-sm text-gray-800 outline-none focus:ring-0 placeholder:text-gray-400"
              :disabled="!canSend"
              :placeholder="userStore.isAuthenticated ? 'Enter 发送，Shift+Enter 换行' : '登录后参与聊天'"
              @keydown.enter.exact.prevent="submitMessage"
            />
            <button
              v-if="userStore.isAuthenticated"
              class="min-w-[72px] shrink-0 whitespace-nowrap rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
              :class="{ 'cursor-not-allowed opacity-60': !canSubmit }"
              :disabled="!canSubmit"
              @click="submitMessage"
            >
              发送
            </button>
            <button
              v-else
              class="min-w-[72px] shrink-0 whitespace-nowrap rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
              @click="goToLogin"
            >
              去登录
            </button>
          </div>
          <div v-if="!userStore.isAuthenticated" class="mt-3 flex justify-end">
            <button
              class="rounded-xl border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100"
              @click="goToLogin"
            >
              去登录
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <button
      v-if="!visible"
      type="button"
      class="group relative flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-white shadow-[0_18px_40px_rgba(37,99,235,0.32)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-700"
      @click="toggleVisible"
    >
      <span
        v-if="unreadCount > 0"
        class="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white/85 opacity-90"
      ></span>
      <svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.8"
          d="M8 10h.01M12 10h.01M16 10h.01M5 17l-1 4 4-1h10a3 3 0 003-3V7a3 3 0 00-3-3H6a3 3 0 00-3 3v10a3 3 0 002 2z"
        />
      </svg>
      <div class="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {{ visible ? '收起全站聊天室' : '打开全站聊天室' }}
        <div class="absolute left-full top-1/2 h-0 w-0 -translate-y-1/2 border-b-4 border-l-4 border-t-4 border-b-transparent border-l-gray-900 border-t-transparent"></div>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { io, type Socket } from 'socket.io-client'

import api, { getApiBaseURL } from '@/services/api'
import { useUserStore } from '@/stores/user'
import { showMessage } from '@/utils/message'

type LiveChatUser = {
  id: number
  display_name: string
  email: string
  is_admin: boolean
  avatar_text: string
}

type LiveChatMessage = {
  id: number
  content: string
  created_at_ms: number
  user: LiveChatUser
}

type SocketPayload =
  | { type: 'connected'; online_count?: number }
  | { type: 'online_count'; online_count?: number }
  | { type: 'message'; message?: LiveChatMessage; online_count?: number }
  | { type: 'error'; message?: string }
  | { type: 'pong' }

const router = useRouter()
const userStore = useUserStore()

const visible = ref(false)
const draft = ref('')
const messages = ref<LiveChatMessage[]>([])
const loadingHistory = ref(false)
const loadingMoreHistory = ref(false)
const onlineCount = ref(0)
const unreadCount = ref(0)
const connectionStatus = ref<'idle' | 'connecting' | 'connected' | 'error'>('idle')
const messageContainerRef = ref<HTMLElement | null>(null)
const hasMoreHistory = ref(false)

let socket: Socket | null = null
let historyLoaded = false
let manualClose = false
let socketConnecting = false
let historyRequest: Promise<void> | null = null
let historyCursor = 0
let summaryRequest: Promise<void> | null = null
const SOCKET_IO_PATH = '/mail-api/v1/live-chat/socket.io'

const selfUserId = computed(() => Number(userStore.user?.id || 0))
const canSend = computed(() => userStore.isAuthenticated && connectionStatus.value === 'connected')
const canSubmit = computed(() => canSend.value && Boolean(draft.value.trim()))

const statusText = computed(() => {
  if (!userStore.isAuthenticated) return '登录后可加入'
  if (connectionStatus.value === 'connected') return '实时连接中'
  if (connectionStatus.value === 'connecting') return '连接中...'
  if (connectionStatus.value === 'error') return '连接异常，重试中'
  return '准备连接'
})

const statusDotClass = computed(() => {
  if (!userStore.isAuthenticated) return 'bg-yellow-300'
  if (connectionStatus.value === 'connected') return 'bg-emerald-300'
  if (connectionStatus.value === 'connecting') return 'bg-yellow-300'
  if (connectionStatus.value === 'error') return 'bg-red-300'
  return 'bg-primary-200'
})

const isSelf = (item: LiveChatMessage) => item.user.id === selfUserId.value

const OTHER_AVATAR_STYLES = [
  'border border-sky-200 bg-sky-50 text-sky-700',
  'border border-violet-200 bg-violet-50 text-violet-700',
  'border border-amber-200 bg-amber-50 text-amber-700',
  'border border-emerald-200 bg-emerald-50 text-emerald-700',
  'border border-rose-200 bg-rose-50 text-rose-700',
  'border border-cyan-200 bg-cyan-50 text-cyan-700'
]

const OTHER_BUBBLE_STYLES = [
  'rounded-bl-md bg-sky-50 text-slate-800 ring-1 ring-sky-100',
  'rounded-bl-md bg-violet-50 text-slate-800 ring-1 ring-violet-100',
  'rounded-bl-md bg-amber-50 text-slate-800 ring-1 ring-amber-100',
  'rounded-bl-md bg-emerald-50 text-slate-800 ring-1 ring-emerald-100',
  'rounded-bl-md bg-rose-50 text-slate-800 ring-1 ring-rose-100',
  'rounded-bl-md bg-cyan-50 text-slate-800 ring-1 ring-cyan-100'
]

const getOtherStyleIndex = (item: LiveChatMessage) => {
  const userId = Number(item.user?.id || 0)
  return Math.abs(userId) % OTHER_AVATAR_STYLES.length
}

const getOtherAvatarClass = (item: LiveChatMessage) => {
  return OTHER_AVATAR_STYLES[getOtherStyleIndex(item)]
}

const getOtherBubbleClass = (item: LiveChatMessage) => {
  return OTHER_BUBBLE_STYLES[getOtherStyleIndex(item)]
}

const getSocketServerURL = () => {
  const apiBaseURL = getApiBaseURL()
  if (apiBaseURL.startsWith('http://') || apiBaseURL.startsWith('https://')) {
    return apiBaseURL.replace(/\/mail-api\/v1$/, '')
  }
  return window.location.origin
}

const toggleVisible = async () => {
  visible.value = !visible.value
  if (visible.value) {
    await loadHistory(!historyLoaded)
    await scrollToBottom()
    if (userStore.isAuthenticated) {
      await markMessagesRead()
    } else {
      unreadCount.value = 0
    }
  }
}

const goToLogin = () => {
  router.push('/login')
}

const upsertMessage = (message: LiveChatMessage) => {
  const existingIndex = messages.value.findIndex((item) => item.id === message.id)
  if (existingIndex >= 0) {
    messages.value.splice(existingIndex, 1, message)
    return
  }
  messages.value.push(message)
  hasMoreHistory.value = hasMoreHistory.value || messages.value.length >= 60
}

const scrollToBottom = async () => {
  await nextTick()
  const element = messageContainerRef.value
  if (!element) return
  element.scrollTop = element.scrollHeight
}

const loadSummary = async () => {
  if (summaryRequest) return summaryRequest

  summaryRequest = (async () => {
    try {
      const response: any = await api.get('/live-chat/summary', {
        suppressErrorMessage: true
      })
      if (response.code === 0) {
        onlineCount.value = Number(response.data?.online_count || 0)
        unreadCount.value = userStore.isAuthenticated && !visible.value
          ? Number(response.data?.unread_count || 0)
          : 0
      }
    } catch (error) {
      console.error('加载聊天室摘要失败:', error)
    } finally {
      summaryRequest = null
    }
  })()

  return summaryRequest
}

const markMessagesRead = async (messageId?: number) => {
  if (!userStore.isAuthenticated) return

  const lastMessageId = Number(messageId || messages.value[messages.value.length - 1]?.id || 0)
  if (lastMessageId <= 0) {
    unreadCount.value = 0
    return
  }

  try {
    await api.post(
      '/live-chat/read',
      { last_read_message_id: lastMessageId },
      { suppressErrorMessage: true }
    )
  } catch {}

  unreadCount.value = 0
}

const cleanupSocket = () => {
  if (socket) {
    const currentSocket = socket
    socket = null
    manualClose = true
    currentSocket.removeAllListeners()
    currentSocket.disconnect()
  }
  socketConnecting = false
  connectionStatus.value = 'idle'
}

const loadHistory = async (force = false) => {
  if (historyLoaded && !force) return
  if (historyRequest && !force) return historyRequest

  historyRequest = (async () => {
    loadingHistory.value = true
    try {
      const response: any = await api.get('/live-chat/messages', {
        params: { limit: 60 },
        suppressErrorMessage: true
      })
      if (response.code === 0) {
        messages.value = Array.isArray(response.data?.items) ? response.data.items : []
        historyCursor = Number(response.data?.next_before_message_id || messages.value[0]?.id || 0)
        hasMoreHistory.value = Boolean(response.data?.has_more)
        onlineCount.value = Number(response.data?.online_count || 0)
        unreadCount.value = userStore.isAuthenticated && !visible.value
          ? Number(response.data?.unread_count || 0)
          : 0
        historyLoaded = true
      }
    } catch (error) {
      console.error('加载聊天室历史失败:', error)
    } finally {
      loadingHistory.value = false
      historyRequest = null
    }
  })()

  return historyRequest
}

const loadOlderHistory = async () => {
  if (loadingMoreHistory.value || loadingHistory.value || !hasMoreHistory.value) return
  const beforeMessageId = Number(historyCursor || messages.value[0]?.id || 0)
  if (beforeMessageId <= 0) return

  const element = messageContainerRef.value
  const previousScrollHeight = element?.scrollHeight || 0
  const previousScrollTop = element?.scrollTop || 0

  loadingMoreHistory.value = true
  try {
    const response: any = await api.get('/live-chat/messages', {
      params: {
        limit: 60,
        before_message_id: beforeMessageId
      },
      suppressErrorMessage: true
    })
    if (response.code === 0) {
      const olderItems = Array.isArray(response.data?.items) ? response.data.items : []
      if (olderItems.length > 0) {
        const existingIds = new Set(messages.value.map((item) => item.id))
        const mergedItems = olderItems.filter((item: LiveChatMessage) => !existingIds.has(item.id))
        messages.value = [...mergedItems, ...messages.value]
      }
      historyCursor = Number(response.data?.next_before_message_id || messages.value[0]?.id || 0)
      hasMoreHistory.value = Boolean(response.data?.has_more)

      await nextTick()
      if (element) {
        const nextScrollHeight = element.scrollHeight
        element.scrollTop = nextScrollHeight - previousScrollHeight + previousScrollTop
      }
    }
  } finally {
    loadingMoreHistory.value = false
  }
}

const handleMessageScroll = () => {
  const element = messageContainerRef.value
  if (!element || !visible.value) return
  if (element.scrollTop <= 60) {
    void loadOlderHistory()
  }
}

const handleSocketPayload = async (payload: SocketPayload) => {
  if (typeof payload.online_count === 'number') {
    onlineCount.value = payload.online_count
  }

  if (payload.type === 'message' && payload.message) {
    upsertMessage(payload.message)
    if (visible.value) {
      await scrollToBottom()
      if (userStore.isAuthenticated) {
        await markMessagesRead(payload.message.id)
      }
    } else if (payload.message.user.id !== selfUserId.value) {
      unreadCount.value += 1
    }
    return
  }

  if (payload.type === 'error' && payload.message) {
    showMessage(payload.message, 'error')
  }
}

const connectSocket = async () => {
  if (socketConnecting) return
  if (socket && socket.connected) return

  const token = localStorage.getItem('token')
  socketConnecting = true

  cleanupSocket()
  manualClose = false
  connectionStatus.value = 'connecting'

  const nextSocket = io(getSocketServerURL(), {
    path: SOCKET_IO_PATH,
    transports: ['websocket'],
    auth: token ? { token } : {},
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 5000,
    timeout: 8000
  })
  socket = nextSocket

  nextSocket.on('connect', () => {
    socketConnecting = false
    connectionStatus.value = 'connected'
  })

  nextSocket.on('chat_event', (payload: SocketPayload) => {
    void handleSocketPayload(payload)
  })

  nextSocket.on('connect_error', (error: any) => {
    socketConnecting = false
    connectionStatus.value = 'error'
    console.error('Socket.IO 连接失败:', error)
  })

  nextSocket.on('disconnect', () => {
    socketConnecting = false
    if (socket === nextSocket) {
      socket = null
    }
    if (manualClose) {
      manualClose = false
      return
    }
    connectionStatus.value = 'error'
  })
}

const submitMessage = () => {
  const content = draft.value.trim()
  if (!content) return

  if (!userStore.isAuthenticated) {
    showMessage('请先登录后再发言', 'warning')
    return
  }

  if (!socket || !socket.connected) {
    showMessage('聊天室连接中，请稍后再试', 'warning')
    void connectSocket()
    return
  }

  socket.emit('chat_event', { type: 'message', content })
  draft.value = ''
}

const formatTime = (timestamp: number) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()

  const sameYear = date.getFullYear() === now.getFullYear()
  const sameMonth = date.getMonth() === now.getMonth()
  const sameDay = date.getDate() === now.getDate()

  if (sameYear && sameMonth && sameDay) {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()

  const timePart = date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })

  if (isYesterday) {
    return `昨天 ${timePart}`
  }

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}-${day} ${timePart}`
}

watch(
  () => userStore.isAuthenticated,
  (isAuthenticated, previousValue) => {
    if (isAuthenticated === previousValue && historyLoaded) return
    cleanupSocket()
    historyLoaded = false
    historyRequest = null
    summaryRequest = null
    historyCursor = 0
    hasMoreHistory.value = false
    unreadCount.value = 0
    if (visible.value) {
      void loadHistory(true)
    } else {
      void loadSummary()
    }
    void connectSocket()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  cleanupSocket()
})
</script>

<style scoped>
.floating-panel-enter-active,
.floating-panel-leave-active {
  transition: all 0.24s ease;
}

.floating-panel-enter-from,
.floating-panel-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
</style>
