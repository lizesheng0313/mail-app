<template>
  <div class="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
    <div v-if="visible" class="flex h-[min(76vh,680px)] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[24px] border border-primary-100 bg-white shadow-2xl">
      <div class="flex items-center justify-between bg-primary-700 px-4 py-4 text-white">
        <div>
          <p class="font-semibold">在线客服</p>
        </div>
        <button type="button" class="rounded-lg p-2 hover:bg-white/10" aria-label="关闭在线客服" @click="visible = false">✕</button>
      </div>
      <div ref="messageContainer" class="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gray-50 px-4 py-4">
        <p v-if="loading" class="text-center text-sm text-gray-400">正在加载会话...</p>
        <p v-else-if="!messages.length" class="rounded-2xl bg-white px-4 py-5 text-center text-sm leading-6 text-gray-500">
          有问题直接发给我们。回复会保存在当前浏览器，刷新后也能查看。
        </p>
        <div v-for="message in messages" :key="message.id" class="flex" :class="message.sender_type === 'guest' ? 'justify-end' : 'justify-start'">
          <div class="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-6 shadow-sm" :class="message.sender_type === 'guest' ? 'rounded-br-sm bg-primary-600 text-white' : 'rounded-bl-sm bg-white text-gray-800'">
            <p class="mb-0.5 text-[11px] opacity-70">{{ message.sender_type === 'guest' ? '我' : '客服' }}</p>
            <p class="whitespace-pre-wrap break-words">{{ message.content }}</p>
          </div>
        </div>
      </div>
      <p v-if="error" class="px-4 pt-2 text-xs text-red-600">{{ error }}</p>
      <div class="flex items-end gap-2 border-t border-gray-100 bg-white p-3">
        <textarea v-model="draft" rows="1" maxlength="2000" class="min-h-10 min-w-0 flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-400" placeholder="输入问题，Enter 发送" @keydown.enter.exact.prevent="sendMessage" />
        <button type="button" data-testid="guest-chat-send" class="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50" :disabled="sending || !draft.trim()" @click="sendMessage">发送</button>
      </div>
    </div>
    <button v-else type="button" class="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-white shadow-xl" aria-label="打开在线客服" @click="visible = true">
      <svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 10h.01M12 10h.01M16 10h.01M5 17l-1 4 4-1h10a3 3 0 003-3V7a3 3 0 00-3-3H6a3 3 0 00-3 3v10a3 3 0 002 2z" /></svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import api, { extractApiErrorMessage } from '@/services/api'
import { getGuestVisitorId } from '@/utils/guestIdentity'

type GuestMessage = { id: number; sender_type: 'guest' | 'admin'; content: string; created_at_ms: number }
const visible = ref(false)
const messages = ref<GuestMessage[]>([])
const draft = ref('')
const loading = ref(false)
const sending = ref(false)
const error = ref('')
const messageContainer = ref<HTMLElement | null>(null)
let timer: ReturnType<typeof setInterval> | undefined

async function loadMessages() {
  if (!visible.value) return
  try {
    const response: any = await api.get('/live-chat/guest/messages', {
      headers: { 'X-Guest-Chat-Token': getGuestVisitorId() },
      skipAuth: true,
      silentErrorMessage: true,
    } as any)
    if (response.code !== 0) throw new Error(response.message || '加载会话失败')
    messages.value = response.data?.items || []
    error.value = ''
    await nextTick()
    if (messageContainer.value) messageContainer.value.scrollTop = messageContainer.value.scrollHeight
  } catch (cause: any) {
    error.value = extractApiErrorMessage(cause?.response?.data, cause?.message || '加载会话失败')
  } finally {
    loading.value = false
  }
}

async function sendMessage() {
  const content = draft.value.trim()
  if (!content || sending.value) return
  sending.value = true
  error.value = ''
  try {
    const response: any = await api.post('/live-chat/guest/messages', { content }, {
      headers: { 'X-Guest-Chat-Token': getGuestVisitorId() },
      skipAuth: true,
      silentErrorMessage: true,
    } as any)
    if (response.code !== 0) throw new Error(response.message || '发送失败')
    draft.value = ''
    await loadMessages()
  } catch (cause: any) {
    error.value = extractApiErrorMessage(cause?.response?.data, cause?.message || '发送失败')
  } finally {
    sending.value = false
  }
}

watch(visible, isVisible => {
  if (timer) clearInterval(timer)
  if (isVisible) {
    loading.value = true
    void loadMessages()
    timer = setInterval(() => void loadMessages(), 3000)
  }
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>
