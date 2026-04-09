<template>
  <div class="flex h-full flex-col">
    <div class="mb-4 border-b border-gray-200 pb-4">
      <h2 class="text-base font-semibold text-black">发件详情</h2>
    </div>

    <div v-if="record" class="scrollbar-stable flex-1 overflow-y-auto pr-1">
      <div class="space-y-5">
        <div class="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-lg font-semibold text-gray-900">{{ record.subject || '（无主题）' }}</h3>
              <span class="rounded-full px-2.5 py-0.5 text-xs" :class="resolveStatusClass(record.status)">
                {{ record.status_label || resolveStatusLabel(record.status) }}
              </span>
            </div>
            <div class="mt-3 grid gap-1 text-sm text-gray-500">
              <p class="break-all">发件人：{{ record.from_email }}</p>
              <p class="break-all">收件人：{{ record.to_email }}</p>
              <p>发送时间：{{ formatTimestamp(record.created_at, 'datetime') }}</p>
              <p v-if="record.bounced_at">退信时间：{{ formatTimestamp(record.bounced_at, 'datetime') }}</p>
            </div>
          </div>
          <button
            type="button"
            title="重新编辑"
            aria-label="重新编辑"
            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary-200 bg-white text-primary-600 transition-colors hover:border-primary-300 hover:bg-primary-50"
            @click="$emit('reedit', record)"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 113 3L12 14l-4 1 1-4 7.5-7.5z" />
            </svg>
          </button>
        </div>

        <div
          v-if="record.status === 'failed' && record.error_message"
          class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
        >
          <p class="text-sm font-medium text-amber-800">发送失败</p>
          <p class="mt-1 text-sm leading-6 text-amber-700">{{ record.error_message }}</p>
        </div>

        <div
          v-if="record.status === 'bounced' && record.bounce_reason"
          class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3"
        >
          <p class="text-sm font-medium text-rose-800">退信原因</p>
          <p class="mt-1 text-sm leading-6 text-rose-700">{{ record.bounce_reason }}</p>
        </div>

        <div v-if="record.attachments?.length" class="space-y-2">
          <p class="text-sm font-medium text-gray-800">附件</p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(attachment, index) in record.attachments"
              :key="`${attachment.name}-${index}`"
              class="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-600"
            >
              {{ attachment.name }}<span v-if="attachment.size"> · {{ formatFileSize(attachment.size) }}</span>
            </span>
          </div>
          <p class="text-xs text-gray-400">重新编辑时会保留附件信息提示，发送前需要重新选择附件文件。</p>
        </div>

        <div
          class="min-h-[240px] text-sm leading-7 text-gray-700 whitespace-pre-wrap break-all"
        >
          {{ record.content_text || '（无正文）' }}
        </div>
      </div>
    </div>

    <div v-else class="flex flex-1 items-center justify-center text-sm text-gray-400">
      选择一封发件记录查看详情
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatTimestamp } from '@/utils/timeUtils'
import type { SentEmailRecord } from './OutboxListPanel.vue'

defineProps<{
  record: SentEmailRecord | null
}>()

defineEmits<{
  (e: 'reedit', record: SentEmailRecord): void
}>()

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
</script>
