<template>
  <div class="h-full overflow-y-auto pr-1">
    <div class="mx-auto max-w-6xl space-y-4 pb-4">
      <div class="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-base font-semibold text-gray-900">发件箱</p>
            <p class="mt-1 text-sm text-gray-500">列表先看发给谁和状态，点进去再看正文、附件和报错。</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
              共 {{ sentEmailTotal || sentEmails.length }} 封
            </span>
            <button
              type="button"
              :disabled="sentEmailsLoading"
              class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:border-primary-300 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
              @click="loadSentEmails"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {{ sentEmailsLoading ? '刷新中...' : '刷新' }}
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="sentEmailTableMissing"
        class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"
      >
        发件箱记录表还没准备好，当前只能看到基础记录。
      </div>

      <div
        v-if="sentEmailsLoading && sentEmails.length === 0"
        class="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400"
      >
        正在加载发件箱...
      </div>

      <div
        v-else-if="sentEmails.length === 0"
        class="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-center"
      >
        <svg class="mb-4 h-12 w-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="text-sm font-medium text-gray-500">发件箱还是空的</p>
        <p class="mt-1 text-sm text-gray-400">发出去的邮件会在这里保留记录。</p>
      </div>

      <div v-else class="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div class="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <div class="space-y-2">
            <button
              v-for="record in sentEmails"
              :key="record.id"
              type="button"
              class="w-full rounded-2xl border px-4 py-3 text-left transition-colors"
              :class="selectedRecord?.id === record.id ? 'border-primary-300 bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'"
              @click="selectedRecordId = record.id"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-gray-900">
                    {{ record.subject || '（无主题）' }}
                  </p>
                  <p class="mt-1 truncate text-sm text-gray-500">发给：{{ record.to_email }}</p>
                  <p class="mt-1 text-xs text-gray-400">{{ formatTimestamp(record.created_at, 'datetime') }}</p>
                </div>
                <span
                  class="shrink-0 rounded-full px-2.5 py-0.5 text-xs"
                  :class="resolveStatusClass(record.status)"
                >
                  {{ record.status_label || resolveStatusLabel(record.status) }}
                </span>
              </div>
            </button>
          </div>
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div v-if="selectedRecord" class="space-y-5">
            <div class="flex flex-col gap-3 border-b border-gray-100 pb-4">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-lg font-semibold text-gray-900">{{ selectedRecord.subject || '（无主题）' }}</h3>
                  <span class="rounded-full px-2.5 py-0.5 text-xs" :class="resolveStatusClass(selectedRecord.status)">
                    {{ selectedRecord.status_label || resolveStatusLabel(selectedRecord.status) }}
                  </span>
                </div>
                <div class="mt-3 grid gap-1 text-sm text-gray-500">
                  <p class="break-all">发件人：{{ selectedRecord.from_email }}</p>
                  <p class="break-all">收件人：{{ selectedRecord.to_email }}</p>
                  <p>发送时间：{{ formatTimestamp(selectedRecord.created_at, 'datetime') }}</p>
                  <p v-if="selectedRecord.bounced_at">退信时间：{{ formatTimestamp(selectedRecord.bounced_at, 'datetime') }}</p>
                </div>
              </div>
              <button
                type="button"
                class="inline-flex w-fit items-center justify-center rounded-lg border border-primary-200 bg-white px-3 py-2 text-sm text-primary-600 transition-colors hover:border-primary-300 hover:bg-primary-50"
                @click="$emit('reedit', selectedRecord)"
              >
                重新编辑
              </button>
            </div>

            <div
              v-if="selectedRecord.status === 'failed' && selectedRecord.error_message"
              class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
            >
              <p class="text-sm font-medium text-amber-800">发送失败</p>
              <p class="mt-1 text-sm leading-6 text-amber-700">{{ selectedRecord.error_message }}</p>
            </div>

            <div
              v-if="selectedRecord.status === 'bounced' && selectedRecord.bounce_reason"
              class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3"
            >
              <p class="text-sm font-medium text-rose-800">退信原因</p>
              <p class="mt-1 text-sm leading-6 text-rose-700">{{ selectedRecord.bounce_reason }}</p>
            </div>

            <div v-if="selectedRecord.attachments?.length" class="space-y-2">
              <p class="text-sm font-medium text-gray-800">附件</p>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="(attachment, index) in selectedRecord.attachments"
                  :key="`${attachment.name}-${index}`"
                  class="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-600"
                >
                  {{ attachment.name }}<span v-if="attachment.size"> · {{ formatFileSize(attachment.size) }}</span>
                </span>
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-sm font-medium text-gray-800">正文</p>
              <div class="min-h-[240px] rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-7 text-gray-700 whitespace-pre-wrap break-all">
                {{ selectedRecord.content_text || '（无正文）' }}
              </div>
            </div>
          </div>

          <div v-else class="flex min-h-[420px] items-center justify-center text-sm text-gray-400">
            选择一封邮件查看详情
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import smtpAccountsAPI from '@/api/smtpAccounts'
import { showMessage } from '@/utils/message'
import { formatTimestamp } from '@/utils/timeUtils'

interface SentAttachmentMeta {
  name: string
  size?: number
  content_type?: string
}

interface SentEmailRecord {
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

defineEmits<{
  (e: 'reedit', record: SentEmailRecord): void
}>()

const sentEmailsLoading = ref(false)
const sentEmails = ref<SentEmailRecord[]>([])
const sentEmailTotal = ref(0)
const sentEmailTableMissing = ref(false)
const selectedRecordId = ref<number | string | null>(null)

const selectedRecord = computed(() => {
  return sentEmails.value.find((item) => item.id === selectedRecordId.value) || sentEmails.value[0] || null
})

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

const formatFileSize = (size?: number) => {
  const value = Number(size || 0)
  if (!value) return ''
  if (value < 1024) return `${value}B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)}KB`
  return `${(value / (1024 * 1024)).toFixed(1)}MB`
}

const loadSentEmails = async () => {
  sentEmailsLoading.value = true
  try {
    const response = await smtpAccountsAPI.getSentEmails({ page: 1, page_size: 30 })
    if (response.code === 0) {
      sentEmails.value = response.data?.records || []
      sentEmailTotal.value = response.data?.pagination?.total || 0
      sentEmailTableMissing.value = Boolean(response.data?.table_missing)

      const currentSelected = sentEmails.value.find((item) => item.id === selectedRecordId.value)
      selectedRecordId.value = currentSelected ? currentSelected.id : (sentEmails.value[0]?.id ?? null)
      return
    }

    sentEmails.value = []
    sentEmailTotal.value = 0
    sentEmailTableMissing.value = false
    selectedRecordId.value = null
    showMessage(response.message || '加载发件箱失败', 'error')
  } catch (error: any) {
    console.error('加载发件箱失败', error)
    const msg = error.response?.data?.message || error.message || '加载发件箱失败'
    showMessage(msg, 'error')
    sentEmails.value = []
    sentEmailTotal.value = 0
    sentEmailTableMissing.value = false
    selectedRecordId.value = null
  } finally {
    sentEmailsLoading.value = false
  }
}

defineExpose({
  loadSentEmails,
})

onMounted(() => {
  loadSentEmails()
})
</script>
