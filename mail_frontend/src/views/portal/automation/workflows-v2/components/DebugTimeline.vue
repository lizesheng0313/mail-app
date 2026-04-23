<template>
  <div class="space-y-1">
    <div v-if="!logs.length" class="py-6 text-center text-xs text-gray-400">
      点击「试运行」后，执行过程会显示在这里
    </div>
    <div
      v-for="(log, i) in logs"
      :key="`${log.step_id}-${log.attempt}-${i}`"
      class="rounded-lg overflow-hidden border"
      :class="borderClass(log.status)"
    >
      <!-- 主行：直接显示关键信息 -->
      <div
        class="flex items-center gap-2 px-3 py-2 text-xs"
        :class="hasDetail(log) ? 'cursor-pointer hover:bg-gray-50' : ''"
        @click="hasDetail(log) && toggle(i)"
      >
        <span class="w-2 h-2 rounded-full shrink-0" :class="dotClass(log.status)"></span>
        <span class="text-gray-400 w-5 text-right shrink-0">#{{ log.order }}</span>
        <span class="font-medium text-gray-800 truncate">{{ log.step_name }}</span>

        <!-- 摘要值（填写值/选择值等），灰色显示 -->
        <span v-if="summaryHint(log)" class="text-gray-400 truncate max-w-[200px]">{{ summaryHint(log) }}</span>

        <span class="flex-1"></span>

        <!-- 状态 badge -->
        <span class="text-[11px] px-1.5 py-0.5 rounded shrink-0" :class="badgeClass(log.status)">
          {{ statusLabel(log.status) }}
        </span>

        <!-- 耗时 -->
        <span v-if="log.duration_ms" class="text-gray-400 w-12 text-right shrink-0">{{ log.duration_ms }}ms</span>

        <!-- 展开箭头（仅有详情时显示） -->
        <svg
          v-if="hasDetail(log)"
          class="w-3.5 h-3.5 text-gray-400 transition-transform shrink-0"
          :class="{ 'rotate-180': expanded.has(i) }"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      <!-- 展开详情（仅有复杂信息时） -->
      <div v-if="expanded.has(i)" class="px-3 pb-2.5 pt-1 border-t border-gray-100 bg-gray-50/50 space-y-2 text-xs">
        <!-- 修复策略 -->
        <div v-if="log.debug_output?.patch" class="flex items-start gap-1.5">
          <span class="text-[11px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 shrink-0">自动修复</span>
          <span class="text-indigo-600">{{ log.debug_output.patch.reason }}</span>
        </div>

        <!-- 参数 -->
        <div v-if="log.debug_output?.parameters">
          <span class="text-gray-500 block mb-1">参数:</span>
          <pre class="px-2 py-1.5 bg-gray-100 rounded text-[11px] font-mono text-gray-700 overflow-x-auto max-h-32">{{ formatJson(log.debug_output.parameters) }}</pre>
        </div>

        <!-- 成功返回 -->
        <div v-if="log.status === 'success' && log.debug_output?.result">
          <span class="text-gray-500 block mb-1">返回:</span>
          <pre class="px-2 py-1.5 bg-green-50 rounded text-[11px] font-mono text-green-800 overflow-x-auto max-h-32">{{ formatJson(log.debug_output.result) }}</pre>
        </div>

        <!-- 错误 -->
        <div v-if="log.debug_output?.error">
          <span class="text-gray-500 block mb-1">错误:</span>
          <pre class="px-2 py-1.5 bg-red-50 rounded text-[11px] font-mono text-red-700 overflow-x-auto max-h-24">{{ log.debug_output.error }}</pre>
        </div>

        <!-- 当前 URL -->
        <div v-if="log.debug_output?.current_url">
          <span class="text-gray-500">页面:</span>
          <span class="ml-1 text-gray-700">{{ log.debug_output.current_url }}</span>
        </div>

        <!-- 验证码识别图（调试用） -->
        <div v-if="log.debug_output?.captcha_image_b64">
          <span class="text-gray-500 block mb-1">验证码截图: <span class="text-gray-400 text-[10px]">点击查看大图</span></span>
          <img
            :src="'data:image/png;base64,' + log.debug_output.captcha_image_b64"
            class="max-w-[200px] rounded border border-gray-200 max-h-[80px] object-contain cursor-pointer hover:opacity-80 transition-opacity"
            @click="previewImage = 'data:image/png;base64,' + log.debug_output.captcha_image_b64"
          />
        </div>

        <!-- 截图（可点击放大） -->
        <div v-if="log.debug_output?.screenshot_b64">
          <span class="text-gray-500 block mb-1">浏览器画面: <span class="text-gray-400 text-[10px]">点击查看大图</span></span>
          <img
            :src="'data:image/png;base64,' + log.debug_output.screenshot_b64"
            class="max-w-full rounded border border-gray-200 max-h-[200px] object-contain cursor-pointer hover:opacity-80 transition-opacity"
            @click="previewImage = 'data:image/png;base64,' + log.debug_output.screenshot_b64"
          />
        </div>

        <!-- 变量 -->
        <div v-if="log.debug_output?.variables && Object.keys(log.debug_output.variables).length">
          <details>
            <summary class="text-gray-500 cursor-pointer hover:text-gray-700">查看变量</summary>
            <pre class="mt-1 px-2 py-1.5 bg-gray-100 rounded text-[11px] font-mono text-gray-700 overflow-x-auto max-h-24">{{ formatJson(log.debug_output.variables) }}</pre>
          </details>
        </div>
      </div>
    </div>

    <!-- 截图放大弹窗 -->
    <Teleport to="body">
      <div
        v-if="previewImage"
        class="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center cursor-pointer"
        @click="previewImage = null"
      >
        <img
          :src="previewImage"
          class="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
          @click.stop
        />
        <button
          @click="previewImage = null"
          class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors"
        >
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'

