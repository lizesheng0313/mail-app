<template>
  <!-- 悬浮气泡按钮 -->
  <div class="fixed bottom-6 right-6 z-50">
    <!-- 聊天面板 -->
    <transition name="chat-slide">
      <div
        v-if="open"
        class="absolute bottom-16 right-0 w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-200 ring-1 ring-black/5 flex flex-col overflow-hidden"
        style="height: 520px;"
      >
        <!-- 头部 -->
        <div class="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white shrink-0">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg">🤖</div>
            <div>
              <div class="text-sm font-semibold">AI 流程助手</div>
              <div class="text-[11px] text-white/70">用自然语言修改流程</div>
            </div>
          </div>
          <button @click="open = false" class="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
        </div>

        <!-- 消息区 -->
        <div ref="messagesRef" class="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50/50">
          <!-- 欢迎 -->
          <div v-if="!messages.length" class="space-y-4 py-4">
            <div class="text-center text-sm text-gray-500">告诉我你想怎么改流程</div>
            <div class="space-y-2">
              <button
                v-for="hint in quickHints"
                :key="hint"
                @click="sendMessage(hint)"
                class="w-full text-left px-3 py-2 text-xs rounded-lg border border-gray-200 text-gray-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 transition-colors"
              >
                {{ hint }}
              </button>
            </div>
          </div>

          <!-- 消息列表 -->
          <div
            v-for="(msg, i) in messages"
            :key="i"
            class="flex"
            :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <!-- AI 头像 -->
            <div v-if="msg.role !== 'user'" class="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs shrink-0 mr-2 mt-0.5">AI</div>

            <div
              class="max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed"
              :class="msg.role === 'user'
                ? 'bg-primary-600 text-white rounded-br-md'
                : msg.role === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-md'
                  : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-md'"
            >
              <p class="whitespace-pre-wrap">{{ msg.content }}</p>
              <button
                v-if="msg.role === 'assistant' && msg.hasDraft"
                @click="applyDraft(msg.draft)"
                class="mt-2 w-full px-3 py-1.5 text-xs rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors font-medium"
              >
                ✓ 应用修改
              </button>
            </div>
          </div>

          <!-- AI 思考中 -->
          <div v-if="loading" class="flex justify-start">
            <div class="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs shrink-0 mr-2 mt-0.5">AI</div>
            <div class="bg-white rounded-2xl rounded-bl-md border border-gray-100 shadow-sm px-4 py-3">
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
                <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
                <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 输入框 -->
        <div class="shrink-0 border-t border-gray-100 bg-white px-3 py-3">
          <div class="flex gap-2">
            <input
              v-model.trim="input"
              class="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-gray-50"
              placeholder="比如：把第2步改成随机邮箱"
              @keydown.enter="sendMessage()"
              :disabled="loading"
            />
            <button
              @click="sendMessage()"
              :disabled="loading || !input"
              class="px-3 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 transition-colors shrink-0"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 气泡按钮 -->
    <button
      @click="open = !open"
      class="w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      :class="open ? 'bg-gray-700 hover:bg-gray-800' : 'bg-orange-500 hover:bg-orange-600'"
    >
      <svg v-if="open" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
      </svg>
      <svg v-else class="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="currentColor" opacity="0.15"/>
        <path d="M9 11.5a1 1 0 100-2 1 1 0 000 2zM15 11.5a1 1 0 100-2 1 1 0 000 2z" fill="currentColor"/>
        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16.5c-4.14 0-7.5-3.36-7.5-7.5S7.86 4.5 12 4.5s7.5 3.36 7.5 7.5-3.36 7.5-7.5 7.5z" fill="currentColor"/>
        <path d="M15.5 14.5c0 0-1.12 2-3.5 2s-3.5-2-3.5-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M5.5 8l3-2M18.5 8l-3-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <!-- 未读提示 -->
      <span
        v-if="!open && hasUnread"
        class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold"
      >!</span>
    </button>
  </div>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { workflowV2Api } from '@/api/workflowV2'
import { showMessage } from '@/utils/message'

const props = defineProps({
  draft: { type: Object, required: true },
  snapshotInfo: { type: Object, default: null },
})

const emit = defineEmits(['apply-draft'])

const open = ref(false)
const input = ref('')
const loading = ref(false)
const messages = ref([])
const messagesRef = ref(null)
const hasUnread = ref(false)

const quickHints = [
  '在提交前加一个截图步骤',
  '如果出现验证码弹窗就自动识别',
  '密码改成16位含特殊字符',
  '在填写表单前先关闭 cookie 弹窗',
  '给所有输入框加上模拟打字效果',
  '增加一个条件：如果页面有验证码图片才执行识别',
]

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

const applyDraft = (draft) => {
  emit('apply-draft', draft)
  messages.value.push({ role: 'assistant', content: '已应用到流程中 ✓' })
  scrollToBottom()
}

const sendMessage = async (text) => {
  const msg = text || input.value
  if (!msg) return
  input.value = ''

  messages.value.push({ role: 'user', content: msg })
  scrollToBottom()

  loading.value = true

  // 先插入一条空的 AI 消息，流式往里追加内容
  const aiMsg = { role: 'assistant', content: '', hasDraft: false, draft: null }
  messages.value.push(aiMsg)

  const chatHistory = messages.value
    .filter(m => m.role !== 'error' && m.content && !m.content.startsWith('已应用'))
    .slice(0, -1) // 排除刚加的空消息
    .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))

  // 构建页面元素上下文
  const payload = { draft: props.draft, message: msg, chat_history: chatHistory }
  if (props.snapshotInfo) {
    payload.page_elements = {
      inputs: props.snapshotInfo.inputs || [],
      buttons: props.snapshotInfo.buttons || [],
    }
  }

  workflowV2Api.chatEditStream(
    payload,
    {
      onToken(token) {
        aiMsg.content += token
        scrollToBottom()
      },
      onDraft(data) {
        if (data?.draft) {
          aiMsg.hasDraft = true
          aiMsg.draft = data.draft
          // 去掉消息中的 JSON 代码块，只保留文字说明
          aiMsg.content = aiMsg.content.replace(/```json[\s\S]*?```/g, '').trim()
          if (!aiMsg.content) {
            aiMsg.content = data.changes || '已按要求修改，点击下方按钮应用'
          }
        }
        scrollToBottom()
      },
      onDone() {
        loading.value = false
        if (!aiMsg.content && !aiMsg.hasDraft) {
          aiMsg.content = '（AI 无回复）'
          aiMsg.role = 'error'
        }
        if (!open.value) hasUnread.value = true
        scrollToBottom()
      },
      onError(err) {
        loading.value = false
        aiMsg.content = err || '请求失败'
        aiMsg.role = 'error'
        scrollToBottom()
      },
    }
  )
}

watch(open, (val) => {
  if (val) {
    hasUnread.value = false
    scrollToBottom()
  }
})
</script>

<style scoped>
.chat-slide-enter-active,
.chat-slide-leave-active {
  transition: all 0.25s ease;
}
.chat-slide-enter-from,
.chat-slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
</style>
