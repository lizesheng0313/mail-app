<template>
  <div class="fixed inset-0 z-[160] flex items-center justify-center bg-gray-600 bg-opacity-50 p-4">
    <div
      class="relative w-full max-w-6xl rounded-lg border bg-white p-0 shadow-lg max-h-[90vh] overflow-hidden"
    >
      <!-- 头部 -->
      <div class="flex items-center justify-between p-6 border-b">
        <h3 class="text-xl font-semibold text-black">
          {{ t('executionHistory.breadcrumb') }}
        </h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-black">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- 内容 -->
      <div class="max-h-[calc(90vh-88px)] overflow-y-auto p-6">
        <AdminDataTable
          :loading="loading"
          :pagination="{ total: total, page: page, pageSize: pageSize, totalPages: totalPages }"
          :column-count="7"
          @page-change="changePage"
        >
          <template #thead>
            <tr>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {{ t('executionHistory.status') }}
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {{ t('executionHistory.orderNo') }}
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {{ t('executionHistory.executor') }}
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {{ t('executionHistory.startTime') }}
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {{ t('executionHistory.duration') }}
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {{ t('executionHistory.account') }}
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {{ t('executionHistory.actions') }}
              </th>
            </tr>
          </template>
          <template #tbody>
            <tr v-if="executions.length === 0">
              <td colspan="7" class="px-4 py-8 text-center text-gray-500">
                {{ t('executionHistory.empty') }}
              </td>
            </tr>
            <tr
              v-for="execution in executions"
              :key="execution.history_key || execution.execution_id"
              class="hover:bg-gray-50"
            >
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
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                <div
                  v-if="hasInventoryAccount(execution)"
                  class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                >
                  {{ t('executionHistory.accountCount', { count: getExecutionAccounts(execution).length }) }}
                </div>
                <span v-else>-</span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                <div class="flex items-center gap-2">
                  <button
                    v-if="hasInventoryAccount(execution)"
                    type="button"
                    class="font-medium text-primary-600 hover:text-primary-900"
                    @click="openAccountDialog(execution)"
                  >
                    {{ t('executionHistory.viewAccount') }}
                  </button>
                  <ActionButton
                    v-else-if="execution.status === 'failed' && marketStatus !== 'published'"
                    icon="refresh"
                    variant="warning"
                    size="sm"
                    :tooltip="t('executionHistory.retryTooltip')"
                    @click="retryExecution(execution)"
                  />
                  <span v-else>-</span>
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

  <ExecutionResultModal
    :visible="showAccountDialog"
    :execution-data="selectedExecution"
    @close="showAccountDialog = false"
  />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { workflowApi } from '@/api/workflow'
import { showMessage } from '@/utils/message'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import ExecutionResultModal from '../ExecutionResultModal/index.vue'
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

// 重试确认对话框
const showRetryConfirm = ref(false)
const retryLoading = ref(false)
const showAccountDialog = ref(false)
const selectedExecution = ref({})
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

const getExecutionAccounts = (execution) => {
  if (Array.isArray(execution?.inventory_accounts) && execution.inventory_accounts.length > 0) {
    return execution.inventory_accounts.map((item) => String(item ?? '').trim()).filter(Boolean)
  }

  const raw = execution?.inventory_account
  if (!raw) return []

  const normalized = String(raw).replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  return normalized
    .split(/\n\s*\n/g)
    .map((item) => item.trim())
    .filter(Boolean)
}

const hasInventoryAccount = (execution) => getExecutionAccounts(execution).length > 0

const openAccountDialog = (execution) => {
  selectedExecution.value = {
    ...execution,
    accounts: getExecutionAccounts(execution).map((account) => ({ account_data: account }))
  }
  showAccountDialog.value = true
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
    completed: 'bg-primary-100 text-success-800',
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
    completed: t('executionHistory.statusSuccess'),
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
