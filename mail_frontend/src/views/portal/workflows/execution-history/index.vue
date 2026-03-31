<template>
  <div>
    <!-- 顶部导航 -->
    <PageHeader />
    
    <div class="bg-gray-50 pb-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- 面包屑导航 -->
        <nav class="flex mb-6" aria-label="Breadcrumb">
          <ol class="inline-flex items-center space-x-1 md:space-x-3">
            <li class="inline-flex items-center">
              <router-link to="/automation" class="inline-flex items-center text-sm font-medium text-black hover:text-primary-600">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {{ t('executionHistory.automationCenter') }}
              </router-link>
            </li>
            <li>
              <div class="flex items-center">
                <svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                </svg>
                <router-link to="/automation/workflows" class="ml-1 text-sm font-medium text-black hover:text-primary-600 md:ml-2">{{ t('executionHistory.workflowManagement') }}</router-link>
              </div>
            </li>
            <li>
              <div class="flex items-center">
                <svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                </svg>
                <span class="ml-1 text-sm font-medium text-black md:ml-2">{{ t('executionHistory.breadcrumb') }}</span>
              </div>
            </li>
          </ol>
        </nav>

        <!-- 页面头部 -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-black">{{ t('executionHistory.title') }}</h1>
              <p class="mt-2 text-black" v-if="currentWorkflowName">{{ t('executionHistory.workflowLabel', { name: currentWorkflowName }) }}</p>
              <p class="mt-2 text-black" v-else>{{ t('executionHistory.subtitle') }}</p>
            </div>
          </div>
        </div>

        <!-- 筛选和搜索 -->
        <div class="mb-6 bg-white p-4 rounded-lg shadow">
          <div class="flex flex-wrap items-center gap-4">
            <!-- 搜索框 -->
            <div class="w-64">
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
            <div class="w-32">
              <CustomSelect
                v-model="selectedStatus"
                :options="statusOptions"
                @change="fetchExecutions"
              />
            </div>
            <!-- 时间范围 -->
            <div class="w-32">
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
                class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ t('executionHistory.search') }}
              </button>
            </div>
          </div>
        </div>

        <!-- 执行记录列表 -->
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <div v-if="loading" class="p-8 text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
            <p class="mt-2 text-black">{{ t('executionHistory.loading') }}</p>
          </div>
          
          <div v-else-if="!currentWorkflowId" class="p-8 text-center text-black">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-black">{{ t('executionHistory.noWorkflow') }}</h3>
            <p class="mt-1 text-sm text-black">{{ t('executionHistory.noWorkflowDesc') }}</p>
          </div>
          
          <div v-else-if="executions.length === 0" class="p-8 text-center text-black">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-black">{{ t('executionHistory.empty') }}</h3>
            <p class="mt-1 text-sm text-black">{{ t('executionHistory.emptyDesc') }}</p>
          </div>
          
          <div v-else>
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th v-if="isPublishedWorkflow" class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">{{ t('executionHistory.orderNo') }}</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">{{ t('executionHistory.executor') }}</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">{{ t('executionHistory.triggerEmail') }}</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">{{ t('executionHistory.status') }}</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">{{ t('executionHistory.duration') }}</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">{{ t('executionHistory.startTime') }}</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-black uppercase tracking-wider">{{ t('executionHistory.actions') }}</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="execution in executions" :key="execution.execution_id" class="hover:bg-gray-50">
                  <td v-if="isPublishedWorkflow" class="px-6 py-4">
                    <div class="text-sm text-black">{{ execution.order_no || '-' }}</div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="text-sm text-black">{{ execution.executor_name || '-' }}</div>
                  </td>
                  <td class="px-6 py-4">
                    <template v-if="execution.email_id">
                      <div class="text-sm text-black truncate max-w-[200px]" :title="execution.email_subject">
                        {{ execution.email_subject || t('executionHistory.untitled') }}
                      </div>
                      <div class="text-xs text-gray-400 mt-0.5">
                        {{ formatTime(execution.email_received_at) }}
                      </div>
                    </template>
                    <span v-else class="text-sm text-gray-300">-</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span :class="getStatusColor(execution.status)" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                      {{ getStatusText(execution.status) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-black">
                    {{ formatDuration(execution.duration) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-black">
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
              </tbody>
            </table>
          </div>
        </div>

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
        <div v-if="showLogsModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div class="relative top-10 mx-auto p-5 border w-11/12 max-w-7xl shadow-lg rounded-md bg-white">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-medium text-black">{{ t('executionHistory.logsTitle') }}</h3>
              <button @click="showLogsModal = false" class="text-gray-400 hover:text-black">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            

            <div class="max-h-[70vh] overflow-y-auto">
              <div v-if="loadingLogs" class="p-8 text-center">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto"></div>
                <p class="mt-2 text-black">{{ t('executionHistory.loadingLogs') }}</p>
              </div>
              
              <div v-else-if="executionLogs.length === 0" class="p-8 text-center text-black">
                {{ t('executionHistory.noLogs') }}
              </div>
              
              <div v-else class="space-y-2">
                <div v-for="log in executionLogs" :key="log.id" class="p-3 border rounded-md" :class="getLogLevelColor(log.log_level)">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center space-x-2 mb-1">
                        <span class="text-xs font-medium px-2 py-1 rounded" :class="getLogLevelBadgeColor(log.log_level)">
                          {{ log.log_level }}
                        </span>
                        <span class="text-xs text-black">{{ formatTime(log.created_at) }}</span>
                        <span v-if="log.step_name" class="text-xs text-black">{{ log.step_name }}</span>
                      </div>
                      <p class="text-sm text-black whitespace-pre-wrap break-words">{{ log.log_message }}</p>
                      <div v-if="log.log_data && Object.keys(log.log_data).length > 0" class="mt-2">
                        <details class="text-xs">
                          <summary class="cursor-pointer text-black">{{ t('executionHistory.detailData') }}</summary>
                          <div class="mt-1 p-2 bg-gray-100 rounded overflow-x-auto">
                            <pre class="text-black whitespace-pre min-w-0">{{ JSON.stringify(log.log_data, null, 2) }}</pre>
                          </div>
                        </details>
                      </div>
                    </div>
                    <div v-if="log.execution_time_ms > 0" class="text-xs text-black">
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
import BaseIcon from '@/components/BaseIcon/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import ExecutionResultModal from '@/views/portal/workflows/components/ExecutionResultModal/index.vue'
import { showMessage } from '@/utils/message'
import { formatTimestamp } from '@/utils/timeUtils'

const { t } = useI18n()

// 获取路由信息
const route = useRoute()

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
const pageSize = ref('50')

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
      response = await workflowApi.getExecutionHistory(currentWorkflowId.value, parseInt(pageSize.value))
    } else {
      // 获取所有工作流的执行历史
      response = await workflowApi.getAllExecutions(parseInt(pageSize.value), selectedStatus.value || null)
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
        (currentWorkflowName.value && currentWorkflowName.value.toLowerCase().includes(query))
      )
    }
    
    executions.value = allExecutions
    
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
    'created': 'bg-yellow-100 text-yellow-800',
    'running': 'bg-primary-100 text-primary-800',
    'success': 'bg-primary-100 text-success-800',
    'failed': 'bg-red-100 text-red-800',
    'cancelled': 'bg-gray-100 text-black'
  }
  return colorMap[status] || 'bg-gray-100 text-black'
}

const getLogLevelColor = (level) => {
  const colorMap = {
    'DEBUG': 'bg-gray-50 border-gray-200',
    'INFO': 'bg-primary-50 border-primary-200',
    'WARN': 'bg-yellow-50 border-yellow-200',
    'ERROR': 'bg-red-50 border-red-200'
  }
  return colorMap[level] || 'bg-gray-50 border-gray-200'
}

const getLogLevelBadgeColor = (level) => {
  const colorMap = {
    'DEBUG': 'bg-gray-100 text-black',
    'INFO': 'bg-primary-100 text-primary-800',
    'WARN': 'bg-yellow-100 text-yellow-800',
    'ERROR': 'bg-red-100 text-red-800'
  }
  return colorMap[level] || 'bg-gray-100 text-black'
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

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    showMessage(t('executionHistory.copied'), 'success')
  } catch (error) {
    showMessage(t('executionHistory.copyFailed'), 'error')
  }
}

// 将账号数据按行分割
const getAccountLines = (accountData) => {
  if (!accountData) return []
  return accountData.split('\n').filter(line => line.trim())
}
</script>
