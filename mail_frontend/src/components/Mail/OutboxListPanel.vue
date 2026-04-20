<template>
  <div class="flex h-full flex-col">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <h2 class="truncate text-base font-semibold text-slate-900 whitespace-nowrap">发件箱</h2>
          <button
            v-if="filterMailboxId"
            type="button"
            class="rounded-full bg-primary-50 px-2.5 py-1 text-xs text-primary-600 transition-colors hover:bg-primary-100"
            @click="$emit('clear-filter')"
          >
            查看全部
          </button>
        </div>
        <p class="mt-1 text-sm text-slate-500">按时间看发送记录，点开右侧查看正文和结果。</p>
      </div>

      <div class="flex items-center gap-2">
        <span class="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
          {{ total || records.length }} 封
        </span>
        <button
          type="button"
          :disabled="loading"
          class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-primary-300 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
          @click="loadSentEmails"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>

    <div
      v-if="loading && records.length === 0"
      class="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400"
    >
      正在加载发件箱...
    </div>

    <div
      v-else-if="records.length === 0"
      class="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center"
    >
      <svg class="mb-4 h-12 w-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p class="text-sm font-medium text-slate-500">发件箱还是空的</p>
      <p class="mt-1 text-sm text-slate-400">发出去的邮件会在这里保留记录。</p>
    </div>

    <div v-else class="scrollbar-stable flex-1 space-y-2 overflow-y-auto pr-1">
      <button
        v-for="record in records"
        :key="record.id"
        type="button"
        class="w-full rounded-2xl border px-4 py-3 text-left transition-colors"
        :class="currentSelectedId === record.id ? 'border-primary-300 bg-primary-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'"
        @click="selectRecord(record.id)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-slate-900">
              {{ record.subject || '（无主题）' }}
            </p>
            <p class="mt-1 truncate text-sm text-slate-500">发给：{{ record.to_email }}</p>
            <div class="mt-2 flex items-center gap-2 text-xs text-slate-400">
              <span>{{ formatTimestamp(record.created_at, 'datetime') }}</span>
              <span v-if="record.from_email" class="truncate">· {{ record.from_email }}</span>
            </div>
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
  content_html?: string
  cc_email?: string
  bcc_email?: string
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
  if (status === 'failed') return 'bg-rose-50 text-rose-700'
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
