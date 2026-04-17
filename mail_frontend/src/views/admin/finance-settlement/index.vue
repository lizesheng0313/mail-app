<template>
  <div class="h-full">
    <div class=" h-full flex flex-col">

      <!-- 财务概览卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <!-- 总收入 -->
        <div class="bg-white rounded-lg shadow-sm border p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">总收入</p>
              <p class="text-2xl font-semibold text-green-600 mt-1">¥{{ overview.total_revenue.toFixed(2) }}</p>
              <p class="text-xs text-gray-400 mt-1">增长 {{ overview.revenue_growth }}%</p>
            </div>
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <BaseIcon name="currency-dollar" size="w-6 h-6" class="text-green-600" />
            </div>
          </div>
        </div>

        <!-- 本月收入 -->
        <div class="bg-white rounded-lg shadow-sm border p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">本月收入</p>
              <p class="text-2xl font-semibold text-blue-600 mt-1">¥{{ overview.month_revenue.toFixed(2) }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ overview.month_orders }} 笔订单</p>
            </div>
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BaseIcon name="chart-bar" size="w-6 h-6" class="text-blue-600" />
            </div>
          </div>
        </div>

        <!-- 待结算 -->
        <div class="bg-white rounded-lg shadow-sm border p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">待结算</p>
              <p class="text-2xl font-semibold text-orange-600 mt-1">¥{{ overview.pending_settlement.toFixed(2) }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ overview.pending_count }} 笔</p>
            </div>
            <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <BaseIcon name="clock" size="w-6 h-6" class="text-orange-600" />
            </div>
          </div>
        </div>

        <!-- 已结算 -->
        <div class="bg-white rounded-lg shadow-sm border p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">已结算</p>
              <p class="text-2xl font-semibold text-gray-600 mt-1">¥{{ overview.settled_amount.toFixed(2) }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ overview.settled_count }} 笔</p>
            </div>
            <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <BaseIcon name="check-circle" size="w-6 h-6" class="text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 切换 -->
      <div class="mb-6">
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex space-x-8">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              @click="activeTab = tab.key"
              :class="[
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors'
              ]"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>
      </div>

      <!-- 提现申请 -->
      <div v-if="activeTab === 'withdrawals'">
        <!-- 筛选栏 -->
        <div class="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div class="flex flex-wrap items-center gap-4">
            <CustomSelect
              v-model="withdrawalFilters.status"
              :options="[
                { label: '全部状态', value: '' },
                { label: '待审核', value: 'pending' },
                { label: '已批准', value: 'approved' },
                { label: '已拒绝', value: 'rejected' },
                { label: '已完成', value: 'completed' }
              ]"
              placeholder="提现状态"
            />
          </div>
        </div>

        <AdminDataTable
          title="提现申请列表"
          :pagination="withdrawalPagination"
          :loading="loading"
          :show-page-size-selector="true"
          :column-count="8"
          @page-change="changeWithdrawalPage"
          @page-size-change="changeWithdrawalPageSize"
        >
          <template #thead>
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">用户</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">提现金额(奶片)</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">手续费</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">实际到账(元)</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">收款方式</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">状态</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">申请时间</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">操作</th>
            </tr>
          </template>
          <template #tbody>
            <tr v-for="withdrawal in withdrawals" :key="withdrawal.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-black">
                {{ withdrawal.username }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-black">
                {{ withdrawal.amount }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                -{{ withdrawal.fee }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                ¥{{ withdrawal.cash_amount }}
              </td>
              <td class="px-6 py-4 text-sm text-black">
                <div class="font-medium">{{ getAccountTypeLabel(withdrawal.account_type) }}</div>
                <div class="text-xs text-gray-600">姓名: {{ withdrawal.account_name }}</div>
                <div class="text-xs text-gray-600">账号: {{ withdrawal.account_no }}</div>
                <div v-if="withdrawal.bank_name" class="text-xs text-gray-500">开户行: {{ withdrawal.bank_name }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="[
                  'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                  withdrawal.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                  withdrawal.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                  withdrawal.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-green-100 text-green-800'
                ]">
                  {{ getWithdrawalStatusLabel(withdrawal.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-black">
                {{ formatDate(withdrawal.created_at) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <ActionButton
                  v-if="withdrawal.status === 'pending'"
                  icon="check"
                  tooltip="批准申请"
                  variant="primary"
                  @click="approveWithdrawal(withdrawal)"
                />
                <ActionButton
                  v-if="withdrawal.status === 'pending'"
                  icon="x"
                  tooltip="拒绝申请"
                  variant="delete"
                  @click="rejectWithdrawal(withdrawal)"
                />
                <ActionButton
                  v-if="withdrawal.status === 'approved'"
                  icon="currency-dollar"
                  tooltip="确认已汇款"
                  variant="primary"
                  @click="completeWithdrawal(withdrawal)"
                />
              </td>
            </tr>
          </template>
        </AdminDataTable>
      </div>

      <!-- 收益统计 -->
      <div v-if="activeTab === 'statistics'">
        <AdminDataTable
          title="作者收益排行"
          :pagination="{ currentPage: 1, totalPages: 1, total: topAuthors.length, pageSize: 20 }"
          :loading="loading"
          :column-count="5"
        >
          <template #thead>
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">排名</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">作者</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">工作流数量</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">总销售额</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">作者收益</th>
            </tr>
          </template>
          <template #tbody>
            <tr v-for="(author, index) in topAuthors" :key="author.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-2xl font-bold" :class="[
                  index === 0 ? 'text-yellow-500' :
                  index === 1 ? 'text-gray-400' :
                  index === 2 ? 'text-orange-600' :
                  'text-gray-600'
                ]">
                  {{ index + 1 }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                {{ author.name }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-black">
                {{ author.workflow_count }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-black">
                ¥{{ author.total_sales.toFixed(2) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                ¥{{ author.author_revenue.toFixed(2) }}
              </td>
            </tr>
          </template>
        </AdminDataTable>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { showMessage } from '@/utils/message'
import { showConfirm, showPrompt } from '@/utils/dialog'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import BaseIcon from '@/components/BaseIcon/index.vue'
import api from '@/services/api'

// Tab 切换
const activeTab = ref('withdrawals')
const tabs = [
  { key: 'withdrawals', label: '提现申请' },
  { key: 'statistics', label: '收益统计' }
]

// 财务概览
const overview = ref({
  total_revenue: 0,
  revenue_growth: 0,
  month_revenue: 0,
  month_orders: 0,
  pending_settlement: 0,
  pending_count: 0,
  settled_amount: 0,
  settled_count: 0
})

// 订单筛选
const orderFilters = ref({
  status: '',
  keyword: ''
})

// 提现筛选
const withdrawalFilters = ref({
  status: ''
})

// 订单列表
const orders = ref([])
const orderPage = ref(1)
const orderPageSize = ref(20)
const orderTotal = ref(0)

// 提现列表
const withdrawals = ref([])
const withdrawalPage = ref(1)
const withdrawalPageSize = ref(20)
const withdrawalTotal = ref(0)

// Top作者
const topAuthors = ref([])

const loading = ref(false)

// 订单分页
const orderPagination = computed(() => ({
  currentPage: orderPage.value,
  page: orderPage.value,
  totalPages: Math.ceil(orderTotal.value / orderPageSize.value),
  pages: Math.ceil(orderTotal.value / orderPageSize.value),
  total: orderTotal.value,
  pageSize: orderPageSize.value,
  limit: orderPageSize.value
}))

// 提现分页
const withdrawalPagination = computed(() => ({
  currentPage: withdrawalPage.value,
  page: withdrawalPage.value,
  totalPages: Math.ceil(withdrawalTotal.value / withdrawalPageSize.value),
  pages: Math.ceil(withdrawalTotal.value / withdrawalPageSize.value),
  total: withdrawalTotal.value,
  pageSize: withdrawalPageSize.value,
  limit: withdrawalPageSize.value
}))

// 切换订单页码
const changeOrderPage = (newPage) => {
  orderPage.value = newPage
  loadOrders()
}

const changeOrderPageSize = (newPageSize) => {
  orderPageSize.value = newPageSize
  orderPage.value = 1
  loadOrders()
}

// 切换提现页码
const changeWithdrawalPage = (newPage) => {
  withdrawalPage.value = newPage
  loadWithdrawals()
}

const changeWithdrawalPageSize = (newPageSize) => {
  withdrawalPageSize.value = newPageSize
  withdrawalPage.value = 1
  loadWithdrawals()
}

// 加载财务概览
const loadOverview = async () => {
  try {
    const res = await api.get('/finance/admin/overview')
    if (res.code === 0) {
      overview.value = res.data
    }
  } catch (error) {
    console.error('加载财务概览失败:', error)
  }
}

// 加载订单列表
const loadOrders = async () => {
  loading.value = true
  try {
    const res = await api.get('/finance/admin/workflow-orders', {
      params: {
        page: orderPage.value,
        page_size: orderPageSize.value,
        keyword: orderFilters.keyword || undefined,
        status: orderFilters.status || undefined,
        seller_id: orderFilters.seller_id || undefined
      }
    })
    if (res.code === 0) {
      orders.value = res.data.orders
      orderTotal.value = res.data.total
    }
  } catch (error) {
    console.error('加载订单列表失败:', error)
    showMessage('加载订单列表失败', 'error')
  } finally {
    loading.value = false
  }
}

// 加载提现列表
const loadWithdrawals = async () => {
  loading.value = true
  try {
    const res = await api.get('/finance/admin/withdrawals', {
      params: {
        page: withdrawalPage.value,
        page_size: withdrawalPageSize.value,
        status: withdrawalFilters.status || undefined,
        user_id: withdrawalFilters.user_id || undefined
      }
    })
    if (res.code === 0) {
      withdrawals.value = res.data.withdrawals
      withdrawalTotal.value = res.data.total
    }
  } catch (error) {
    console.error('加载提现列表失败:', error)
    showMessage('加载提现列表失败', 'error')
  } finally {
    loading.value = false
  }
}

// 加载Top作者
const loadTopAuthors = async () => {
  loading.value = true
  try {
    // TODO: 调用API
    topAuthors.value = [
      {
        id: 1,
        name: '张三',
        workflow_count: 5,
        total_sales: 12345.67,
        platform_commission: 1234.57,
        author_revenue: 11111.10
      },
      {
        id: 2,
        name: '李四',
        workflow_count: 3,
        total_sales: 8765.43,
        platform_commission: 876.54,
        author_revenue: 7888.89
      },
      {
        id: 3,
        name: '王五',
        workflow_count: 2,
        total_sales: 5432.10,
        platform_commission: 543.21,
        author_revenue: 4888.89
      }
    ]
  } finally {
    loading.value = false
  }
}

// 批准提现
const approveWithdrawal = async (withdrawal) => {
  const confirmed = await showConfirm(
    `确定批准用户"${withdrawal.username}"的提现申请吗？金额：${withdrawal.amount}`,
    '批准确认'
  )

  if (confirmed) {
    try {
      const res = await api.post(`/finance/admin/withdrawals/${withdrawal.id}/approve`)
      if (res.code === 0) {
        showMessage('已批准', 'success')
        loadWithdrawals()
        loadOverview()
      } else {
        showMessage(res.message || '操作失败', 'error')
      }
    } catch (error) {
      console.error('批准提现失败:', error)
      showMessage('操作失败', 'error')
    }
  }
}

// 拒绝提现
const rejectWithdrawal = async (withdrawal) => {
  const reason = await showPrompt(
    '请输入拒绝原因',
    '拒绝提现申请',
    {
      placeholder: '请输入拒绝原因',
      required: true
    }
  )

  if (reason) {
    try {
      const res = await api.post(`/finance/admin/withdrawals/${withdrawal.id}/reject`, null, {
        params: { reason }
      })
      if (res.code === 0) {
        showMessage('已拒绝', 'success')
        loadWithdrawals()
        loadOverview()
      } else {
        showMessage(res.message || '操作失败', 'error')
      }
    } catch (error) {
      console.error('拒绝提现失败:', error)
      showMessage('操作失败', 'error')
    }
  }
}

// 确认完成提现
const completeWithdrawal = async (withdrawal) => {
  const confirmed = await showConfirm(
    `确认已向用户"${withdrawal.username}"汇款吗？`,
    '确认汇款'
  )

  if (confirmed) {
    try {
      const res = await api.post(`/finance/admin/withdrawals/${withdrawal.id}/complete`)
      if (res.code === 0) {
        showMessage('已确认汇款完成', 'success')
        loadWithdrawals()
        loadOverview()
      } else {
        showMessage(res.message || '操作失败', 'error')
      }
    } catch (error) {
      console.error('确认汇款失败:', error)
      showMessage('操作失败', 'error')
    }
  }
}

// 获取订单状态标签
const getOrderStatusLabel = (status) => {
  const map = {
    paid: '已支付',
    cancelled: '已取消',
    refunded: '已退款'
  }
  return map[status] || status
}

// 获取提现状态标签
const getWithdrawalStatusLabel = (status) => {
  const map = {
    pending: '待审核',
    approved: '已批准',
    rejected: '已拒绝',
    completed: '已完成'
  }
  return map[status] || status
}

// 获取账户类型标签
const getAccountTypeLabel = (type) => {
  const map = {
    alipay: '支付宝',
    wechat: '微信',
    bank: '银行卡'
  }
  return map[type] || type
}

// 格式化日期
const formatDate = (timestamp) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 监听Tab切换
watch(activeTab, (newTab) => {
  if (newTab === 'withdrawals') {
    loadWithdrawals()
  } else if (newTab === 'statistics') {
    loadTopAuthors()
  }
})

// 监听筛选条件
watch([orderFilters, withdrawalFilters], () => {
  if (activeTab.value === 'orders') {
    orderPage.value = 1
    loadOrders()
  } else if (activeTab.value === 'withdrawals') {
    withdrawalPage.value = 1
    loadWithdrawals()
  }
}, { deep: true })

onMounted(() => {
  loadOverview()
  loadWithdrawals()
})
</script>
