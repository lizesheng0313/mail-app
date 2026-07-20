<template>
  <div class="space-y-4">
    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-lg font-semibold text-gray-900">我的订单</h1>
          <p class="mt-1 text-sm text-gray-500">查看资源市场里自己购买过的商品和工作流。</p>
        </div>
        <button
          class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          :disabled="loading"
          @click="fetchOrders"
        >
          查询
        </button>
      </div>
    </div>

    <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-500">购买内容</th>
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-500">订单号</th>
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-500">价格</th>
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-500">数量/权益</th>
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-500">状态</th>
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-500">时间</th>
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 bg-white">
            <tr v-if="loading">
              <td colspan="7" class="px-5 py-10 text-center text-sm text-gray-500">加载中...</td>
            </tr>
            <tr v-else-if="orders.length === 0">
              <td colspan="7" class="px-5 py-10 text-center text-sm text-gray-500">暂无购买记录</td>
            </tr>
            <tr v-for="item in orders" v-else :key="item.id" class="hover:bg-gray-50">
              <td class="px-5 py-4">
                <div class="text-sm font-semibold text-gray-900">{{ item.workflow_name || '-' }}</div>
                <div class="mt-1 max-w-[360px] truncate text-xs text-gray-500">
                  {{ item.workflow_description || item.workflow_public_id || '-' }}
                </div>
              </td>
              <td class="px-5 py-4 text-sm text-gray-700">{{ item.order_no || '-' }}</td>
              <td class="px-5 py-4 text-sm font-semibold text-primary-700">
                {{ formatAmount(item.order_amount || item.purchase_amount) }} 奶片
              </td>
              <td class="px-5 py-4 text-sm text-gray-700">{{ getOrderUsageText(item) }}</td>
              <td class="px-5 py-4">
                <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="getStatusClass(item.status)">
                  {{ getStatusText(item.status) }}
                </span>
              </td>
              <td class="px-5 py-4 text-sm text-gray-600">{{ formatTime(item.created_at) }}</td>
              <td class="px-5 py-4">
                <button
                  class="text-sm font-medium text-primary-700 hover:text-primary-800 disabled:text-gray-400"
                  :disabled="!item.workflow_id"
                  @click="viewMarket(item)"
                >
                  查看商品
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getMyPurchases } from '@/api/workflowMarket'

const router = useRouter()
const loading = ref(false)
const orders = ref([])

const fetchOrders = async () => {
  loading.value = true
  try {
    const res = await getMyPurchases({ page: 1, page_size: 100 })
    orders.value = Array.isArray(res?.data?.items) ? res.data.items : []
  } finally {
    loading.value = false
  }
}

const formatAmount = (value) => {
  const amount = Number(value || 0)
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(/\.?0+$/, '')
}

const formatTime = (value) => {
  if (!value) return '-'
  return new Date(Number(value)).toLocaleString('zh-CN', { hour12: false })
}

const getPricingText = (model) => {
  const map = {
    one_time: '一次性',
    subscription: '订阅',
    free: '免费'
  }
  return map[model] || model || '-'
}

const getOrderUsageText = (item) => {
  if (item.resource_kind === 'product') {
    return `数量 ${Number(item.quantity || 1)}`
  }
  if (item.pricing_model === 'per_use') {
    return `剩余 ${item.remaining_count ?? 0} / ${item.total_count ?? 0}`
  }
  return getPricingText(item.pricing_model)
}

const getStatusText = (status) => {
  const map = {
    active: '有效',
    expired: '已过期',
    refunded: '已退款',
    cancelled: '已取消'
  }
  return map[status] || status || '-'
}

const getStatusClass = (status) => {
  if (status === 'active') return 'bg-green-100 text-green-700'
  if (status === 'refunded') return 'bg-orange-100 text-orange-700'
  return 'bg-gray-100 text-gray-600'
}

const viewMarket = (item) => {
  router.push(`/market/workflow/${item.workflow_id}`)
}

onMounted(fetchOrders)
</script>
