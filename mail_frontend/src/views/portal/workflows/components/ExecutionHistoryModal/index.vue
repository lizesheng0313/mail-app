<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-0 border max-w-5xl shadow-lg rounded-lg bg-white">
      <!-- 头部 -->
      <div class="flex items-center justify-between p-6 border-b">
        <h3 class="text-xl font-semibold text-black">
          {{ t('executionHistory.breadcrumb') }}
        </h3>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-black"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 内容 -->
      <div class="p-6">
        <AdminDataTable
          :loading="loading"
          :pagination="{ total: total, page: page, pageSize: pageSize, totalPages: totalPages }"
          :column-count="6"
          @page-change="changePage"
        >
          <template #thead>
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{{ t('executionHistory.status') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{{ t('executionHistory.orderNo') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{{ t('executionHistory.executor') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{{ t('executionHistory.startTime') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{{ t('executionHistory.duration') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{{ t('executionHistory.actions') }}</th>
            </tr>
          </template>
          <template #tbody>
            <tr v-if="executions.length === 0">
              <td colspan="6" class="px-4 py-8 text-center text-gray-500">{{ t('executionHistory.empty') }}</td>
            </tr>
            <tr v-for="execution in executions" :key="execution.execution_id" class="hover:bg-gray-50">
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                  :class="getExecutionStatusClass(execution.status)"
                >
                  {{ getExecutionStatusText(execution.status) }}
                </span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {{ execution.order_no || '-' }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                {{ execution.executor_name || '-' }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                {{ formatTime(execution.start_time) }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                {{ formatDuration(execution.duration) }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm">
                <div class="flex items-center space-x-2">
                  <ActionButton
                    icon="view"
                    variant="primary"
                    size="sm"
                    :tooltip="t('executionHistory.detailTooltip')"
                    @click="viewExecutionDetail(execution)"
                  />
                  <ActionButton
                    v-if="execution.status === 'failed' && marketStatus !== 'published'"
                    icon="refresh"
                    variant="warning"
                    size="sm"
                    :tooltip="t('executionHistory.retryTooltip')"
                    @click="retryExecution(execution)"
                  />
                </div>
              </td>
            </tr>
          </template>
        </AdminDataTable>
      </div>
    </div>
  </div>

  <!-- 重试确认对话框 -->
  <ConfirmDialog
    :visible="showRetryConfirm"
    :title="t('executionHistory.retryDialogTitle')"
    :message="retryConfirmData.message"
    type="warning"
    :confirm-text="t('executionHistory.retryDialogConfirm')"
    :loading="retryLoading"
    @confirm="confirmRetry"
    @cancel="showRetryConfirm = false"
  />

  <!-- 执行结果弹窗 -->
  <ExecutionResultModal
    :visible="showResultModal"
    :execution-data="resultData"
    @close="showResultModal = false"
  />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { workflowApi } from '@/api/workflow'
import { showMessage } from '@/utils/message'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import ExecutionResultModal from '../ExecutionResultModal/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import { getCurrentLocale } from '@/i18n'

const props = defineProps({
  workflowId: {
    type: String,
    required: true
  },
  marketStatus: {
    type: String,
    default: null
  }
})

const { t } = useI18n()

// 响应式数据
const loading = ref(false)
const allExecutions = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = computed(() => allExecutions.value.length)
const totalPages = computed(() => Math.ceil(total.value / pageSize.value))
const executions = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return allExecutions.value.slice(start, start + pageSize.value)
})

// 执行结果弹窗
const showResultModal = ref(false)
const resultData = ref(null)

// 重试确认对话框
const showRetryConfirm = ref(false)
const retryLoading = ref(false)
const retryConfirmData = ref({
  execution: null,
  price: 0,
  message: ''
})

// 方法
const fetchExecutions = async () => {
  try {
    loading.value = true

    const response = await workflowApi.getExecutionHistory(props.workflowId, 500)
    
    // 处理两种可能的响应格式
    allExecutions.value = response.data?.executions || response.executions || []

  } catch (error) {
    console.error('获取执行历史失败:', error)
    showMessage(t('executionHistory.loadHistoryFailed'), 'error')
  } finally {
    loading.value = false
  }
}

const changePage = (newPage) => {
  if (newPage < 1 || newPage > totalPages.value) return
  page.value = newPage
}

const viewExecutionDetail = (execution) => {
  resultData.value = {
    execution_id: execution.execution_id,
    status: execution.status,
    result: execution.result,
    inventory_account: execution.inventory_account,
    error_message: execution.error_message
  }
  showResultModal.value = true
}

const retryExecution = async (execution) => {
  try {
    // 查询工作流的定价模式
    const workflowDetail = await workflowApi.getWorkflow(props.workflowId)
    const pricingModel = workflowDetail.data?.pricing_model
    const price = workflowDetail.data?.price || 0
    
    // 如果是按次付费，需要用户确认扣费
    if (pricingModel === 'pay_per_use' && price > 0) {
      retryConfirmData.value = {
        execution,
        price,
        message: t('executionHistory.retryConsume', { price })
      }
      showRetryConfirm.value = true
    } else {
      // 免费、订阅、一次性购买：直接执行
      await executeRetry(execution)
    }
  } catch (error) {
    showMessage(t('executionHistory.retryFailed'), 'error')
  }
}

// 确认重试
const confirmRetry = async () => {
  await executeRetry(retryConfirmData.value.execution)
  showRetryConfirm.value = false
}

// 执行重试
const executeRetry = async (execution) => {
  retryLoading.value = true
  try {
    await workflowApi.executeWorkflow(props.workflowId, execution.variables)
    showMessage(t('executionHistory.executionSuccess'), 'success')
    fetchExecutions()
  } catch (error) {
    showMessage(t('executionHistory.retryFailed'), 'error')
  } finally {
    retryLoading.value = false
  }
}

const getExecutionStatusClass = (status) => {
  const classes = {
    created: 'bg-gray-100 text-black',
    running: 'bg-primary-100 text-success-800',
    paused: 'bg-yellow-100 text-yellow-800',
    success: 'bg-primary-100 text-success-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-black'
  }
  return classes[status] || 'bg-gray-100 text-black'
}

const getExecutionStatusText = (status) => {
  const texts = {
    created: t('executionHistory.statusCreated'),
    running: t('executionHistory.statusRunning'),
    paused: t('executionHistory.statusPaused'),
    success: t('executionHistory.statusSuccess'),
    failed: t('executionHistory.statusFailed'),
    cancelled: t('executionHistory.statusCancelled')
  }
  return texts[status] || status
}

const formatTime = (dateString) => {
  if (!dateString) return t('common.unknown')
  return new Date(dateString).toLocaleString(getCurrentLocale())
}

const formatDuration = (duration) => {
  if (!duration) return '0ms'
  if (duration < 1000) return `${duration}ms`
  if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`
  return `${(duration / 60000).toFixed(1)}min`
}

// 生命周期
onMounted(() => {
  fetchExecutions()
})
</script>
