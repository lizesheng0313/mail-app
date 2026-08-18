<template>
  <ToolLayout
    title="SPF、DKIM、DMARC 检测"
    description="一次检查域名的发信身份记录，快速发现容易导致邮件进垃圾箱或被伪造的配置缺失。"
  >
    <form class="grid gap-3 sm:grid-cols-[1fr_180px_auto]" @submit.prevent="runCheck">
      <BaseInput v-model="domain" placeholder="输入域名，例如 example.com" autocomplete="off" />
      <BaseInput v-model="selector" placeholder="DKIM Selector" autocomplete="off" />
      <button
        type="submit"
        :disabled="loading || !domain.trim()"
        class="rounded-lg bg-primary-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {{ loading ? '检测中...' : '开始检测' }}
      </button>
    </form>
    <p class="mt-2 text-xs text-slate-500">DKIM Selector 不确定时可先使用 default，也可以填写服务商提供的值。</p>

    <p v-if="error" class="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{{ error }}</p>

    <div v-if="result" class="mt-7 grid gap-4 md:grid-cols-3">
      <article
        v-for="item in securityItems"
        :key="item.key"
        class="rounded-2xl border border-slate-200 p-5"
      >
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-slate-900">{{ item.label }}</h2>
          <span
            :class="item.found ? 'bg-primary-50 text-primary-700' : 'bg-amber-50 text-amber-700'"
            class="rounded-full px-2.5 py-1 text-xs font-semibold"
          >
            {{ item.found ? '已配置' : '未检测到' }}
          </span>
        </div>
        <code v-if="item.records.length" class="mt-4 block break-all text-xs leading-6 text-slate-600">
          {{ item.records.join('\n') }}
        </code>
        <p v-else class="mt-4 text-sm leading-6 text-slate-500">{{ item.emptyHint }}</p>
      </article>
    </div>
  </ToolLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseInput from '@/components/BaseInput/index.vue'
import publicToolsAPI from '@/api/publicTools'
import ToolLayout from './ToolLayout.vue'

const domain = ref('')
const selector = ref('default')
const loading = ref(false)
const error = ref('')
const result = ref<any>(null)

const securityItems = computed(() => {
  const data = result.value || {}
  return [
    { key: 'spf', label: 'SPF', found: false, records: [], ...data.spf, emptyHint: '缺少 SPF 时，收件方难以确认哪些服务器可以代表该域名发信。' },
    { key: 'dkim', label: 'DKIM', found: false, records: [], ...data.dkim, emptyHint: `未在 ${data.selector || selector.value} Selector 下检测到 DKIM 公钥。` },
    { key: 'dmarc', label: 'DMARC', found: false, records: [], ...data.dmarc, emptyHint: '缺少 DMARC 时，域名对伪造邮件没有明确的处理策略。' }
  ]
})

const runCheck = async () => {
  if (!domain.value.trim() || loading.value) return
  loading.value = true
  error.value = ''
  result.value = null
  try {
    const response: any = await publicToolsAPI.checkDns(domain.value.trim(), selector.value.trim() || 'default')
    if (response.code !== 0) {
      error.value = response.message || '检测失败，请稍后重试'
      return
    }
    result.value = response.data
  } catch (err: any) {
    error.value = err.response?.data?.message || '检测失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>