const props = defineProps({
  logs: { type: Array, default: () => [] },
  actionLabels: { type: Object, default: () => ({}) },
})

const expanded = reactive(new Set())
const previewImage = ref(null)

const toggle = (index) => {
  expanded.has(index) ? expanded.delete(index) : expanded.add(index)
}

// 判断是否有需要展开的复杂详情
const hasDetail = (log) => {
  const d = log.debug_output
  if (!d) return false
  return !!(d.error || d.screenshot_b64 || d.captcha_image_b64 || d.parameters || d.patch || d.result || d.current_url
    || (d.variables && Object.keys(d.variables).length))
}

// 失败的步骤自动展开
watch(() => props.logs.map(l => l.status), (statuses) => {
  statuses.forEach((s, i) => {
    if (s === 'failed' && hasDetail(props.logs[i])) {
      expanded.add(i)
    }
  })
}, { deep: true })

// 从 summary 中提取简短提示（如 value、username 等）
const summaryHint = (log) => {
  if (!log.summary) return ''
  const s = log.summary
  // "username: xxx" / "value: xxx" / "password: xxx" → 直接显示
  const m = s.match(/^(?:value|username|password|selected|result):\s*(.+)/i)
  if (m) return m[1].length > 40 ? m[1].slice(0, 40) + '…' : m[1]
  // 其余只在失败/重试时显示
  if (log.status === 'failed' || log.status === 'retrying') {
    return s.length > 50 ? s.slice(0, 50) + '…' : s
  }
  return ''
}

const dotClass = (status) => ({
  'bg-green-500': status === 'success',
  'bg-red-500': status === 'failed',
  'bg-amber-500 animate-pulse': status === 'retrying',
  'bg-blue-500 animate-pulse': status === 'running',
  'bg-gray-300': status === 'skipped',
  'bg-gray-400': !status,
})

const borderClass = (status) => ({
  'border-green-100': status === 'success',
  'border-red-200': status === 'failed',
  'border-amber-200': status === 'retrying',
  'border-blue-200': status === 'running',
  'border-gray-100': status === 'skipped' || !status,
})

const badgeClass = (status) => ({
  'bg-green-100 text-green-700': status === 'success',
  'bg-red-100 text-red-700': status === 'failed',
  'bg-amber-100 text-amber-700': status === 'retrying',
  'bg-blue-100 text-blue-700': status === 'running',
  'bg-gray-100 text-gray-500': status === 'skipped' || !status,
})

const statusLabel = (status) => {
  const map = { success: '成功', failed: '失败', retrying: '重试中', running: '执行中', skipped: '跳过' }
  return map[status] || '-'
}

const formatJson = (obj) => {
  try { return JSON.stringify(obj, null, 2) } catch { return String(obj) }
}
</script>
