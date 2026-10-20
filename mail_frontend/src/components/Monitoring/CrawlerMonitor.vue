<template>
  <section class="monitoring-panel">
    <div class="monitoring-panel-header">
      <div class="monitoring-panel-heading">
        <h3 class="monitoring-panel-title">自动化执行监控</h3>
      </div>
      <button
        type="button"
        class="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        :disabled="loading"
        @click="refreshStatus()"
      >
        <svg
          class="h-4 w-4"
          :class="{ 'animate-spin': loading }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        {{ loading ? '刷新中' : '刷新' }}
      </button>
    </div>
    <div class="monitoring-metrics monitoring-execution-metrics" :aria-busy="loading">
      <MetricCard label="网页助手运行中" :value="loading ? '—' : status?.active_count || 0" />
      <MetricCard label="网页助手排队中" :value="loading ? '—' : status?.queue_count || 0" />
      <MetricCard
        label="服务端工作流完成累计"
        :value="loading ? '—' : completedExecutionCount.toLocaleString('zh-CN')"
      />
      <MetricCard
        label="服务端工作流失败累计"
        :value="loading ? '—' : failedExecutionCount.toLocaleString('zh-CN')"
        value-class="text-red-600"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { workflowApi } from '@/api/workflow'
import { showMessage } from '@/utils/message'
import MetricCard from './MetricCard.vue'

// 响应式数据
const loading = ref(false)
const status = ref<any>(null)
const failedExecutionCount = ref(0)
const completedExecutionCount = ref(0)

// 加载爬虫连接池状态
const loadStatus = async () => {
  try {
    loading.value = true
    const response = await workflowApi.getCrawlerPoolStatus()
    if (response.code === 0) {
      status.value = response.data
    }
  } catch (error: any) {
    console.error('获取爬虫池状态失败:', error)
    showMessage('获取爬虫池状态失败', 'error')
  } finally {
    loading.value = false
  }
}

// 加载失败的工作流执行记录数
const loadFailedExecutionCount = async () => {
  try {
    // 接口按 workflow_executions.status 统计全站执行记录。
    const response = await workflowApi.getWorkflowCountByStatus('failed')
    if (response.code === 0 && response.data) {
      failedExecutionCount.value = response.data.count || 0
    }
  } catch (error: any) {
    console.error('获取失败执行记录数失败:', error)
  }
}

// 加载已完成的工作流执行记录数
const loadCompletedExecutionCount = async () => {
  try {
    // 这里统计执行记录，不是工作流定义数或触发器日志数。
    const response = await workflowApi.getWorkflowCountByStatus('completed')
    if (response.code === 0 && response.data) {
      completedExecutionCount.value = response.data.count || 0
    }
  } catch (error: any) {
    console.error('获取已完成执行记录数失败:', error)
  }
}

// 刷新状态
const refreshStatus = async (notify = true) => {
  await Promise.all([loadStatus(), loadFailedExecutionCount(), loadCompletedExecutionCount()])
  if (notify) showMessage('执行状态已刷新', 'success')
}

// 暴露刷新方法给父组件
defineExpose({
  refreshStatus
})

// 组件加载时获取数据
onMounted(() => {
  refreshStatus(false)
})
</script>
