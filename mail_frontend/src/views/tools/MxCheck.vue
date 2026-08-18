<template>
  <ToolLayout
    title="MX 记录查询"
    description="查询域名当前生效的邮件服务器和优先级，检查域名是否已经具备收信条件。"
  >
    <form class="grid max-w-3xl gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" @submit.prevent="runCheck">
      <BaseInput v-model="domain" placeholder="输入域名，例如 example.com" autocomplete="off" />
      <button
        type="submit"
        :disabled="loading || !domain.trim()"
        class="rounded-lg bg-primary-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {{ loading ? '查询中...' : '查询 MX' }}
      </button>
    </form>

    <p v-if="error" class="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{{ error }}</p>

    <div v-if="result" class="mt-7">
      <div class="flex items-center justify-between border-b border-slate-200 pb-3">
        <h2 class="font-semibold text-slate-900">{{ result.domain }}</h2>
        <span :class="result.mx.found ? 'text-primary-700' : 'text-amber-700'" class="text-sm font-medium">
          {{ result.mx.found ? `找到 ${result.mx.records.length} 条记录` : '未找到 MX 记录' }}
        </span>
      </div>
      <div v-if="result.mx.records.length" class="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <div
          v-for="record in result.mx.records"
          :key="`${record.priority}-${record.host}`"
          class="grid grid-cols-[90px_1fr] border-b border-slate-100 px-4 py-3 text-sm last:border-0"
        >
          <span class="text-slate-500">优先级 {{ record.priority ?? '-' }}</span>
          <code class="break-all text-slate-900">{{ record.host }}</code>
        </div>
      </div>
      <p v-else class="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
        该域名暂未发布 MX 记录，通常无法接收邮件。
      </p>
    </div>
  </ToolLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BaseInput from '@/components/BaseInput/index.vue'
import publicToolsAPI from '@/api/publicTools'
import ToolLayout from './ToolLayout.vue'

const domain = ref('')
const loading = ref(false)
const error = ref('')
const result = ref<any>(null)

const runCheck = async () => {
  if (!domain.value.trim() || loading.value) return
  loading.value = true
  error.value = ''
  result.value = null
  try {
    const response: any = await publicToolsAPI.checkDns(domain.value.trim())
    if (response.code !== 0) {
      error.value = response.message || '查询失败，请稍后重试'
      return
    }
    result.value = response.data
  } catch (err: any) {
    error.value = err.response?.data?.message || '查询失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>
