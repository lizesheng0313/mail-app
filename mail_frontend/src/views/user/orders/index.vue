<template>
  <div>
    <!-- 页面标题 -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-900">{{ t('ordersPage.title') }}</h2>
      <p class="text-sm text-gray-600 mt-1">{{ t('ordersPage.subtitle') }}</p>
    </div>

    <!-- 筛选栏 -->
    <div class="bg-white rounded-lg shadow p-3 mb-3">
      <div class="flex items-center gap-4">
        <!-- 搜索框 -->
        <div class="flex-1">
          <input
            v-model="searchKeyword"
            type="text"
            :placeholder="t('ordersPage.searchPlaceholder')"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <!-- 订单类型 -->
        <div class="w-40">
          <CustomSelect
            v-model="orderType"
            :options="orderTypeOptions"
            :placeholder="t('ordersPage.allTypes')"
          />
        </div>

        <!-- 订单状态 -->
        <div class="w-40">
          <CustomSelect
            v-model="orderStatus"
            :options="orderStatusOptions"
            :placeholder="t('ordersPage.allStatuses')"
          />
        </div>

        <!-- 按钮组 -->
        <div class="flex gap-2">
          <button
            @click="handleSearch"
            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            {{ t('ordersPage.query') }}
          </button>
          <button
            @click="handleReset"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            {{ t('ordersPage.reset') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 数据表格 -->
    <AdminDataTable
      :title="t('ordersPage.listTitle')"
      :pagination="pagination"
      :loading="loading"
      :column-count="6"
      @page-change="changePage"
      @page-size-change="changePageSize"
    >
      <template #thead>
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">{{ t('ordersPage.transactionNo') }}</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">{{ t('ordersPage.earningType') }}</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">{{ t('ordersPage.description') }}</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">{{ t('ordersPage.amount') }}</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">{{ t('ordersPage.time') }}</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">{{ t('ordersPage.actions') }}</th>
        </tr>
      </template>

      <template #tbody>
        <tr v-for="order in orders" :key="order.id" class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
            {{ order.transaction_no || '#' + order.id }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span :class="getTypeClass(order.related_type)" class="px-2 py-1 text-xs font-medium rounded-full">
              {{ getTypeName(order.related_type) }}
            </span>
          </td>
          <td class="px-6 py-4 text-sm text-gray-900">
            {{ order.description }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-success-600">
            +{{ order.amount }} {{ t('ordersPage.coinsUnit') }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
            {{ formatDate(order.created_at) }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">
            <ActionButton
              :label="t('ordersPage.detail')"
              type="info"
              size="small"
              @click="viewDetail(order)"
            />
          </td>
        </tr>
        <tr v-if="orders.length === 0">
          <td colspan="9" class="px-6 py-12 text-center text-black">
            {{ t('ordersPage.empty') }}
          </td>
        </tr>
      </template>
    </AdminDataTable>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { showAlert } from '@/utils/dialog'
import api from '@/services/api'
import CustomSelect from '@/components/CustomSelect/index.vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import { getCurrentLocale } from '@/i18n'

const { t } = useI18n()

// 筛选条件
const searchKeyword = ref('')
const orderType = ref('')
const orderStatus = ref('')

// Select选项
const orderTypeOptions = computed(() => [
  { label: t('ordersPage.allTypes'), value: '' },
  { label: t('ordersPage.purchase'), value: 'purchase' },
  { label: t('ordersPage.renew'), value: 'renew' },
  { label: t('ordersPage.upgrade'), value: 'upgrade' }
])

const orderStatusOptions = computed(() => [
  { label: t('ordersPage.allStatuses'), value: '' },
  { label: t('ordersPage.pending'), value: 'pending' },
  { label: t('ordersPage.paid'), value: 'paid' },
  { label: t('ordersPage.refunded'), value: 'refunded' },
  { label: t('ordersPage.cancelled'), value: 'cancelled' }
])

// 订单列表
const orders = ref([])

// 分页
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const loading = ref(false)

// 分页数据
const pagination = computed(() => ({
  currentPage: page.value,
  page: page.value,
  totalPages: Math.ceil(total.value / pageSize.value),
  pages: Math.ceil(total.value / pageSize.value),
  total: total.value,
  pageSize: pageSize.value,
  limit: pageSize.value
}))

// 切换页码
const changePage = (newPage) => {
  page.value = newPage
  loadOrders()
}

// 切换每页数量
const changePageSize = (newPageSize) => {
  pageSize.value = newPageSize
  page.value = 1
  loadOrders()
}

// 加载订单列表（改为加载收益记录）
const loadOrders = async () => {
  loading.value = true
  try {
    // 改为查询奶片交易记录（收益类型）
    const res = await api.get('/milk-coins/transactions', {
      params: {
        transaction_type: 'earn',  // 只查询收益记录
        page: page.value,
        page_size: pageSize.value
      }
    })

    if (res.code === 0) {
      orders.value = res.data.items || []
      total.value = res.data.total || 0
    }
  } catch (error) {
    console.error('加载订单失败:', error)
  } finally {
    loading.value = false
  }
}

// 获取类型样式
const getTypeClass = (type) => {
  const typeMap = {
    'workflow_execution': 'bg-primary-100 text-primary-700',
    'plugin_order': 'bg-success-100 text-success-700',
    'mailbox': 'bg-warning-100 text-warning-700'
  }
  return typeMap[type] || 'bg-gray-100 text-gray-700'
}

// 获取类型名称
const getTypeName = (type) => {
  const typeMap = {
    'workflow_execution': t('ordersPage.typeWorkflow'),
    'plugin_order': t('ordersPage.typePlugin'),
    'mailbox': t('ordersPage.typeMailbox')
  }
  return typeMap[type] || type
}

// 格式化日期
const formatDate = (timestamp) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString(getCurrentLocale())
}

// 查看详情
const viewDetail = (item) => {
  showAlert(
    `<div class="space-y-2">
      <div><strong>${t('ordersPage.detailTransactionNo')}:</strong> ${item.transaction_no || '#' + item.id}</div>
      <div><strong>${t('ordersPage.detailType')}:</strong> ${getTypeName(item.related_type)}</div>
      <div><strong>${t('ordersPage.detailAmount')}:</strong> +${item.amount} ${t('ordersPage.coinsUnit')}</div>
      <div><strong>${t('ordersPage.detailDescription')}:</strong> ${item.description}</div>
      <div><strong>${t('ordersPage.detailTime')}:</strong> ${formatDate(item.created_at)}</div>
    </div>`,
    t('ordersPage.detailTitle')
  )
}

// 查询按钮
const handleSearch = () => {
  page.value = 1 // 重置到第一页
  loadOrders()
}

// 重置按钮
const handleReset = () => {
  searchKeyword.value = ''
  orderType.value = ''
  orderStatus.value = ''
  page.value = 1
  loadOrders()
}

// 不使用自动watch，改为手动触发查询
onMounted(() => {
  loadOrders()
})
</script>
