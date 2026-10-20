<template>
  <section class="monitoring-panel">
    <div class="monitoring-panel-header">
      <div class="monitoring-panel-heading">
        <h3 class="monitoring-panel-title">网页助手队列与工作流历史</h3>
        <p class="monitoring-panel-description">
          队列仅含网页助手任务；历史执行记录统计全站所有类型工作流，不限日期。
        </p>
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
    <div class="monitoring-metrics" :aria-busy="loading">
      <MetricCard
        label="网页助手运行中"
        :value="loading ? '—' : status?.active_count || 0"
        :detail="`最大并发 ${status?.max_concurrent || 5}`"
      />
      <MetricCard
        label="网页助手排队中"
        :value="loading ? '—' : status?.queue_count || 0"
        detail="队列任务"
      />
      <MetricCard
        label="历史已完成执行"
        :value="loading ? '—' : completedWorkflowsCount.toLocaleString('zh-CN')"
        detail="全站累计执行记录，非工作流个数"
      />
      <MetricCard
        label="历史失败执行"
        :value="loading ? '—' : failedWorkflowsCount.toLocaleString('zh-CN')"
        detail="全站累计失败执行记录"
        value-class="text-red-600"
      />
    </div>
    <p class="monitoring-panel-description mt-3">
      每条执行记录计一次。同一工作流收到不同邮件可多次触发；“已完成”表示流程执行状态，不能据此判断第三方业务结果。
    </p>
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
const failedWorkflowsCount = ref(0)
const completedWorkflowsCount = ref(0)

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

// 加载失败工作流总数
const loadFailedWorkflowsCount = async () => {
  try {
    // 使用新的统计API，管理员可以查看所有用户的失败工作流
    const response = await workflowApi.getWorkflowCountByStatus('failed')
    if (response.code === 0 && response.data) {
      failedWorkflowsCount.value = response.data.count || 0
    }
  } catch (error: any) {
    console.error('获取失败工作流数量失败:', error)
  }
}

// 加载成功工作流总数
const loadCompletedWorkflowsCount = async () => {
  try {
    // 使用新的统计API，管理员可以查看所有用户的成功工作流
    const response = await workflowApi.getWorkflowCountByStatus('completed')
    if (response.code === 0 && response.data) {
      completedWorkflowsCount.value = response.data.count || 0
    }
  } catch (error: any) {
    console.error('获取成功工作流数量失败:', error)
  }
}

// 刷新状态
const refreshStatus = async (notify = true) => {
  await Promise.all([loadStatus(), loadFailedWorkflowsCount(), loadCompletedWorkflowsCount()])
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
