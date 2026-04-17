<template>
  <div class="p-6">
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
        全部交易
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
        充值记录
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
        支出记录
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
        收益记录
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
        退款处理
      </button>
    </div>

    <!-- 筛选栏 -->
    <div v-if="activeTab !== 'refunds'" class="bg-white rounded-lg shadow p-4 mb-4">
      <div class="flex items-center gap-4">
        <!-- 搜索框 -->
        <div class="flex-1">
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索用户邮箱或描述..."
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
            查询
          </button>
          <button
            @click="handleReset"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            重置
          </button>
        </div>
      </div>
    </div>

    <!-- 交易列表 -->
    <AdminDataTable
      v-if="activeTab !== 'refunds'"
      :loading="loading"
      :pagination="{
        page: page,
        pages: totalPages,
        total: total,
        limit: pageSize
      }"
      :column-count="8"
      @page-change="handlePageChange"
      @page-size-change="handlePageSizeChange"
    >
      <template #thead>
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">交易号</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">描述</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">金额</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">余额变化</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
        </tr>
      </template>

      <template #tbody>
        <tr v-if="transactions.length === 0">
          <td colspan="8" class="px-6 py-12 text-center text-gray-500">
            暂无交易记录
          </td>
        </tr>
        <tr v-for="item in transactions" :key="item.id" class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
            {{ item.transaction_no || '#' + item.id }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm font-medium text-gray-900">{{ item.user_email || '-' }}</div>
            <div class="text-xs text-gray-500">ID: {{ item.user_id }}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span :class="getTypeClass(item.transaction_type)" class="px-2 py-1 text-xs font-medium rounded-full">
              {{ getTypeName(item.transaction_type) }}
            </span>
          </td>
          <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
            {{ item.description }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium" :class="item.amount > 0 ? 'text-success-600' : 'text-danger-600'">
            {{ item.amount > 0 ? '+' : '' }}{{ item.amount }} 奶片
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
            {{ item.balance_before }} → {{ item.balance_after }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
            {{ formatDate(item.created_at) }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">
            <button
              @click="viewDetail(item)"
              class="text-primary-600 hover:text-primary-900"
            >
              查看
            </button>
          </td>
        </tr>
      </template>
    </AdminDataTable>

    <AdminDataTable
      v-else
      title="退款申请列表"
      :loading="loading"
      :pagination="{
        page: refundPage,
        pages: refundTotalPages,
        total: refundTotal,
        limit: refundPageSize
      }"
      :column-count="7"
      @page-change="handleRefundPageChange"
      @page-size-change="handleRefundPageSizeChange"
    >
      <template #thead>
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">退款单号</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">工作流</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">买家 / 商家</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">退款金额</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">申请时间</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
        </tr>
      </template>

      <template #tbody>
        <tr v-if="refunds.length === 0">
          <td colspan="7" class="px-6 py-12 text-center text-gray-500">
            暂无退款申请
          </td>
        </tr>
        <tr v-for="refund in refunds" :key="refund.id" class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
            {{ refund.refund_no }}
          </td>
          <td class="px-6 py-4 text-sm text-gray-900">
            <div class="font-medium">{{ refund.workflow_name || '-' }}</div>
            <div class="text-xs text-gray-500">{{ refund.order_no || '-' }}</div>
          </td>
          <td class="px-6 py-4 text-sm text-gray-900">
            <div>买家: {{ refund.buyer_name || '-' }}</div>
            <div class="text-xs text-gray-500">商家: {{ refund.seller_name || '-' }}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-orange-600">
            {{ refund.amount }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span :class="[
              'px-2 py-1 text-xs font-medium rounded-full',
              refund.status === 'pending' ? 'bg-orange-100 text-orange-800' :
              refund.status === 'rejected' ? 'bg-red-100 text-red-800' :
              'bg-green-100 text-green-800'
            ]">
              {{ getRefundStatusLabel(refund.status) }}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
            {{ formatDate(refund.requested_at) }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">
            <div class="flex items-center gap-2">
              <ActionButton
                icon="eye"
                tooltip="查看详情"
                variant="view"
                @click="showRefundDetail(refund)"
              />
              <ActionButton
                v-if="refund.status === 'pending'"
                icon="check"
                tooltip="同意退款"
                variant="primary"
                @click="forceRefund(refund)"
              />
            </div>
          </td>
        </tr>
      </template>
    </AdminDataTable>

    <!-- 详情弹窗 -->
    <div v-if="showDetailModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold">交易详情</h3>
            <button @click="showDetailModal = false" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div v-if="selectedItem" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-sm text-gray-600 mb-1">交易号</div>
                <div class="text-sm font-mono font-medium">{{ selectedItem.transaction_no || '#' + selectedItem.id }}</div>
              </div>
              <div>
                <div class="text-sm text-gray-600 mb-1">交易类型</div>
                <div class="text-sm font-medium">{{ getTypeName(selectedItem.transaction_type) }}</div>
              </div>
              <div>
                <div class="text-sm text-gray-600 mb-1">用户邮箱</div>
                <div class="text-sm font-medium">{{ selectedItem.user_email || '-' }}</div>
              </div>
              <div>
                <div class="text-sm text-gray-600 mb-1">用户ID</div>
                <div class="text-sm font-medium">{{ selectedItem.user_id }}</div>
              </div>
              <div>
                <div class="text-sm text-gray-600 mb-1">{{ selectedItem.amount > 0 ? '充值金额' : '消费金额' }}</div>
                <div class="text-sm font-medium" :class="selectedItem.amount > 0 ? 'text-success-600' : 'text-danger-600'">
                  {{ selectedItem.amount > 0 ? '+' : '' }}{{ selectedItem.amount }} 奶片
                </div>
              </div>
              <div>
                <div class="text-sm text-gray-600 mb-1">余额变化</div>
                <div class="text-sm font-medium">{{ selectedItem.balance_before }} → {{ selectedItem.balance_after }}</div>
              </div>
              <div class="col-span-2">
                <div class="text-sm text-gray-600 mb-1">描述</div>
                <div class="text-sm">{{ selectedItem.description }}</div>
              </div>

              <!-- 工作流相关信息 -->
              <div v-if="selectedItem.order_no" class="col-span-2">
                <div class="text-sm text-gray-600 mb-1">订单号</div>
                <div class="text-sm font-mono">{{ selectedItem.order_no }}</div>
              </div>
              <div v-if="selectedItem.workflow_id">
                <div class="text-sm text-gray-600 mb-1">工作流ID</div>
                <div class="text-sm font-mono">{{ selectedItem.workflow_id }}</div>
              </div>
              <div v-if="selectedItem.execution_id">
                <div class="text-sm text-gray-600 mb-1">执行ID</div>
                <div class="text-sm font-mono">{{ selectedItem.execution_id }}</div>
              </div>

              <div class="col-span-2">
                <div class="text-sm text-gray-600 mb-1">时间</div>
                <div class="text-sm">{{ formatDate(selectedItem.created_at) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { showMessage } from '@/utils/message'
import { showAlert, showPrompt } from '@/utils/dialog'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import { adminGetWorkflowRefunds, adminForceWorkflowRefund } from '@/api/workflowMarket'

const loading = ref(false)
const searchKeyword = ref('')
const activeTab = ref('all')

const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const transactions = ref([])
const refunds = ref([])
const refundPage = ref(1)
const refundPageSize = ref(20)
const refundTotal = ref(0)

const showDetailModal = ref(false)
const selectedItem = ref(null)

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))
const refundTotalPages = computed(() => Math.ceil(refundTotal.value / refundPageSize.value) || 1)

const loadData = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const params = new URLSearchParams({
      page: page.value,
      page_size: pageSize.value
    })

    // 根据Tab筛选
    if (activeTab.value === 'recharge') {
      params.append('transaction_type', 'recharge')
    } else if (activeTab.value === 'income') {
      params.append('transaction_type', 'earn')
    } else if (activeTab.value === 'expense') {
      params.append('transaction_type', 'consume,withdraw')
    }

    // 搜索关键词
    if (searchKeyword.value.trim()) {
      params.append('keyword', searchKeyword.value.trim())
    }

    const response = await fetch(`/mail-api/v1/milk-coins/admin/transactions?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    const result = await response.json()
    if (result.code === 0) {
      transactions.value = result.data.items || []
      total.value = result.data.total || 0
    } else {
      showMessage(result.message || '加载失败', 'error')
    }
  } catch (error) {
    console.error('加载失败:', error)
    showMessage('加载失败', 'error')
  } finally {
    loading.value = false
  }
}

const loadRefunds = async () => {
  loading.value = true
  try {
    const res = await adminGetWorkflowRefunds({
      page: refundPage.value,
      page_size: refundPageSize.value
    })
    if (res.code === 0) {
      refunds.value = res.data.items || []
      refundTotal.value = res.data.total || 0
    } else {
      showMessage(res.message || '加载失败', 'error')
    }
  } catch (error) {
    console.error('加载退款列表失败:', error)
    showMessage('加载失败', 'error')
  } finally {
    loading.value = false
  }
}

const handlePageChange = (newPage) => {
  page.value = newPage
  loadData()
}

const handlePageSizeChange = (newSize) => {
  pageSize.value = newSize
  page.value = 1
  loadData()
}

const handleSearch = () => {
  page.value = 1
  loadData()
}

const handleReset = () => {
  searchKeyword.value = ''
  page.value = 1
  loadData()
}

const viewDetail = (item) => {
  selectedItem.value = item
  showDetailModal.value = true
}

const handleRefundPageChange = (newPage) => {
  refundPage.value = newPage
  loadRefunds()
}

const handleRefundPageSizeChange = (newSize) => {
  refundPageSize.value = newSize
  refundPage.value = 1
  loadRefunds()
}

const getRefundStatusLabel = (status) => {
  const map = {
    pending: '待处理',
    rejected: '已拒绝',
    refunded: '已退款'
  }
  return map[status] || status
}

const showRefundDetail = (refund) => {
  showAlert(
    `<div class='space-y-2'>
      <div><strong>退款原因:</strong> ${refund.reason || '-'}</div>
      <div><strong>商家说明:</strong> ${refund.seller_reply || '-'}</div>
      <div><strong>平台说明:</strong> ${refund.admin_reply || '-'}</div>
    </div>`,
    '退款详情'
  )
}

const forceRefund = async (refund) => {
  const reply = await showPrompt(
    '请输入平台介入退款说明',
    '平台介入退款'
  )

  if (!reply) return

  try {
    const res = await adminForceWorkflowRefund(refund.id, reply)
    if (res.code === 0) {
      showMessage('已处理退款', 'success')
      loadRefunds()
    } else {
      showMessage(res.message, 'error')
    }
  } catch (error) {
    console.error('强制退款失败:', error)
  }
}

const formatDate = (timestamp) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

const getTypeName = (type) => {
  const typeMap = {
    'recharge': '充值',
    'consume': '消费',
    'earn': '收益',
    'withdraw': '提现',
    'refund': '退款'
  }
  return typeMap[type] || type
}

const getTypeClass = (type) => {
  const classMap = {
    'recharge': 'bg-success-100 text-success-700',
    'consume': 'bg-danger-100 text-danger-700',
    'earn': 'bg-primary-100 text-primary-700',
    'withdraw': 'bg-warning-100 text-warning-700',
    'refund': 'bg-emerald-100 text-emerald-700'
  }
  return classMap[type] || 'bg-gray-100 text-gray-700'
}

watch(activeTab, () => {
  if (activeTab.value === 'refunds') {
    refundPage.value = 1
    loadRefunds()
    return
  }
  page.value = 1
  loadData()
})

onMounted(() => {
  loadData()
})
</script>
