<template>
  <div class="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
    <Transition name="floating-panel">
      <div
        v-if="visible"
        class="flex h-[min(78vh,760px)] w-[min(384px,calc(100vw-1rem))] flex-col overflow-hidden rounded-[28px] border border-primary-100 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
      >
          <div class="flex items-center justify-between border-b border-primary-200 bg-gradient-to-r from-primary-800 via-primary-700 to-primary-500 px-4 py-3 text-white">
          <div>
            <p class="text-sm font-semibold">肥猫猫助手</p>
            <p class="mt-1 text-xs text-primary-50/90">直接说你的问题，我来帮你查。</p>
          </div>
          <div class="flex items-center gap-2">
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

        <div v-if="!userStore.isAuthenticated" class="space-y-4 px-4 py-5">
          <div class="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm leading-6 text-yellow-800">
            先登录后，肥猫猫助手才能查看和操作你自己的邮箱数据。
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium text-gray-900">你可以这样问</p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="item in quickPrompts"
                :key="item.label"
                class="rounded-full border border-gray-200 px-3 py-2 text-xs text-gray-600"
              >
                {{ item.label }}
              </span>
            </div>
          </div>
          <div class="flex justify-end">
            <button
              class="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
              @click="goToLogin"
            >
              去登录
            </button>
          </div>
        </div>

        <template v-else>
          <div
            ref="messageContainerRef"
            class="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-primary-50 via-white to-gray-50 px-4 py-4"
          >
            <div
              v-for="item in messages"
              :key="item.id"
              class="flex"
              :class="item.role === 'user' ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[86%] rounded-2xl px-3 py-2 text-sm leading-6 shadow-sm"
                :class="item.role === 'user' ? 'bg-primary-600 text-white' : 'bg-primary-50 text-gray-800 ring-1 ring-primary-100'"
              >
                <template v-if="item.loading">
                  <div class="flex items-center gap-2 py-1 text-sm">
                    <span class="font-medium tracking-[0.18em] opacity-80">Thinking</span>
                    <span class="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.2s]"></span>
                    <span class="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.1s]"></span>
                    <span class="h-2 w-2 animate-bounce rounded-full bg-current"></span>
                  </div>
                </template>
                <p v-else class="whitespace-pre-wrap">{{ item.content }}</p>

                <div v-if="item.needsConfirmation" class="mt-3">
                  <div
                    v-if="getConfirmationDetails(item).length"
                    class="mb-3 rounded-xl border border-primary-200 bg-white/80 px-3 py-3 text-xs text-gray-700"
                  >
                    <div
                      v-for="(detail, index) in getConfirmationDetails(item)"
                      :key="`${item.id}-${detail.label}-${index}`"
                      class="mb-2 last:mb-0"
                    >
                      <div class="mb-1 font-medium text-gray-900">{{ detail.label }}</div>
                      <div :class="detail.multiline ? 'whitespace-pre-wrap break-words text-gray-700' : 'break-all text-gray-700'">
                        {{ detail.value }}
                      </div>
                    </div>
                  </div>
                  <button
                    class="rounded-xl bg-primary-700 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-800"
                    @click="confirmAction(item)"
                  >
                    {{ getConfirmationLabel(item) }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="border-t border-gray-200 px-4 py-4">
            <div class="mb-3 flex flex-wrap gap-2">
              <button
                v-for="item in quickPrompts"
                :key="item.label"
                class="rounded-full border border-primary-100 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                @click="usePrompt(item.prompt)"
              >
                {{ item.label }}
              </button>
            </div>

            <div class="flex items-end gap-3 rounded-2xl border border-primary-100 bg-white px-3 py-3 shadow-sm">
              <textarea
                v-model="draft"
                rows="1"
                class="min-h-[24px] min-w-0 flex-1 resize-none border-0 bg-transparent p-0 text-sm text-gray-800 outline-none focus:ring-0 placeholder:text-gray-400"
                :disabled="sending"
                placeholder="Enter 发送，Shift+Enter 换行"
                @keydown.enter.exact.prevent="submitMessage()"
              />
              <button
                class="min-w-[72px] shrink-0 whitespace-nowrap rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
                :class="{ 'cursor-not-allowed opacity-60': sending || !draft.trim() }"
                :disabled="sending || !draft.trim()"
                @click="submitMessage()"
              >
                {{ sending ? '处理中...' : '发送' }}
              </button>
            </div>
          </div>
        </template>
      </div>
    </Transition>

    <button
      class="group inline-flex h-14 w-14 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,rgb(var(--color-primary-400))_0%,rgb(var(--color-primary-600))_46%,rgb(var(--color-primary-800))_100%)] text-white shadow-[0_14px_34px_rgba(21,128,61,0.36)] transition-all duration-300 hover:scale-105 hover:shadow-[0_18px_40px_rgba(21,128,61,0.44)]"
      @click="togglePanel"
    >
      <svg class="floating-cat h-8 w-8" viewBox="0 0 64 64" fill="none">
        <path
          d="M18 25L22 12L31 19H33L42 12L46 25C52 29 56 36 56 43C56 55 46.4 60 32 60C17.6 60 8 55 8 43C8 36 12 29 18 25Z"
          fill="white"
          fill-opacity="0.98"
        />
        <path d="M18 25L22 12L31 19" stroke="#0F172A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M46 25L42 12L33 19" stroke="#0F172A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        <path
          d="M18 25C12 29 8 36 8 43C8 55 17.6 60 32 60C46.4 60 56 55 56 43C56 36 52 29 46 25"
          stroke="#0F172A"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <ellipse class="cat-eye" cx="24" cy="37" rx="2.7" ry="4" fill="#0F172A" />
        <ellipse class="cat-eye" cx="40" cy="37" rx="2.7" ry="4" fill="#0F172A" />
        <path d="M29 45L32 48L35 45" stroke="#0F172A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M32 41V45" stroke="#0F172A" stroke-width="2.2" stroke-linecap="round" />
        <path d="M20 43L12 41" stroke="#0F172A" stroke-width="2" stroke-linecap="round" />
        <path d="M20 47L12 48" stroke="#0F172A" stroke-width="2" stroke-linecap="round" />
        <path d="M44 43L52 41" stroke="#0F172A" stroke-width="2" stroke-linecap="round" />
        <path d="M44 47L52 48" stroke="#0F172A" stroke-width="2" stroke-linecap="round" />
        <circle cx="49.5" cy="18.5" r="2.8" fill="rgb(var(--color-primary-300))" fill-opacity="0.95" />
        <circle cx="49.5" cy="18.5" r="1.2" fill="white" fill-opacity="0.92" />
      </svg>
      <div class="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {{ visible ? '收起肥猫猫助手' : '打开肥猫猫助手' }}
        <div class="absolute left-full top-1/2 h-0 w-0 -translate-y-1/2 border-b-4 border-l-4 border-t-4 border-b-transparent border-l-gray-900 border-t-transparent"></div>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import api, { isTauri } from '@/services/api'
import { useUserStore } from '@/stores/user'
import { executeDesktopAiTool, isClientExecutableDesktopAiTool } from '@/utils/desktopAiActions'
import { dispatchAIUiSync } from '@/utils/aiUiSync'
import { showMessage } from '@/utils/message'

type ChatItem = {
  id: number
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
  tool?: any
  toolTrace?: any[]
  mode?: string
  needsConfirmation?: boolean
  originalMessage?: string
  confirmation?: {
    question?: string
    details?: Array<{ label: string; value: string; multiline?: boolean }>
  }
}

type AIHistoryItem = {
  role: 'user' | 'assistant'
  content: string
  tool_trace?: any[]
}

const router = useRouter()
const userStore = useUserStore()
const STORAGE_KEY = 'floating-ai-chat-history-v1'

const visible = ref(false)
const sending = ref(false)
const draft = ref('')
const messageContainerRef = ref<HTMLElement | null>(null)
const quickPrompts = [
  { label: '帮我查最新验证码', prompt: '帮我查最新验证码' },
  { label: '看看我的邮箱列表', prompt: '看看我的邮箱列表' },
  { label: '看看我的第三方邮箱', prompt: '看看我的第三方邮箱列表' },
  { label: '看看哪些邮箱能发邮件', prompt: '看看我现在有几个可以发邮件的邮箱' }
]
const messages = ref<ChatItem[]>([
  {
    id: Date.now(),
    role: 'assistant',
    content: '直接说你的问题，我来帮你查。'
  }
])

const isDesktop = computed(() => isTauri())

const toolTitleMap: Record<string, string> = {
  'mailboxes.create': '创建邮箱',
  'mailboxes.list': '查看邮箱列表',
  'mailboxes.delete': '删除邮箱',
  'external_mailboxes.list': '查看第三方邮箱',
  'external_mailboxes.delete': '删除第三方邮箱',
  'smtp_accounts.list': '查看发件账号',
  'desktop.smtp.accounts.list': '查询可发件邮箱',
  'emails.list': '查看邮件列表',
  'emails.detail': '查看邮件内容',
  'emails.delete': '删除邮件',
  'verification_codes.latest': '查验证码',
  'verification_codes.detail': '查验证码',
  'workflow_executions.create': '执行工作流',
  'workflow_executions.detail': '查看执行结果',
  'desktop.smtp.send': '桌面端发送邮件'
}

const getToolDisplayName = (name?: string) => {
  if (!name) return '未命名工具'
  return toolTitleMap[name] || name
}

const getTraceItems = (item: ChatItem) => (item.toolTrace?.length ? item.toolTrace : item.tool ? [item.tool] : [])

const getConfirmationLabel = (item: ChatItem) => {
  const traceItems = getTraceItems(item)
  const toolName = String(traceItems[traceItems.length - 1]?.name || '')
  if (toolName.includes('delete')) return '确认删除'
  if (toolName === 'desktop.smtp.send') return '确认发送'
  if (toolName === 'workflow_executions.create') return '确认执行'
  if (toolName.includes('create')) return '确认创建'
  return '确认继续'
}

const buildPreview = (items: any[], key: string, emptyText: string) => {
  const preview = items
    .map((item) => String(item?.[key] || '').trim())
    .filter(Boolean)
    .slice(0, 3)
    .join('、')
  return preview || emptyText
}

const formatToolArguments = (tool: any) => {
  const args = tool?.arguments || {}
  const entries = Object.entries(args).filter(([, value]) => value !== undefined && value !== null && value !== '')
  if (!entries.length) return ''
  return entries
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join('、') : String(value)}`)
    .join('，')
}

const formatToolResult = (tool: any) => {
  const name = String(tool?.name || '')
  const result = tool?.result || {}
  if (!result || typeof result !== 'object') {
    return result ? String(result) : ''
  }
  if (result.blocked) {
    return result.unsupported_message || '当前平台不可执行这个动作。'
  }

  if (name === 'mailboxes.create') {
    return result.email ? `已创建邮箱：${result.email}` : '调用成功'
  }
  if (name === 'mailboxes.list') {
    const items = result.items || []
    const total = result.pagination?.total ?? items.length
    return `返回 ${items.length} 条，总数 ${total}`
  }
  if (name === 'external_mailboxes.list') {
    const items = result.items || []
    const total = result.pagination?.total ?? items.length
    return `返回 ${items.length} 条，总数 ${total}`
  }
  if (name === 'smtp_accounts.list') {
    const items = result.items || []
    const total = result.summary?.total ?? items.length
    const activeCount = result.summary?.active_count ?? 0
    return `可发件 ${activeCount} 个，共 ${total} 个账号`
  }
  if (name === 'desktop.smtp.accounts.list') {
    const items = Array.isArray(result.items) ? result.items : []
    const sendable = items.filter((item: any) => Boolean(item?.can_send))
    const preview = sendable
      .map((item: any) => String(item?.email || '').trim())
      .filter(Boolean)
      .slice(0, 3)
      .join('、')
    return preview
      ? `当前可发件 ${sendable.length} 个：${preview}${sendable.length > 3 ? ' 等' : ''}`
      : '当前没有可发件邮箱'
  }
  if (name === 'emails.list') {
    const items = result.items || []
    const total = result.pagination?.total ?? items.length
    return `返回 ${items.length} 条，总数 ${total}`
  }
  if (name === 'emails.detail') {
    return `已返回邮件详情${result.subject ? `：${result.subject}` : ''}`
  }
  if (name === 'verification_codes.latest' || name === 'verification_codes.detail') {
    if (result.matched && result.code) {
      return `验证码：${result.code}`
    }
    return result.email_id ? `未提取到验证码，已返回邮件详情` : '未命中验证码邮件'
  }
  if (name === 'emails.delete') {
    return result.email_id ? `已删除邮件 ID ${result.email_id}` : '调用成功'
  }
  if (name === 'mailboxes.delete' || name === 'external_mailboxes.delete') {
    return result.mailbox_id ? `已删除邮箱 ID ${result.mailbox_id}` : '调用成功'
  }
  if (name === 'workflow_executions.create') {
    return `已提交执行${result.workflow_id || tool?.arguments?.workflow_id ? `：${result.workflow_id || tool?.arguments?.workflow_id}` : ''}`
  }
  if (name === 'workflow_executions.detail') {
    return `执行状态：${result.status || 'unknown'}`
  }
  if (name === 'desktop.smtp.send') {
    return result.from_email ? `已发送，发件人 ${result.from_email}` : '邮件已发送'
  }

  return ''
}

const persistMessages = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.value.slice(-30)))
}

const restoreMessages = () => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      messages.value = parsed
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
}

const scrollToBottom = async () => {
  await nextTick()
  if (messageContainerRef.value) {
    messageContainerRef.value.scrollTop = messageContainerRef.value.scrollHeight
  }
}

const appendMessage = (message: ChatItem) => {
  messages.value.push(message)
}

const buildLoadingMessage = (): ChatItem => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  role: 'assistant',
  content: '',
  loading: true
})

const replaceMessage = (messageId: number, nextMessage: ChatItem) => {
  const index = messages.value.findIndex((item) => item.id === messageId)
  if (index === -1) {
    messages.value.push(nextMessage)
    return
  }
  messages.value[index] = nextMessage
}

const getLatestTraceItem = (item?: ChatItem | null) => {
  if (!item) return null
  const traceItems = getTraceItems(item)
  if (!traceItems.length) return null
  return traceItems[traceItems.length - 1] || null
}

const buildConfirmationDetailsFromTrace = (item?: ChatItem | null) => {
  const traceItem = getLatestTraceItem(item)
  if (!traceItem) return []

  const toolName = String(traceItem?.name || '')
  const args = traceItem?.arguments && typeof traceItem.arguments === 'object' ? traceItem.arguments : {}
  const details: Array<{ label: string; value: string; multiline?: boolean }> = []
  const pushDetail = (label: string, value: any, multiline = false) => {
    const text = Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean).join('\n') : String(value || '').trim()
    if (!text) return
    details.push({ label, value: text, multiline })
  }

  if (toolName === 'desktop.smtp.send') {
    pushDetail('发件人', args.from_email)
    pushDetail('收件人', args.to_email || args.to)
    pushDetail('抄送', args.cc)
    pushDetail('密送', args.bcc)
    pushDetail('主题', args.subject)
    pushDetail('正文', args.content || args.body || args.text, true)
    return details
  }

  if (toolName === 'mailboxes.delete' || toolName === 'external_mailboxes.delete') {
    pushDetail('待删邮箱', args.mailbox_emails || args.mailbox_email || args.mailbox_ids, Array.isArray(args.mailbox_emails))
    return details
  }

  if (toolName === 'emails.delete') {
    pushDetail('待删邮件', args.email_subject || args.email_id || args.email_ids)
    return details
  }

  if (toolName === 'workflow_executions.create') {
    pushDetail('工作流', args.workflow_name || args.workflow_id)
    return details
  }

  return details
}

const getConfirmationDetails = (item?: ChatItem | null) => {
  const rawDetails = item?.confirmation?.details
  if (Array.isArray(rawDetails) && rawDetails.length) {
    return rawDetails
      .map((detail: any) => ({
        label: String(detail?.label || '').trim(),
        value: String(detail?.value || '').trim(),
        multiline: Boolean(detail?.multiline)
      }))
      .filter((detail) => detail.label && detail.value)
  }
  return buildConfirmationDetailsFromTrace(item)
}

const buildHistoryMessages = () => {
  const history = messages.value
    .filter((item) => !item.loading)
    .map((item) => {
      const traceItems = getTraceItems(item)
      const toolEntries = traceItems
        .map((tool) => {
          const title = getToolDisplayName(tool?.name)
          const args = formatToolArguments(tool)
          const result = formatToolResult(tool)
          return [
            title,
            args ? `参数 ${args}` : '',
            result ? `返回 ${result}` : ''
          ]
            .filter(Boolean)
            .join('；')
        })
        .filter(Boolean)
      const content = [
        String(item.content || '').trim(),
        toolEntries.length ? `工具结果：${toolEntries.join('；')}` : ''
      ]
        .filter(Boolean)
        .join('\n')
        .trim()

      if (!content || content === '直接说你的问题，我来帮你查。') {
        return null
      }

      return {
        role: item.role,
        content,
        tool_trace: traceItems.length ? traceItems : undefined
      } as AIHistoryItem
    })
    .filter(Boolean) as AIHistoryItem[]

  return history.slice(-12)
}

const togglePanel = async () => {
  visible.value = !visible.value
  if (visible.value) {
    await scrollToBottom()
  }
}

const usePrompt = (prompt: string) => {
  draft.value = prompt
}

const goToLogin = async () => {
  visible.value = false
  await router.push('/login')
}

const sendToBackend = async (message: string, confirm = false, history: AIHistoryItem[] = []) => {
  const response: any = await api.post('/ai/chat', {
    message,
    confirm,
    client_platform: isDesktop.value ? 'desktop' : 'web',
    history
  })
  if (response.code !== 0) {
    return null
  }
  return response.data || {}
}

const submitMessage = async (confirm = false, overrideMessage?: string) => {
  const message = (overrideMessage || draft.value).trim()
  if (!message || sending.value) {
    return
  }
  const history = buildHistoryMessages()

  if (!userStore.isAuthenticated) {
    showMessage('请先登录后再使用肥猫猫助手', 'warning')
    await goToLogin()
    return
  }

  if (!confirm) {
    appendMessage({
      id: Date.now(),
      role: 'user',
      content: message
    })
    draft.value = ''
  }

  const loadingMessage = buildLoadingMessage()
  appendMessage(loadingMessage)
  await scrollToBottom()
  sending.value = true
  try {
    const data = await sendToBackend(message, confirm, history)
    if (!data) {
      messages.value = messages.value.filter((item) => item.id !== loadingMessage.id)
      return
    }
    replaceMessage(loadingMessage.id, {
      id: loadingMessage.id,
      role: 'assistant',
      content: data.reply || '已处理完成',
      tool: data.tool,
      toolTrace: data.tool_trace,
      mode: data.mode,
      needsConfirmation: Boolean(data.needs_confirmation),
      originalMessage: message,
      confirmation: data.confirmation
    })
    dispatchAIUiSync({
      tool: data.tool,
      toolTrace: data.tool_trace,
      uiActions: data.ui_actions
    })
    await scrollToBottom()
  } catch (error: any) {
    messages.value = messages.value.filter((item) => item.id !== loadingMessage.id)
    showMessage(error?.message || error?.toString?.() || 'AI 处理失败，请稍后重试', 'error')
  } finally {
    sending.value = false
  }
}

const confirmAction = async (item?: ChatItem) => {
  if (!item) {
    return
  }

  const latestTrace = getLatestTraceItem(item)
  if (latestTrace && isClientExecutableDesktopAiTool(latestTrace)) {
    const loadingMessage = buildLoadingMessage()
    appendMessage(loadingMessage)
    await scrollToBottom()
    sending.value = true
    try {
      const executed = await executeDesktopAiTool(latestTrace)
      replaceMessage(item.id, {
        ...item,
        needsConfirmation: false
      })
      replaceMessage(loadingMessage.id, {
        id: loadingMessage.id,
        role: 'assistant',
        content: executed.reply,
        tool: executed,
        toolTrace: [executed],
        mode: 'desktop_local_execution',
        needsConfirmation: false,
        originalMessage: item.originalMessage
      })
      dispatchAIUiSync({
        tool: executed,
        toolTrace: [executed],
        uiActions: []
      })
      await scrollToBottom()
      return
    } catch (error: any) {
      replaceMessage(loadingMessage.id, {
        id: loadingMessage.id,
        role: 'assistant',
        content: error?.message || error?.toString?.() || '发送失败，请稍后重试',
        needsConfirmation: false
      })
      await scrollToBottom()
      return
    } finally {
      sending.value = false
    }
  }

  if (!item.originalMessage) {
    return
  }
  await submitMessage(true, item.originalMessage)
}

watch(
  () => messages.value,
  () => {
    persistMessages()
  },
  { deep: true }
)

watch(
  () => visible.value,
  (opened) => {
    if (opened) {
      void scrollToBottom()
    }
  }
)

restoreMessages()
</script>

<style scoped>
.floating-panel-enter-active,
.floating-panel-leave-active {
  transition: all 0.2s ease;
}

.floating-panel-enter-from,
.floating-panel-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}

.floating-cat {
  animation: catFloat 2.8s ease-in-out infinite;
}

.floating-cat .cat-eye {
  transform-origin: center;
  animation: catBlink 4.6s infinite;
}

@keyframes catFloat {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-1.5px);
  }
}

@keyframes catBlink {
  0%,
  44%,
  52%,
  100% {
    transform: scaleY(1);
  }
  48%,
  50% {
    transform: scaleY(0.15);
  }
}
</style>
