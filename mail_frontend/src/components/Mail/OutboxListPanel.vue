<template>
  <div class="flex h-full flex-col">
    <div class="mb-4 border-b border-gray-200 pb-4">
      <div class="flex min-h-8 items-center">
        <h2 class="text-base font-semibold text-black whitespace-nowrap">发件箱</h2>
        <button
          v-if="filterMailboxId"
          type="button"
          class="ml-1.5 px-2 py-1 text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors whitespace-nowrap"
          @click="$emit('clear-filter')"
        >
          查看全部
        </button>
      </div>
    </div>

    <div v-if="loading && records.length === 0" class="flex flex-1 items-center justify-center text-sm text-gray-400">
      正在加载发件箱...
    </div>

    <div v-else-if="records.length === 0" class="flex flex-1 items-center justify-center text-sm text-gray-400">
      发件箱还是空的
    </div>

    <div v-else class="scrollbar-stable flex-1 space-y-2 overflow-y-auto pr-1">
      <button
        v-for="record in records"
        :key="record.id"
        type="button"
        class="w-full rounded-2xl border px-4 py-3 text-left transition-colors"
        :class="currentSelectedId === record.id ? 'border-primary-300 bg-primary-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white'"
        @click="selectRecord(record.id)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-gray-900">
              {{ record.subject || '（无主题）' }}
            </p>
            <p class="mt-1 truncate text-sm text-gray-500">发给：{{ record.to_email }}</p>
            <p class="mt-1 text-xs text-gray-400">{{ formatTimestamp(record.created_at, 'datetime') }}</p>
          </div>
          <span class="shrink-0 rounded-full px-2.5 py-0.5 text-xs" :class="resolveStatusClass(record.status)">
            {{ record.status_label || resolveStatusLabel(record.status) }}
          </span>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import smtpAccountsAPI from '@/api/smtpAccounts'
import { showMessage } from '@/utils/message'
import { formatTimestamp } from '@/utils/timeUtils'

export interface SentAttachmentMeta {
  name: string
  size?: number
  content_type?: string
}

export interface SentEmailRecord {
  id: number | string
  from_email: string
  to_email: string
  subject: string
  content_text?: string
  created_at: number
  status?: 'sent' | 'bounced' | 'failed'
  status_label?: string
  bounce_reason?: string
  bounced_at?: number | null
  related_email_id?: number | null
  error_message?: string
  smtp_response_code?: number | null
  smtp_response_message?: string
  external_mailbox_id?: number | null
  attachments?: SentAttachmentMeta[]
}

const props = defineProps<{
  filterMailboxId?: number | null
}>()

const emit = defineEmits<{
  (e: 'select', record: SentEmailRecord | null): void
  (e: 'clear-filter'): void
}>()

const loading = ref(false)
const records = ref<SentEmailRecord[]>([])
const total = ref(0)
const currentSelectedId = ref<number | string | null>(null)
let refreshTimer: ReturnType<typeof setInterval> | null = null

const resolveStatusClass = (status?: string) => {
  if (status === 'failed') return 'bg-amber-50 text-amber-700'
  if (status === 'bounced') return 'bg-rose-50 text-rose-700'
  return 'bg-emerald-50 text-emerald-700'
}

const resolveStatusLabel = (status?: string) => {
  if (status === 'failed') return '发送失败'
  if (status === 'bounced') return '已退信'
  return '已发送'
}

const emitCurrentSelection = () => {
  const selected = records.value.find((item) => item.id === currentSelectedId.value) || records.value[0] || null
  if (selected) {
    currentSelectedId.value = selected.id
  }
  emit('select', selected)
}

const selectRecord = (id: number | string) => {
  currentSelectedId.value = id
  emitCurrentSelection()
}

const loadSentEmails = async () => {
  loading.value = true
  try {
    const response = await smtpAccountsAPI.getSentEmails({
      page: 1,
      page_size: 30,
      ...(props.filterMailboxId ? { external_mailbox_id: props.filterMailboxId } : {})
    })
    if (response.code === 0) {
      records.value = response.data?.records || []
      total.value = response.data?.pagination?.total || 0
      emitCurrentSelection()
      return
    }

    records.value = []
    total.value = 0
    currentSelectedId.value = null
    emit('select', null)
    showMessage(response.message || '加载发件箱失败', 'error')
  } catch (error: any) {
    console.error('加载发件箱失败', error)
    const msg = error.response?.data?.message || error.message || '加载发件箱失败'
    showMessage(msg, 'error')
    records.value = []
    total.value = 0
    currentSelectedId.value = null
    emit('select', null)
  } finally {
    loading.value = false
  }
}

defineExpose({
  loadSentEmails,
})

onMounted(() => {
  loadSentEmails()
  refreshTimer = window.setInterval(() => {
    loadSentEmails()
  }, 20000)
})

watch(
  () => props.filterMailboxId,
  () => {
    currentSelectedId.value = null
    loadSentEmails()
  }
)

onBeforeUnmount(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})
</script>
