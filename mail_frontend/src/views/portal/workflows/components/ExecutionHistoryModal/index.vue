<template>
  <div class="fixed inset-0 z-[160] flex items-center justify-center bg-gray-600 bg-opacity-50 p-4">
    <div class="relative w-full max-w-6xl rounded-lg border bg-white p-0 shadow-lg max-h-[90vh] overflow-hidden">
      <div class="flex items-center justify-between border-b p-6">
        <h3 class="text-xl font-semibold text-black">执行记录</h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-black">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div class="max-h-[calc(90vh-88px)] overflow-y-auto p-6">
        <AdminDataTable
          :loading="loading"
          :pagination="{ total, page, pageSize, totalPages }"
          :column-count="7"
          @page-change="changePage"
        >
          <template #thead>
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ t('executionHistory.orderNo') }}
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ t('executionHistory.executor') }}
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ t('executionHistory.triggerEmail') }}
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ t('executionHistory.status') }}
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ t('executionHistory.duration') }}
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ t('executionHistory.startTime') }}
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
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
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {{ execution.order_no || '-' }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                {{ execution.executor_name || '-' }}
              </td>
              <td class="px-4 py-3">
                <template v-if="execution.email_id">
                  <div class="max-w-[220px] truncate text-sm font-medium text-slate-900" :title="execution.email_subject">
                    {{ execution.email_subject || t('executionHistory.untitled') }}
                  </div>
                  <div class="mt-1 text-xs text-slate-400">
                    {{ formatTime(execution.email_received_at) }}
                  </div>
                </template>
                <span v-else class="text-sm text-gray-300">-</span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="inline-flex items-center gap-1.5">
                  <span
                    class="inline-flex rounded-full px-2 py-1 text-xs font-semibold"
                    :class="getDisplayStatusClass(execution)"
                  >
                    {{ getDisplayStatusText(execution) }}
                  </span>
                  <HoverTooltip
                    v-if="execution.refund_status === 'rejected' && getRefundHint(execution)"
                    :text="getRefundHint(execution)"
                    placement="top"
                  >
                    <span
                      class="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-red-200 bg-red-50 text-[10px] font-bold leading-none text-red-600"
                    >
                      !
                    </span>
                  </HoverTooltip>
                </div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                {{ formatDuration(execution.duration) }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                {{ formatTime(execution.start_time) }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">
                <div class="flex items-center justify-end gap-2">
                  <ActionButton
                    v-if="execution.status === 'failed' || execution.status === 'cancelled'"
                    icon="refresh"
                    variant="warning"
                    size="sm"
                    :tooltip="t('executionHistory.retryTooltip')"
                    @click="retryExecution(execution)"
                  />
                  <ActionButton
                    icon="view"
                    variant="primary"
                    size="sm"
                    :tooltip="t('executionHistory.detailTooltip')"
                    @click="viewExecutionDetail(execution)"
                  />
                  <ActionButton
                    v-if="canShowRefundAction(execution)"
                    icon="refund"
                    variant="warning"
                    size="sm"
                    tooltip="申请退款"
                    @click="openRefundConfirm(execution)"
                  />
                </div>
              </td>
            </tr>
          </template>
        </AdminDataTable>
      </div>
    </div>
  </div>

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

  <ConfirmDialog
    v-model:visible="showRefundConfirm"
    title="确认申请退款"
    :message="refundConfirmMessage"
    type="warning"
    confirm-text="申请退款"
    :loading="refunding"
    @confirm="confirmRefund"
    @cancel="showRefundConfirm = false"
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
import { requestWorkflowRefund } from '@/api/workflowMarket'
import { showMessage } from '@/utils/message'
import { showPrompt } from '@/utils/dialog'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import HoverTooltip from '@/components/HoverTooltip/index.vue'
import ExecutionResultModal from '../ExecutionResultModal/index.vue'
import { getCurrentLocale } from '@/i18n'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  workflowId: {
    type: String,
    required: true
  },
  marketStatus: {
    type: String,
    default: null
  },
  authorId: {
    type: Number,
    default: 0
  }
})

defineEmits(['close'])

const { t } = useI18n()
const userStore = useUserStore()

const loading = ref(false)
const allExecutions = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = computed(() => allExecutions.value.length)
const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)
const executions = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return allExecutions.value.slice(start, start + pageSize.value)
})
const showRetryConfirm = ref(false)
const retryLoading = ref(false)
const showAccountDialog = ref(false)
const selectedExecution = ref({})
const showRefundConfirm = ref(false)
const refunding = ref(false)
const refundTarget = ref(null)
const retryConfirmData = ref({
  execution: null,
  price: 0,
  message: ''
})
const currentWorkflowIsOwner = computed(() => Number(userStore.user?.id || 0) === Number(props.authorId || 0))
const refundConfirmMessage = computed(() => {
  if (!refundTarget.value) return '确定要发起退款申请吗？'
  return `确定要对订单“${refundTarget.value.order_no || refundTarget.value.purchase_id || refundTarget.value.id}”发起退款申请吗？\n\n提交后会进入退款处理流程，商家会先处理，平台也可以介入强制退款。`
})

