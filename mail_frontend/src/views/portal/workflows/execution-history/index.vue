<template>
  <div class="min-h-screen bg-[#f6f8fb]">
    <!-- 顶部导航 -->
    <PageHeader v-if="!isWorkspaceView" />
    
    <div
      class="mx-auto max-w-[1440px] space-y-6 px-4 pb-8 sm:px-6"
      :class="isWorkspaceView ? 'pt-0' : 'pt-6'"
    >
        <!-- 页面头部 -->
        <div
          v-if="!isWorkspaceView"
          class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
        >
          <h1 class="text-2xl font-semibold text-slate-900">
            {{ t('executionHistory.title') }}
          </h1>
          <p class="mt-2 text-sm leading-6 text-slate-600" v-if="currentWorkflowName">
            {{ t('executionHistory.workflowLabel', { name: currentWorkflowName }) }}
          </p>
          <p class="mt-2 text-sm leading-6 text-slate-600" v-else>
            {{ t('executionHistory.subtitle') }}
          </p>
        </div>

        <div
          v-else-if="currentWorkflowName"
          class="rounded-[20px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
        >
          当前工作流：<span class="font-medium text-slate-900">{{ currentWorkflowName }}</span>
        </div>
        
        <!-- 筛选和搜索 -->
        <div class="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div class="flex flex-wrap items-end gap-4">
            <!-- 搜索框 -->
            <div class="w-full sm:w-72">
              <div class="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                搜索
              </div>
              <BaseInput
                v-model="searchQuery"
                :placeholder="t('executionHistory.searchPlaceholder')"
                show-clear
              >
                <template #left-icon>
                  <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </template>
              </BaseInput>
            </div>
            <!-- 执行状态 -->
            <div class="w-full sm:w-40">
              <div class="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                状态
              </div>
              <CustomSelect
                v-model="selectedStatus"
                :options="statusOptions"
                @change="fetchExecutions"
              />
            </div>
            <!-- 时间范围 -->
            <div class="w-full sm:w-40">
              <div class="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                时间
              </div>
              <CustomSelect
                v-model="timeRange"
                :options="timeRangeOptions"
                @change="fetchExecutions"
              />
            </div>
            <!-- 查询按钮 -->
            <div class="flex items-center">
              <button
                @click="fetchExecutions"
                :disabled="loading"
                class="inline-flex h-11 items-center rounded-xl bg-primary-600 px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {{ t('executionHistory.search') }}
              </button>
            </div>
          </div>
        </div>

        <!-- 执行记录列表 -->
        <div v-if="!currentWorkflowId" class="rounded-[24px] border border-slate-200 bg-white p-10 text-center text-black shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-black">{{ t('executionHistory.noWorkflow') }}</h3>
            <p class="mt-1 text-sm text-black">{{ t('executionHistory.noWorkflowDesc') }}</p>
        </div>

        <AdminDataTable
          v-else
          :loading="loading"
          :pagination="{
            page: currentPage,
            pages: totalPages,
            total: executions.length,
            limit: pageSize
          }"
          :show-page-size-selector="true"
          :column-count="isPublishedWorkflow ? 7 : 6"
          @page-change="handlePageChange"
          @page-size-change="handlePageSizeChange"
        >
          <template #header>
            <h2 class="text-xl font-semibold text-slate-900">执行记录</h2>
          </template>
          <template #thead>
                <tr>
                  <th v-if="isPublishedWorkflow" class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">{{ t('executionHistory.orderNo') }}</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">{{ t('executionHistory.executor') }}</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">{{ t('executionHistory.triggerEmail') }}</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">{{ t('executionHistory.status') }}</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">{{ t('executionHistory.duration') }}</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">{{ t('executionHistory.startTime') }}</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-black uppercase tracking-wider">{{ t('executionHistory.actions') }}</th>
                </tr>
          </template>

          <template #tbody>
                <tr v-for="execution in paginatedExecutions" :key="execution.execution_id" class="hover:bg-slate-50/80 transition-colors">
                  <td v-if="isPublishedWorkflow" class="px-6 py-4">
                    <div class="text-sm font-medium text-slate-900">{{ execution.order_no || '-' }}</div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="space-y-1">
                      <div class="text-sm font-medium text-slate-900">{{ execution.executor_name || '-' }}</div>
                      <div class="text-xs text-slate-400">{{ execution.execution_id }}</div>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <template v-if="execution.email_id">
                      <div class="max-w-[260px] truncate text-sm font-medium text-slate-900" :title="execution.email_subject">
                        {{ execution.email_subject || t('executionHistory.untitled') }}
                      </div>
                      <div class="mt-1 text-xs text-slate-400">
                        {{ formatTime(execution.email_received_at) }}
                      </div>
                    </template>
                    <span v-else class="text-sm text-gray-300">-</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span :class="getStatusColor(execution.status)" class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold">
                      {{ getStatusText(execution.status) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {{ formatDuration(execution.duration) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {{ formatTime(execution.start_time) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex items-center justify-end gap-2">
                      <!-- 重试按钮 - 只在失败或取消状态显示 -->
                      <ActionButton
                        v-if="execution.status === 'failed' || execution.status === 'cancelled'"
                        icon="refresh"
                        :tooltip="t('executionHistory.retryTooltip')"
                        variant="warning"
                        @click="retryExecution(execution)"
                      />
                      <!-- 详情按钮 -->
                      <ActionButton
                        icon="view"
                        :tooltip="t('executionHistory.detailTooltip')"
                        variant="primary"
                        @click="viewExecutionDetail(execution)"
                      />
                    </div>
                  </td>
                </tr>

                <tr v-if="!paginatedExecutions.length">
                  <td :colspan="isPublishedWorkflow ? 7 : 6" class="px-6 py-12 text-center text-black">
                    {{ t('executionHistory.emptyDesc') }}
                  </td>
                </tr>
          </template>
        </AdminDataTable>

        <!-- 重新执行确认对话框 -->
        <ConfirmDialog
          :visible="showRetryConfirm"
          :title="t('executionHistory.retryDialogTitle')"
          :message="retryConfirmMessage"
          type="warning"
          :confirm-text="t('executionHistory.retryDialogConfirm')"
          :loading="retrying"
          @confirm="confirmRetry"
          @cancel="showRetryConfirm = false"
        />

        <!-- 执行结果弹窗 -->
        <ExecutionResultModal
          :visible="showExecutionResult"
          :execution-data="executionResultData"
          @close="showExecutionResult = false"
        />

        <!-- 执行日志对话框 -->
        <div v-if="showLogsModal" class="fixed inset-0 z-[160] overflow-y-auto">
          <div class="fixed inset-0 bg-slate-950/45 backdrop-blur-sm" @click="showLogsModal = false"></div>
          <div class="relative mx-auto flex min-h-screen max-w-7xl items-start justify-center px-4 py-8 sm:px-6">
            <div class="relative w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.25)]">
            <div class="border-b border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f6faf7_100%)] px-6 py-5">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div class="space-y-3">
                  <div>
                    <h3 class="text-xl font-semibold text-slate-900">{{ t('executionHistory.logsTitle') }}</h3>
                    <p class="mt-1 text-sm text-slate-500">
                      {{ currentWorkflowName || selectedExecution?.workflow_id || '-' }}
                    </p>
                  </div>
                  <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div class="rounded-2xl bg-white px-4 py-3 shadow-sm">
                      <div class="text-xs text-slate-400">状态</div>
                      <div class="mt-2">
                        <span :class="getStatusColor(selectedExecution?.status)" class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold">
                          {{ getStatusText(selectedExecution?.status) }}
                        </span>
                      </div>
                    </div>
                    <div class="rounded-2xl bg-white px-4 py-3 shadow-sm">
                      <div class="text-xs text-slate-400">执行者</div>
                      <div class="mt-2 text-sm font-medium text-slate-900">{{ selectedExecution?.executor_name || '-' }}</div>
                    </div>
                    <div class="rounded-2xl bg-white px-4 py-3 shadow-sm">
                      <div class="text-xs text-slate-400">开始时间</div>
                      <div class="mt-2 text-sm font-medium text-slate-900">{{ formatTime(selectedExecution?.start_time) }}</div>
                    </div>
                    <div class="rounded-2xl bg-white px-4 py-3 shadow-sm">
                      <div class="text-xs text-slate-400">耗时</div>
                      <div class="mt-2 text-sm font-medium text-slate-900">{{ formatDuration(selectedExecution?.duration) }}</div>
                    </div>
                  </div>
                </div>
                <button @click="showLogsModal = false" class="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-700">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              </div>
            </div>

            <div class="max-h-[76vh] overflow-y-auto px-6 py-6">
              <div
                v-if="executionErrorSummary"
                class="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4"
              >
                <div class="text-sm font-semibold text-red-700">失败原因</div>
                <div class="mt-2 text-sm leading-6 text-red-700">{{ executionErrorSummary }}</div>
                <div v-if="executionErrorDetailEntries.length" class="mt-3 grid gap-2 sm:grid-cols-2">
                  <div
                    v-for="item in executionErrorDetailEntries"
                    :key="item.label"
                    class="rounded-xl bg-white/80 px-3 py-2"
                  >
                    <div class="text-xs text-slate-400">{{ item.label }}</div>
                    <div class="mt-1 break-all text-sm font-medium text-slate-800">{{ item.value }}</div>
                  </div>
                </div>
              </div>

              <div v-if="loadingLogs" class="p-8 text-center">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto"></div>
                <p class="mt-2 text-black">{{ t('executionHistory.loadingLogs') }}</p>
              </div>
              
              <div v-else-if="executionLogs.length === 0" class="p-8 text-center text-black">
                {{ t('executionHistory.noLogs') }}
              </div>
              
              <div v-else class="space-y-3">
                <div
                  v-for="log in executionLogs"
                  :key="log.id"
                  class="rounded-2xl border p-4"
                  :class="getLogLevelColor(log.log_level)"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="mb-2 flex flex-wrap items-center gap-2">
                        <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="getLogLevelBadgeColor(log.log_level)">
                          {{ log.log_level }}
                        </span>
                        <span class="text-xs text-slate-500">{{ formatTime(log.created_at) }}</span>
                        <span v-if="log.step_name" class="text-xs text-slate-500">{{ log.step_name }}</span>
                      </div>
                      <p class="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{{ log.log_message }}</p>
                      <div v-if="getLogScreenshotUrl(log)" class="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                          <div class="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">截图预览</div>
                          <a
                            :href="getLogScreenshotUrl(log)"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-xs font-medium text-primary-600 hover:text-primary-700"
                          >
                            查看原图
                          </a>
                        </div>
                        <img
                          :src="getLogScreenshotUrl(log)"
                          alt="workflow screenshot"
                          class="max-h-[420px] w-full bg-slate-100 object-contain"
                        />
                      </div>
                      <div v-if="log.log_data && Object.keys(log.log_data).length > 0" class="mt-2">
                        <details class="text-xs">
                          <summary class="cursor-pointer font-medium text-slate-600">{{ t('executionHistory.detailData') }}</summary>
                          <div class="mt-2 overflow-x-auto rounded-xl bg-slate-900 px-3 py-3">
                            <pre class="min-w-0 whitespace-pre text-[12px] leading-6 text-slate-100">{{ JSON.stringify(log.log_data, null, 2) }}</pre>
                          </div>
                        </details>
                      </div>
                    </div>
                    <div v-if="log.execution_time_ms > 0" class="ml-4 shrink-0 text-xs text-slate-500">
                      {{ log.execution_time_ms }}ms
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { workflowApi } from '@/api/workflow'
import PageHeader from '@/components/PageHeader/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import ExecutionResultModal from '@/views/portal/workflows/components/ExecutionResultModal/index.vue'
import { showMessage } from '@/utils/message'
import { formatTimestamp } from '@/utils/timeUtils'
import { getApiBaseURL } from '@/services/api'

const { t } = useI18n()

// 获取路由信息
const route = useRoute()
const isWorkspaceView = computed(() => route.path.startsWith('/user/'))

// 响应式数据
const loading = ref(false)
const loadingLogs = ref(false)
const showLogsModal = ref(false)
const executions = ref([])
const workflows = ref([])
const selectedExecution = ref(null)
const executionLogs = ref([])
const showRetryConfirm = ref(false)
const retrying = ref(false)
const retryingExecution = ref(null)
const showExecutionResult = ref(false)
const executionResultData = ref({
  result: null
})

// 当前工作流信息
const currentWorkflowId = ref(route.query.workflow_id?.toString() || '')
const currentWorkflowName = ref('')
const currentWorkflowMarketStatus = ref('')

// 是否已发布到市场
const isPublishedWorkflow = computed(() => currentWorkflowMarketStatus.value === 'published')

// 筛选条件 - 固定当前工作流
const searchQuery = ref('')
const selectedStatus = ref('')
const timeRange = ref('')
const currentPage = ref(1)
const pageSize = ref(20)

// 下拉选项
const statusOptions = computed(() => [
  { label: t('executionHistory.allStatuses'), value: '' },
  { label: t('executionHistory.statusRunning'), value: 'running' },
  { label: t('executionHistory.statusSuccess'), value: 'success' },
  { label: t('executionHistory.statusFailed'), value: 'failed' },
  { label: t('executionHistory.statusCancelled'), value: 'cancelled' }
])

const timeRangeOptions = computed(() => [
  { label: t('executionHistory.allTime'), value: '' },
  { label: t('executionHistory.last1Hour'), value: '1h' },
  { label: t('executionHistory.last24Hours'), value: '24h' },
  { label: t('executionHistory.last7Days'), value: '7d' },
  { label: t('executionHistory.last30Days'), value: '30d' }
])

const totalPages = computed(() => {
  const total = executions.value.length
  return Math.max(1, Math.ceil(total / pageSize.value))
})

const paginatedExecutions = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return executions.value.slice(start, start + pageSize.value)
})

const latestErrorLog = computed(() =>
  executionLogs.value.find((log) => String(log.log_level || '').toUpperCase() === 'ERROR') || null
)

const executionErrorSummary = computed(() => {
  return (
    selectedExecution.value?.error_message ||
    latestErrorLog.value?.log_message ||
    ''
  )
})

const executionErrorDetailEntries = computed(() => {
  const detail = latestErrorLog.value?.log_data
  const entries = []
  if (selectedExecution.value?.failed_plugin) {
    entries.push({ label: '失败插件', value: String(selectedExecution.value.failed_plugin) })
  }

  if (!detail || typeof detail !== 'object') return entries

  if (detail.failed_plugin) {
    const failedPlugin = String(detail.failed_plugin)
    if (!entries.some((item) => item.label === '失败插件' && item.value === failedPlugin)) {
      entries.push({ label: '失败插件', value: failedPlugin })
    }
  }
  if (detail.error) {
    entries.push({ label: '错误详情', value: String(detail.error) })
  }
  return entries
})

// 计算属性
const retryConfirmMessage = computed(() => {
  if (!retryingExecution.value) return t('executionHistory.retryConfirmDefault')
  
  const workflow = workflows.value.find(w => w.workflow_id === retryingExecution.value.workflow_id)
  if (!workflow) return t('executionHistory.retryConfirmDefault')
  
  const price = workflow.milk_coin_price || 0
  const hasInventory = workflow.inventory_enabled && workflow.inventory_count > 0
  
  let message = t('executionHistory.retryConfirmName', { name: workflow.name })
  
  // 按次付费需要提示扣费
  if ((workflow.pricing_model === 'pay_per_use' || workflow.pricing_model === 'per_use') && price > 0) {
    message = t('executionHistory.retryConsume', { price })
  }
  
  // 有库存账号提示
  if (hasInventory) {
    message += `\n\n${t('executionHistory.inventoryAvailable', { count: workflow.inventory_count })}`
  }
  
  return message
})

// 生命周期
onMounted(() => {
  fetchWorkflows()
  fetchExecutions()
})

const handlePageChange = (page) => {
  currentPage.value = page
}

const handlePageSizeChange = (size) => {
  pageSize.value = Number(size || 20)
  currentPage.value = 1
}

// 方法
const fetchWorkflows = async () => {
  try {
    const response = await workflowApi.getWorkflows()
    if (response.code === 0 && response.data) {
      workflows.value = Array.isArray(response.data.workflows) ? response.data.workflows : []
      
      // 设置当前工作流名称和市场状态
      if (currentWorkflowId.value) {
        const currentWorkflow = workflows.value.find(w => w.workflow_id === currentWorkflowId.value)
        if (currentWorkflow) {
          currentWorkflowName.value = currentWorkflow.name
          currentWorkflowMarketStatus.value = currentWorkflow.market_status || ''
        }
      }
    }
  } catch (error) {
    console.error('加载工作流列表失败:', error)
  }
}

const fetchExecutions = async () => {
  loading.value = true
  try {
    let response
    let allExecutions = []
    
    // 根据是否指定workflow_id选择不同的API
    if (currentWorkflowId.value) {
      // 获取指定工作流的执行历史
      response = await workflowApi.getExecutionHistory(currentWorkflowId.value, 500)
    } else {
      // 获取所有工作流的执行历史
      response = await workflowApi.getAllExecutions(500, selectedStatus.value || null)
    }
    
    if (response.code === 0 && response.data && response.data.executions) {
      allExecutions = response.data.executions
    }
    
    // 应用状态筛选
    if (selectedStatus.value) {
      allExecutions = allExecutions.filter(exec => exec.status === selectedStatus.value)
    }
    
    // 应用时间筛选
    if (timeRange.value) {
      const now = new Date()
      let cutoffTime = new Date()
      
      switch (timeRange.value) {
        case '1h':
          cutoffTime.setHours(now.getHours() - 1)
          break
        case '24h':
          cutoffTime.setDate(now.getDate() - 1)
          break
        case '7d':
          cutoffTime.setDate(now.getDate() - 7)
          break
        case '30d':
          cutoffTime.setDate(now.getDate() - 30)
          break
      }
      
      allExecutions = allExecutions.filter(exec => new Date(exec.start_time) >= cutoffTime)
    }
    
    // 应用搜索筛选
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      allExecutions = allExecutions.filter(exec => 
        (exec.execution_id && exec.execution_id.toLowerCase().includes(query)) ||
        (currentWorkflowName.value && currentWorkflowName.value.toLowerCase().includes(query)) ||
        (exec.executor_name && exec.executor_name.toLowerCase().includes(query)) ||
        (exec.email_subject && exec.email_subject.toLowerCase().includes(query))
      )
    }
    
    executions.value = allExecutions
    currentPage.value = 1
    
  } catch (error) {
    console.error('加载执行历史失败:', error)
    showMessage(t('executionHistory.loadHistoryFailed'), 'error')
    executions.value = []
  } finally {
    loading.value = false
  }
}


// 查看执行详情 - 有账号显示账号弹窗，没账号显示日志
const viewExecutionDetail = (execution) => {
  if (execution.inventory_account) {
    // 有账号，显示账号弹窗
    executionResultData.value = {
      inventory_account: execution.inventory_account,
      result: execution.result
    }
    showExecutionResult.value = true
  } else {
    // 没账号，显示日志弹窗
    viewExecutionLogs(execution)
  }
}

const viewExecutionLogs = async (execution) => {
  selectedExecution.value = execution
  showLogsModal.value = true
  loadingLogs.value = true
  
  try {
    // 调用后端的日志API - 使用正确的endpoint
    const response = await workflowApi.getExecutionLogs(execution.workflow_id, execution.execution_id)
    if (response.code === 0 && response.data) {
      executionLogs.value = response.data.logs || []
    } else {
      executionLogs.value = []
      console.warn('获取日志失败:', response.message)
    }
  } catch (error) {
    console.error('加载执行日志失败:', error)
    executionLogs.value = []
    showMessage(t('executionHistory.loadLogsFailed'), 'error')
  } finally {
    loadingLogs.value = false
  }
}


const getWorkflowName = (workflowId) => {
  return currentWorkflowName.value || workflowId
}

const getStatusText = (status) => {
  const statusMap = {
    'created': t('executionHistory.statusCreated'),
    'running': t('executionHistory.statusRunning'),
    'success': t('executionHistory.statusSuccess'),
    'failed': t('executionHistory.statusFailed'),
    'cancelled': t('executionHistory.statusCancelled')
  }
  return statusMap[status] || status
}

const getStatusColor = (status) => {
  const colorMap = {
    'created': 'bg-amber-100 text-amber-700',
    'running': 'bg-sky-100 text-sky-700',
    'success': 'bg-emerald-100 text-emerald-700',
    'failed': 'bg-red-100 text-red-700',
    'cancelled': 'bg-slate-200 text-slate-700'
  }
  return colorMap[status] || 'bg-gray-100 text-black'
}

const getLogLevelColor = (level) => {
  const colorMap = {
    'DEBUG': 'bg-slate-50 border-slate-200',
    'INFO': 'bg-sky-50 border-sky-200',
    'WARN': 'bg-amber-50 border-amber-200',
    'ERROR': 'bg-red-50 border-red-200'
  }
  return colorMap[level] || 'bg-gray-50 border-gray-200'
}

const getLogLevelBadgeColor = (level) => {
  const colorMap = {
    'DEBUG': 'bg-slate-200 text-slate-700',
    'INFO': 'bg-sky-100 text-sky-700',
    'WARN': 'bg-amber-100 text-amber-700',
    'ERROR': 'bg-red-100 text-red-700'
  }
  return colorMap[level] || 'bg-gray-100 text-black'
}

const getLogScreenshotUrl = (log) => {
  const screenshotUrl = log?.log_data?.screenshot_url
  if (typeof screenshotUrl !== 'string' || !screenshotUrl) return ''
  if (screenshotUrl.startsWith('http://') || screenshotUrl.startsWith('https://')) return screenshotUrl

  const apiBaseURL = getApiBaseURL()
  const screenshotMatch = screenshotUrl.match(/\/uploads\/automation_screenshots\/([^/?#]+)/)
  if (screenshotMatch?.[1]) {
    const base = apiBaseURL.replace(/\/$/, '')
    return `${base}/workflows/screenshots/${encodeURIComponent(screenshotMatch[1])}`
  }

  if (apiBaseURL.startsWith('http://') || apiBaseURL.startsWith('https://')) {
    return `${apiBaseURL.replace(/\/mail-api\/v1\/?$/, '')}${screenshotUrl}`
  }

  return `${window.location.origin}${screenshotUrl}`
}


const formatDuration = (duration) => {
  if (!duration) return '0ms'
  if (duration < 1000) return `${duration}ms`
  if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`
  return `${(duration / 60000).toFixed(1)}min`
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  return formatTimestamp(timestamp, 'datetime')
}

const retryExecution = (execution) => {
  retryingExecution.value = execution
  showRetryConfirm.value = true
}

const confirmRetry = async () => {
  if (!retryingExecution.value) return
  
  showRetryConfirm.value = false
  retrying.value = true
  
  try {
    const response = await workflowApi.retryExecution(retryingExecution.value.execution_id)
    if (response.code === 0) {
      const data = response.data
      
      // 检查是否有库存账号
      const hasInventoryAccount = data?.result?.data?.variables?.inventory_account
      
      if (hasInventoryAccount) {
        // 有账号，弹窗显示
        executionResultData.value = {
          result: data.result
        }
        showExecutionResult.value = true
      } else {
        // 没有账号，只显示提示
        showMessage(response.message || t('executionHistory.executionSuccess'), 'success')
      }
      
      // 刷新执行列表
      await fetchExecutions()
    } else {
      showMessage(response.message || t('executionHistory.retryFailed'), 'error')
    }
  } catch (error) {
    console.error('重试工作流失败:', error)
    showMessage(t('executionHistory.retryFailed'), 'error')
  } finally {
    retrying.value = false
    retryingExecution.value = null
  }
}

</script>
