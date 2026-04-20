<template>
  <div class="flex h-full flex-col">
    <div class="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
      <div>
        <h2 class="text-base font-semibold text-slate-900">发件详情</h2>
      </div>

    </div>

    <div v-if="record" class="scrollbar-stable flex-1 overflow-y-auto pr-1">
      <div class="space-y-5">
        <div class="border-b border-slate-100 pb-4">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-lg font-semibold text-slate-900">{{ record.subject || '（无主题）' }}</h3>
              <span class="rounded-full px-2.5 py-0.5 text-xs" :class="resolveStatusClass(record.status)">
                {{ record.status_label || resolveStatusLabel(record.status) }}
              </span>
            </div>
            <div class="mt-3 grid gap-1 text-sm text-slate-500">
              <p class="break-all">发件人：{{ record.from_email }}</p>
              <p class="break-all">收件人：{{ record.to_email }}</p>
              <p v-if="record.cc_email" class="break-all">抄送：{{ record.cc_email }}</p>
              <p v-if="record.bcc_email" class="break-all">密送：{{ record.bcc_email }}</p>
              <p>发送时间：{{ formatTimestamp(record.created_at, 'datetime') }}</p>
              <p v-if="record.bounced_at">退信时间：{{ formatTimestamp(record.bounced_at, 'datetime') }}</p>
            </div>
          </div>
        </div>

        <div
          v-if="record.status === 'failed' && record.error_message"
          class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3"
        >
          <p class="text-sm font-medium text-rose-800">发送失败</p>
          <p class="mt-1 text-sm leading-6 text-rose-700">{{ record.error_message }}</p>
        </div>

        <div
          v-if="record.status === 'bounced' && record.bounce_reason"
          class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3"
        >
          <p class="text-sm font-medium text-rose-800">退信原因</p>
          <p class="mt-1 text-sm leading-6 text-rose-700">{{ record.bounce_reason }}</p>
        </div>

        <div v-if="record.attachments?.length" class="space-y-2">
          <p class="text-sm font-medium text-slate-800">附件</p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(attachment, index) in record.attachments"
              :key="`${attachment.name}-${index}`"
              class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600"
            >
              {{ attachment.name }}<span v-if="attachment.size"> · {{ formatFileSize(attachment.size) }}</span>
            </span>
          </div>
          <p class="text-xs text-slate-400">重新编辑时会保留附件信息提示，发送前需要重新选择附件文件。</p>
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium text-slate-800">正文</p>
          <div class="min-h-[320px] rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <EmailHtmlRenderer
              v-if="hasHtmlContent"
              :html="htmlContent"
              min-height="280px"
            />
            <div
              v-else
              class="min-h-[280px] text-sm leading-7 text-slate-700 whitespace-pre-wrap break-all"
            >
              {{ record.content_text || '（无正文）' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else
      class="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center"
    >
      <svg class="mb-4 h-12 w-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p class="text-sm font-medium text-slate-500">选择一封发件记录查看详情</p>
      <p class="mt-1 text-sm text-slate-400">右侧会显示正文、附件和发送结果。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatTimestamp } from '@/utils/timeUtils'
import EmailHtmlRenderer from '@/components/Mail/EmailHtmlRenderer.vue'
import type { SentEmailRecord } from './OutboxListPanel.vue'

const props = defineProps<{
  record: SentEmailRecord | null
}>()

defineEmits<{
  (e: 'reedit', record: SentEmailRecord): void
}>()

const hasHtmlContent = computed(() => {
  const html = props.record?.content_html || ''
  return /<[^>]+>/.test(String(html).trim())
})

const htmlContent = computed(() => {
  return props.record?.content_html || props.record?.content_text || ''
})

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

const formatFileSize = (size?: number) => {
  const value = Number(size || 0)
  if (!value) return ''
  if (value < 1024) return `${value}B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)}KB`
  return `${(value / (1024 * 1024)).toFixed(1)}MB`
}

</script>
