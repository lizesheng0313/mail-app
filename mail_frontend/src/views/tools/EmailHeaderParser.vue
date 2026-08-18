<template>
  <ToolLayout
    title="邮件头解析"
    description="在浏览器本地解析发件人、投递路径和 SPF、DKIM、DMARC 验证结果，邮件头内容不会上传。"
  >
    <textarea
      v-model="rawHeaders"
      rows="11"
      class="w-full resize-y rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 font-mono text-sm leading-6 text-gray-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
      placeholder="粘贴邮件原始头信息，例如 From、Received、Authentication-Results..."
    ></textarea>
    <div class="mt-3 flex justify-end">
      <button
        type="button"
        :disabled="!rawHeaders.trim()"
        class="rounded-lg bg-primary-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        @click="parseHeaders"
      >
        开始解析
      </button>
    </div>

    <div v-if="parsed" class="mt-8 space-y-6">
      <div class="grid gap-3 sm:grid-cols-3">
        <div
          v-for="item in authResults"
          :key="item.label"
          class="rounded-2xl border border-slate-200 p-4"
        >
          <span class="text-xs font-medium uppercase tracking-wider text-slate-500">{{
            item.label
          }}</span>
          <p :class="item.pass ? 'text-primary-700' : 'text-amber-700'" class="mt-2 font-semibold">
            {{ item.value || '未检测到' }}
          </p>
        </div>
      </div>

      <div class="overflow-hidden rounded-2xl border border-slate-200">
        <div
          v-for="item in summaryFields"
          :key="item.label"
          class="grid gap-1 border-b border-slate-100 px-4 py-3 text-sm last:border-0 sm:grid-cols-[120px_1fr]"
        >
          <span class="text-slate-500">{{ item.label }}</span>
          <span class="break-all text-slate-900">{{ item.value || '-' }}</span>
        </div>
      </div>

      <div v-if="parsed.received.length">
        <h2 class="font-semibold text-slate-900">投递路径</h2>
        <ol class="mt-3 space-y-2">
          <li
            v-for="(item, index) in parsed.received"
            :key="index"
            class="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-700"
          >
            <span class="mr-2 font-semibold text-primary-700">{{ index + 1 }}</span
            >{{ item }}
          </li>
        </ol>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from './ToolLayout.vue'

const rawHeaders = ref('')
const parsed = ref<any>(null)

const unfoldHeaders = (value: string) => value.replace(/\r?\n[\t ]+/g, ' ')

const parseHeaderMap = (value: string) => {
  const map: Record<string, string[]> = {}
  for (const line of unfoldHeaders(value).split(/\r?\n/)) {
    const separator = line.indexOf(':')
    if (separator <= 0) continue
    const key = line.slice(0, separator).trim().toLowerCase()
    const content = line.slice(separator + 1).trim()
    if (!map[key]) map[key] = []
    map[key].push(content)
  }
  return map
}

const extractAuthStatus = (text: string, name: string) => {
  const match = text.match(new RegExp(`\\b${name}=([a-z_-]+)`, 'i'))
  return match?.[1]?.toLowerCase() || ''
}

const parseHeaders = () => {
  const headers = parseHeaderMap(rawHeaders.value)
  const authentication = (headers['authentication-results'] || []).join(' ')
  parsed.value = {
    from: headers.from?.[0] || '',
    to: headers.to?.[0] || '',
    subject: headers.subject?.[0] || '',
    date: headers.date?.[0] || '',
    messageId: headers['message-id']?.[0] || '',
    returnPath: headers['return-path']?.[0] || '',
    received: headers.received || [],
    spf: extractAuthStatus(authentication, 'spf'),
    dkim: extractAuthStatus(authentication, 'dkim'),
    dmarc: extractAuthStatus(authentication, 'dmarc')
  }
}

const authResults = computed(() =>
  ['spf', 'dkim', 'dmarc'].map((key) => ({
    label: key.toUpperCase(),
    value: parsed.value?.[key] || '',
    pass: parsed.value?.[key] === 'pass'
  }))
)

const summaryFields = computed(() => [
  { label: '发件人', value: parsed.value?.from },
  { label: '收件人', value: parsed.value?.to },
  { label: '主题', value: parsed.value?.subject },
  { label: '发送时间', value: parsed.value?.date },
  { label: 'Return-Path', value: parsed.value?.returnPath },
  { label: 'Message-ID', value: parsed.value?.messageId }
])
</script>
