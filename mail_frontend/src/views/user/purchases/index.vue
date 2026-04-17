<template>
  <div>
    <!-- Tab 切换 -->
    <div class="bg-white rounded-lg shadow-sm p-1 inline-flex mb-4">
      <button
        @click="activeTab = 'all'"
        :class="[
          'px-5 py-2 rounded-md font-medium text-sm transition-all',
          activeTab === 'all'
            ? 'bg-primary-600 text-white shadow-md'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        ]"
      >
        {{ t('purchasesPage.allTransactions') }}
      </button>
      <button
        @click="activeTab = 'recharge'"
        :class="[
          'px-5 py-2 rounded-md font-medium text-sm transition-all',
          activeTab === 'recharge'
            ? 'bg-primary-600 text-white shadow-md'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        ]"
      >
        {{ t('purchasesPage.rechargeRecords') }}
      </button>
      <button
        @click="activeTab = 'expense'"
        :class="[
          'px-5 py-2 rounded-md font-medium text-sm transition-all',
          activeTab === 'expense'
            ? 'bg-primary-600 text-white shadow-md'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        ]"
      >
        {{ t('purchasesPage.expenseRecords') }}
      </button>
      <button
        @click="activeTab = 'income'"
        :class="[
          'px-5 py-2 rounded-md font-medium text-sm transition-all',
          activeTab === 'income'
            ? 'bg-primary-600 text-white shadow-md'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        ]"
      >
        {{ t('purchasesPage.incomeRecords') }}
      </button>
      <button
        @click="activeTab = 'refunds'"
        :class="[
          'px-5 py-2 rounded-md font-medium text-sm transition-all',
          activeTab === 'refunds'
            ? 'bg-primary-600 text-white shadow-md'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        ]"
      >
        退款申请
      </button>
    </div>

    <!-- 筛选栏 -->
    <div class="bg-white rounded-lg shadow p-4 mb-4">
      <div class="flex items-center gap-4">
        <!-- 搜索框 -->
        <div class="flex-1">
          <input
            v-model="searchKeyword"
            type="text"
            :placeholder="t('purchasesPage.searchPlaceholder')"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            @keyup.enter="handleSearch"
          />
        </div>

        <!-- 按钮组 -->
        <div class="flex gap-2">
          <button
            @click="handleSearch"
            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
          >
            {{ t('purchasesPage.query') }}
          </button>
          <button
            @click="handleReset"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {{ t('purchasesPage.reset') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 订单列表 -->
    <div class="bg-white rounded-lg shadow">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {{ activeTab === 'refunds' ? '退款单号' : t('purchasesPage.transactionNo') }}
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {{ activeTab === 'refunds' ? '工作流' : t('purchasesPage.transactionType') }}
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {{ activeTab === 'refunds' ? (isAdminView ? '买家 / 商家' : '退款原因') : t('purchasesPage.description') }}
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {{ activeTab === 'refunds' ? '退款金额' : t('purchasesPage.amount') }}
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {{ activeTab === 'refunds' ? '状态' : t('purchasesPage.balanceChange') }}
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {{ activeTab === 'refunds' ? '申请时间' : t('purchasesPage.time') }}
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {{ t('purchasesPage.actions') }}
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="item in transactions" :key="item.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                {{ activeTab === 'refunds' ? item.refund_no : (item.transaction_no || '#' + item.id) }}
              </td>
              <td v-if="activeTab !== 'refunds'" class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="getTypeClass(item.transaction_type)"
                  class="px-2 py-1 text-xs font-medium rounded-full"
                >
                  {{ getTypeName(item.transaction_type) }}
                </span>
              </td>
              <td v-else class="px-6 py-4 text-sm text-gray-900">
                <div class="font-medium">{{ item.workflow_name || '-' }}</div>
                <div class="text-xs text-gray-500">{{ item.order_no || '-' }}</div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-900">
                <template v-if="activeTab === 'refunds' && isAdminView">
                  <div>买家: {{ item.buyer_name || '-' }}</div>
                  <div class="text-xs text-gray-500">商家: {{ item.seller_name || '-' }}</div>
                </template>
                <template v-else>
                  {{ activeTab === 'refunds' ? (item.reason || '-') : item.description }}
                </template>
              </td>
              <td
                class="px-6 py-4 whitespace-nowrap text-sm font-medium"
                :class="activeTab === 'refunds' ? 'text-warning-700' : (item.amount > 0 ? 'text-success-600' : 'text-danger-600')"
              >
                <template v-if="activeTab === 'refunds'">
                  {{ item.amount }} {{ t('purchasesPage.coinsUnit') }}
                </template>
                <template v-else>
                  {{ item.amount > 0 ? '+' : '' }}{{ item.amount }} {{ t('purchasesPage.coinsUnit') }}
                </template>
              </td>
              <td v-if="activeTab !== 'refunds'" class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {{ item.balance_before }} → {{ item.balance_after }}
              </td>
              <td v-else class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="getRefundStatusClass(item.status)"
                  class="px-2 py-1 text-xs font-medium rounded-full"
                >
                  {{ getRefundStatusName(item.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {{ formatDate(activeTab === 'refunds' ? item.requested_at : item.created_at) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <div class="flex items-center gap-2">
                  <ActionButton
                    icon="eye"
                    :tooltip="t('purchasesPage.viewDetail')"
                    variant="view"
                    @click="viewDetail(item)"
                  />
                  <template v-if="activeTab === 'refunds' && item.status === 'pending'">
                    <template v-if="isAdminView">
                      <ActionButton
                        icon="check"
                        tooltip="同意退款"
                        variant="success"
                        @click="forceRefund(item)"
                      />
                    </template>
                    <template v-else>
                      <ActionButton
                        icon="check"
                        tooltip="同意退款"
                        variant="success"
                        @click="approveRefund(item)"
                      />
                      <ActionButton
                        icon="x"
                        tooltip="拒绝退款"
                        variant="danger"
                        @click="rejectRefund(item)"
                      />
                    </template>
                  </template>
                </div>
              </td>
            </tr>
            <tr v-if="loading">
              <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                <div
                  class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"
                ></div>
                <p class="mt-2">{{ t('purchasesPage.loading') }}</p>
              </td>
            </tr>
            <tr v-else-if="transactions.length === 0">
              <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                {{ t('purchasesPage.empty') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div class="px-6 py-4 flex items-center justify-between border-t border-gray-200">
        <div class="text-sm text-gray-700">
          {{ t('purchasesPage.totalRecords', { total: pagination.total }) }}
        </div>
        <div class="flex gap-2">
          <button
            @click="changePage(pagination.page - 1)"
            :disabled="pagination.page === 1"
            class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ t('purchasesPage.prevPage') }}
          </button>
          <span class="px-3 py-1 text-sm text-gray-700">
            {{
              t('purchasesPage.pageInfo', {
                page: pagination.page,
                total: Math.ceil(pagination.total / pagination.pageSize)
              })
            }}
          </span>
          <button
            @click="changePage(pagination.page + 1)"
            :disabled="pagination.page >= Math.ceil(pagination.total / pagination.pageSize)"
            class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ t('purchasesPage.nextPage') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <div
      v-if="showDetailModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold">{{ t('purchasesPage.detailTitle') }}</h3>
            <button @click="showDetailModal = false" class="text-gray-400 hover:text-gray-600">
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

          <div v-if="selectedItem" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-sm text-gray-600 mb-1">{{ t('purchasesPage.transactionNo') }}</div>
                <div class="text-sm font-mono font-medium">
                  {{ selectedItem.refund_no || selectedItem.transaction_no || '#' + selectedItem.id }}
                </div>
              </div>
              <div>
                <div class="text-sm text-gray-600 mb-1">
                  {{ activeTab === 'refunds' ? '状态' : t('purchasesPage.transactionType') }}
                </div>
                <div class="text-sm font-medium">
                  {{ activeTab === 'refunds' ? getRefundStatusName(selectedItem.status) : getTypeName(selectedItem.transaction_type) }}
                </div>
              </div>
              <div>
                <div class="text-sm text-gray-600 mb-1">
                  {{ activeTab === 'refunds' ? '退款金额' : (selectedItem.amount > 0 ? t('purchasesPage.rechargeAmount') : t('purchasesPage.expenseAmount')) }}
                </div>
                <div
                  class="text-sm font-medium"
                  :class="activeTab === 'refunds' ? 'text-warning-700' : (selectedItem.amount > 0 ? 'text-success-600' : 'text-danger-600')"
                >
                  <template v-if="activeTab === 'refunds'">
                    {{ selectedItem.amount }}
                  </template>
                  <template v-else>
                    {{ selectedItem.amount > 0 ? '+' : '' }}{{ selectedItem.amount }}
                  </template>
                  {{ t('purchasesPage.coinsUnit') }}
                </div>
              </div>
              <div v-if="activeTab !== 'refunds'">
                <div class="text-sm text-gray-600 mb-1">{{ t('purchasesPage.balanceChange') }}</div>
                <div class="text-sm font-medium">
                  {{ selectedItem.balance_before }} → {{ selectedItem.balance_after }}
                </div>
              </div>
              <div v-else>
                <div class="text-sm text-gray-600 mb-1">工作流</div>
                <div class="text-sm font-medium">
                  {{ selectedItem.workflow_name || '-' }}
                </div>
              </div>
              <div class="col-span-2">
                <div class="text-sm text-gray-600 mb-1">{{ activeTab === 'refunds' ? (isAdminView ? '买家 / 商家' : '退款原因') : t('purchasesPage.description') }}</div>
                <div v-if="activeTab === 'refunds' && isAdminView" class="text-sm space-y-1">
                  <div>买家: {{ selectedItem.buyer_name || '-' }}</div>
                  <div class="text-xs text-gray-500">商家: {{ selectedItem.seller_name || '-' }}</div>
                </div>
                <div v-else class="text-sm">{{ activeTab === 'refunds' ? (selectedItem.reason || '-') : (selectedItem.description || '-') }}</div>
              </div>

              <div class="col-span-2">
                <div class="text-sm text-gray-600 mb-1">{{ activeTab === 'refunds' ? '申请时间' : t('purchasesPage.time') }}</div>
                <div class="text-sm">{{ formatDate(activeTab === 'refunds' ? selectedItem.requested_at : selectedItem.created_at) }}</div>
              </div>
              <div v-if="activeTab === 'refunds' && selectedItem.processed_at" class="col-span-2">
                <div class="text-sm text-gray-600 mb-1">处理时间</div>
                <div class="text-sm">{{ formatDate(selectedItem.processed_at) }}</div>
              </div>
              <div v-if="activeTab === 'refunds' && selectedItem.seller_reply" class="col-span-2">
                <div class="text-sm text-gray-600 mb-1">处理说明</div>
                <div class="text-sm">{{ selectedItem.seller_reply }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { showMessage } from '@/utils/message'
import { showConfirm, showPrompt } from '@/utils/dialog'
import api from '@/services/api'
import ActionButton from '@/components/ActionButton/index.vue'
import { getCurrentLocale } from '@/i18n'
import { useUserStore } from '@/stores/user'
import { getSellerRefunds, approveWorkflowRefund, rejectWorkflowRefund, adminGetWorkflowRefunds, adminForceWorkflowRefund } from '@/api/workflowMarket'

const { t } = useI18n()
const userStore = useUserStore()
const isAdminView = computed(() => Boolean(userStore.user?.is_admin))

// 数据
const transactions = ref([])
const loading = ref(false)
const searchKeyword = ref('')
const activeTab = ref('all') // Tab状态

// 统计
const summary = reactive({
  total: 0,
  totalSpent: 0
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 详情弹窗
const showDetailModal = ref(false)
const selectedItem = ref(null)

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    if (activeTab.value === 'refunds') {
      const response = await (isAdminView.value ? adminGetWorkflowRefunds : getSellerRefunds)({
        page: pagination.page,
        page_size: pagination.pageSize
      })

      if (response.code === 0) {
        transactions.value = response.data.items || []
        pagination.total = response.data.total || 0
        summary.total = response.data.total || 0
        summary.totalSpent = transactions.value.reduce((sum, item) => sum + Number(item.amount || 0), 0)
      }
      return
    }

    const params = {
      page: pagination.page,
      page_size: pagination.pageSize
    }

    if (activeTab.value === 'recharge') {
      params.transaction_type = 'recharge'
    } else if (activeTab.value === 'income') {
      params.transaction_type = 'earn'
    } else if (activeTab.value === 'expense') {
      params.transaction_type = 'consume,withdraw'
    }

    const response = await api.get('/milk-coins/transactions', { params })

    if (response.code === 0) {
      transactions.value = response.data.items || []
      pagination.total = response.data.total || 0

      // 计算统计
      summary.total = response.data.total || 0
      summary.totalSpent = Math.abs(
        transactions.value.reduce((sum, item) => sum + (item.amount || 0), 0)
      )
    }
  } catch (error) {
    console.error('加载失败:', error)
    showMessage(t('purchasesPage.loadFailed'), 'error')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  loadData()
}

// 重置
const handleReset = () => {
  searchKeyword.value = ''
  pagination.page = 1
  loadData()
}

// 翻页
const changePage = (page) => {
  if (page < 1 || page > Math.ceil(pagination.total / pagination.pageSize)) return
  pagination.page = page
  loadData()
}

// 查看详情
const viewDetail = (item) => {
  selectedItem.value = item
  showDetailModal.value = true
}

const approveRefund = async (item) => {
  const confirmed = await showConfirm(`确定同意工作流“${item.workflow_name}”这笔退款吗？`, '同意退款')
  if (!confirmed) return

  try {
    const res = await approveWorkflowRefund(item.id)
    if (res.code === 0) {
      showMessage('退款已处理', 'success')
      loadData()
    } else {
      showMessage(res.message, 'error')
    }
  } catch (error) {
    console.error('同意退款失败:', error)
  }
}

const rejectRefund = async (item) => {
  const reply = await showPrompt('请输入拒绝原因', '拒绝退款', '')
  if (!reply) return

  try {
    const res = await rejectWorkflowRefund(item.id, reply)
    if (res.code === 0) {
      showMessage('退款申请已拒绝', 'success')
      loadData()
    } else {
      showMessage(res.message, 'error')
    }
  } catch (error) {
    console.error('拒绝退款失败:', error)
  }
}

const forceRefund = async (item) => {
  const reply = await showPrompt('请输入平台介入退款说明', '同意退款')
  if (!reply) return

  try {
    const res = await adminForceWorkflowRefund(item.id, reply)
    if (res.code === 0) {
      showMessage('退款已处理', 'success')
      loadData()
    } else {
      showMessage(res.message, 'error')
    }
  } catch (error) {
    console.error('平台介入退款失败:', error)
  }
}

// 格式化日期
const formatDate = (timestamp) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString(getCurrentLocale())
}

// 获取类型名称
const getTypeName = (type) => {
  const typeMap = {
    recharge: t('purchasesPage.typeRecharge'),
    consume: t('purchasesPage.typeConsume'),
    earn: t('purchasesPage.typeIncome'),
    withdraw: t('purchasesPage.typeWithdraw')
  }
  return typeMap[type] || type
}

// 获取类型样式
const getTypeClass = (type) => {
  const classMap = {
    recharge: 'bg-success-100 text-success-700',
    consume: 'bg-danger-100 text-danger-700',
    earn: 'bg-primary-100 text-primary-700',
    withdraw: 'bg-warning-100 text-warning-700'
  }
  return classMap[type] || 'bg-gray-100 text-gray-700'
}

const getRefundStatusName = (status) => {
  const statusMap = {
    pending: '待处理',
    rejected: '已拒绝',
    refunded: '已退款'
  }
  return statusMap[status] || status
}

const getRefundStatusClass = (status) => {
  const classMap = {
    pending: 'bg-warning-100 text-warning-700',
    rejected: 'bg-danger-100 text-danger-700',
    refunded: 'bg-success-100 text-success-700'
  }
  return classMap[status] || 'bg-gray-100 text-gray-700'
}

// 监听Tab切换
watch(activeTab, () => {
  pagination.page = 1
  loadData()
})

onMounted(() => {
  loadData()
})
</script>