const fetchExecutions = async () => {
  try {
    loading.value = true
    const response = await workflowApi.getExecutionHistory(props.workflowId, 500)
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

const openAccountDialog = (execution) => {
  selectedExecution.value = {
    ...execution,
    accounts: getExecutionAccounts(execution).map((account) => ({ account_data: account }))
  }
  showAccountDialog.value = true
}

const viewExecutionDetail = (execution) => {
  openAccountDialog(execution)
}

const retryExecution = async (execution) => {
  try {
    const workflowDetail = await workflowApi.getWorkflow(props.workflowId)
    const pricingModel = workflowDetail.data?.pricing_model
    const price = workflowDetail.data?.price || 0

    if (pricingModel === 'pay_per_use' && price > 0) {
      retryConfirmData.value = {
        execution,
        price,
        message: t('executionHistory.retryConsume', { price })
      }
      showRetryConfirm.value = true
    } else {
      await executeRetry(execution)
    }
  } catch (error) {
    showMessage(t('executionHistory.retryFailed'), 'error')
  }
}

const confirmRetry = async () => {
  await executeRetry(retryConfirmData.value.execution)
  showRetryConfirm.value = false
}

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

const getStatusText = (status) => {
  const statusMap = {
    created: t('executionHistory.statusCreated'),
    running: t('executionHistory.statusRunning'),
    paused: t('executionHistory.statusPaused'),
    completed: t('executionHistory.statusSuccess'),
    success: t('executionHistory.statusSuccess'),
    failed: t('executionHistory.statusFailed'),
    cancelled: t('executionHistory.statusCancelled')
  }
  return statusMap[status] || status
}

const getStatusClass = (status) => {
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

const getDisplayStatusText = (execution) => {
  if (currentWorkflowIsOwner.value) return getStatusText(execution?.status)
  if (execution?.refund_status === 'pending') return '退款中'
  if (execution?.refund_status === 'rejected') return '已拒绝'
  if (execution?.refund_status === 'refunded') return '已退款'
  return getStatusText(execution?.status)
}

const getDisplayStatusClass = (execution) => {
  if (currentWorkflowIsOwner.value) return getStatusClass(execution?.status)
  if (execution?.refund_status === 'pending') return 'bg-amber-100 text-amber-700'
  if (execution?.refund_status === 'rejected') return 'bg-red-100 text-red-700'
  if (execution?.refund_status === 'refunded') return 'bg-slate-200 text-slate-700'
  return getStatusClass(execution?.status)
}

const getRefundHint = (execution) => {
  if (!execution) return ''
  return execution.refund_seller_reply || execution.refund_admin_reply || execution.refund_reason || ''
}

const canShowRefundAction = (execution) => {
  if (!execution) return false
  if (currentWorkflowIsOwner.value) return false
  const startTime = execution.start_time ? new Date(execution.start_time).getTime() : 0
  if (!startTime || Number.isNaN(startTime)) return false
  if (Date.now() - startTime > 15 * 24 * 60 * 60 * 1000) return false
  return Boolean(
    execution.purchase_id &&
    execution.refund_status !== 'pending' &&
    execution.refund_status !== 'refunded'
  )
}

const openRefundConfirm = (execution) => {
  refundTarget.value = execution
  showRefundConfirm.value = true
}

const confirmRefund = async () => {
  const purchaseId = refundTarget.value?.purchase_id || refundTarget.value?.id
  if (!purchaseId) return
  const reason = await showPrompt('请输入退款原因', '申请退款')
  if (!reason) {
    showMessage('请先填写退款原因', 'warning')
    return
  }
  refunding.value = true
  try {
    const response = await requestWorkflowRefund(purchaseId, reason)
    if (response.code === 0) {
      showMessage('退款申请已提交', 'success')
      showRefundConfirm.value = false
      refundTarget.value = null
      await fetchExecutions()
      return
    }
    showMessage(response.message, 'error')
  } catch (error) {
    console.error('退款申请失败:', error)
  } finally {
    refunding.value = false
  }
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

onMounted(() => {
  fetchExecutions()
})
</script>
