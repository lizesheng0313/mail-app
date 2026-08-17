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
        <table class="min-w-[1280px] w-full table-fixed divide-y divide-gray-200">
          <colgroup>
            <col class="w-[330px]" />
            <col class="w-[270px]" />
            <col class="w-[120px]" />
            <col class="w-[130px]" />
            <col class="w-[130px]" />
            <col class="w-[180px]" />
            <col class="w-[150px]" />
          </colgroup>
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
              <td class="whitespace-nowrap px-5 py-4 text-sm text-gray-700">{{ item.order_no || '-' }}</td>
              <td class="whitespace-nowrap px-5 py-4 text-sm font-semibold text-primary-700">
                {{ formatAmount(item.order_amount || item.purchase_amount) }} 奶片
              </td>
              <td class="whitespace-nowrap px-5 py-4 text-sm text-gray-700">{{ getOrderUsageText(item) }}</td>
              <td class="whitespace-nowrap px-5 py-4">
                <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="getStatusClass(item.status)">
                  {{ getStatusText(item.status) }}
                </span>
                <div v-if="getRefundText(item)" class="mt-2 max-w-[220px] text-xs leading-5" :class="getRefundClass(item)">
                  {{ getRefundText(item) }}
                </div>
              </td>
              <td class="whitespace-nowrap px-5 py-4 text-sm text-gray-600">{{ formatTime(item.created_at) }}</td>
              <td class="px-5 py-4">
                <div class="flex items-center gap-1 whitespace-nowrap">
                  <ActionButton
                    v-if="canRequestRefund(item)"
                    icon="refund"
                    variant="danger"
                    :tooltip="item.refund_status === 'pending' ? '退款处理中' : '申请退款'"
                    :disabled="item.refund_status === 'pending'"
                    @click="requestRefund(item)"
                  />
                  <ActionButton
                    v-if="hasExecutionResult(item)"
                    icon="check-circle"
                    variant="success"
                    tooltip="查看结果"
                    @click="showDelivery(item)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <BaseModal
      v-model="deliveryDialogVisible"
      title="购买结果"
      size="lg"
      :show-footer="false"
      @close="closeDelivery"
    >
      <div class="space-y-4 text-sm text-gray-700">
        <div class="grid gap-3 rounded-lg bg-gray-50 p-4 sm:grid-cols-2">
          <div>
            <div class="text-xs text-gray-500">执行状态</div>
            <div class="mt-1 font-medium text-gray-900">{{ getExecutionStatusText(selectedDelivery?.status) }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">执行时间</div>
            <div class="mt-1 font-medium text-gray-900">{{ formatTime(selectedDelivery?.executed_at) }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">供货订单号</div>
            <div class="mt-1 break-all font-medium text-gray-900">{{ selectedDelivery?.provider_order_no || '-' }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">供货商品编号</div>
            <div class="mt-1 break-all font-medium text-gray-900">{{ selectedDelivery?.provider_product_no || '-' }}</div>
          </div>
        </div>

        <template v-if="hasDeliveryContent()">
          <a
            v-if="deliveryLink()"
            :href="deliveryLink()"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex rounded-md bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700"
          >
            打开供货链接
          </a>
          <div v-if="selectedDelivery?.delivery?.pickup_code" class="rounded-lg border border-primary-100 bg-primary-50 p-4">
            <div class="text-xs text-primary-700">取餐码 / 提货码</div>
            <div class="mt-1 break-all text-base font-semibold text-primary-900">{{ selectedDelivery.delivery.pickup_code }}</div>
          </div>
          <div v-if="selectedDelivery?.inventory_account" class="rounded-lg border border-primary-100 bg-primary-50 p-4 sm:col-span-2">
            <div class="text-xs text-primary-700">资源内容</div>
            <pre class="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all text-sm text-primary-900">{{ formatResultValue(selectedDelivery.inventory_account) }}</pre>
          </div>
          <div v-for="(card, index) in selectedDelivery?.delivery?.cards || []" :key="`${card.cardNo || ''}-${index}`" class="rounded-lg border border-gray-200 p-4">
            <div class="font-medium text-gray-900">卡券 {{ index + 1 }}</div>
            <div v-if="card.cardNo" class="mt-2 break-all">卡号：{{ card.cardNo }}</div>
            <div v-if="card.cardPwd" class="mt-1 break-all">卡密：{{ card.cardPwd }}</div>
            <div v-if="card.expireTime" class="mt-1">有效期：{{ card.expireTime }}</div>
            <a v-if="card.jumpLink" :href="card.jumpLink" target="_blank" rel="noopener noreferrer" class="mt-3 inline-block font-medium text-primary-700 hover:text-primary-800">打开卡券链接</a>
          </div>
        </template>
        <div v-else class="rounded-lg border border-amber-200 bg-amber-50 p-4 leading-6 text-amber-800">
          订单已执行，但没有返回可展示的供货链接、提货码、卡券或资源内容。
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { getMyPurchases, requestWorkflowRefund } from '@/api/workflowMarket'
import ActionButton from '@/components/ActionButton/index.vue'
import BaseModal from '@/components/BaseModal/index.vue'

const loading = ref(false)
const orders = ref([])
const deliveryDialogVisible = ref(false)
const selectedDelivery = ref(null)

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

const canRequestRefund = (item) => (
  item.status === 'active'
  && item.order_status === 'paid'
  && item.refund_status !== 'refunded'
)

const getRefundText = (item) => {
  if (item.refund_status === 'pending') return '退款处理中，等待半方确认撤单'
  if (item.refund_status === 'rejected') {
    return item.refund_admin_reply || item.refund_seller_reply || '退款未通过'
  }
  return ''
}

const getRefundClass = (item) => (item.refund_status === 'rejected' ? 'text-rose-600' : 'text-amber-600')

const requestRefund = async (item) => {
  if (!window.confirm(`确认申请退款《${item.workflow_name || '该商品'}》？`)) return
  try {
    const res = await requestWorkflowRefund(item.id)
    window.alert(res?.message || '退款申请已提交')
    await fetchOrders()
  } catch (error) {
    window.alert(error?.response?.data?.detail || error?.message || '退款申请失败')
  }
}

const hasExecutionResult = (item) => {
  const result = item?.last_execution_result
  if (!result) return false
  const delivery = result.delivery || {}
  return Boolean(
    result.inventory_account
    || result.provider_order_no
    || result.out_trade_no
    || result.provider_product_no
    || delivery.jump_link
    || delivery.delivery_link
    || delivery.pickup_link
    || delivery.order_link
    || delivery.pickup_code
    || delivery.cards?.length
  )
}

const getExecutionStatusText = (status) => {
  const map = {
    success: '成功',
    completed: '已完成',
    failed: '失败'
  }
  return map[status] || status || '-'
}

const showDelivery = (item) => {
  selectedDelivery.value = item.last_execution_result || {}
  deliveryDialogVisible.value = true
}

const closeDelivery = () => {
  deliveryDialogVisible.value = false
  selectedDelivery.value = null
}

const getDeliveryLink = (delivery) => {
  const data = delivery?.delivery || {}
  return data.jump_link || data.delivery_link || data.pickup_link || data.order_link || ''
}

const formatResultValue = (value) => {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const deliveryLink = () => getDeliveryLink(selectedDelivery.value)

const hasDeliveryContent = () => {
  const delivery = selectedDelivery.value?.delivery || {}
  return Boolean(
    getDeliveryLink(selectedDelivery.value)
    || delivery.pickup_code
    || delivery.cards?.length
    || selectedDelivery.value?.inventory_account
  )
}

onMounted(fetchOrders)
</script>
