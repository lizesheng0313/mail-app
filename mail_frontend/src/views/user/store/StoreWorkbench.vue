<template>
  <section class="rounded-lg border bg-white shadow-sm">
    <div class="grid gap-3 border-b p-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-lg bg-gray-50 p-4"><div class="text-xs text-gray-500">店铺商品</div><div class="mt-1 text-2xl font-semibold text-gray-900">{{ productTotal }}</div></div>
      <div class="rounded-lg bg-gray-50 p-4"><div class="text-xs text-gray-500">销售订单</div><div class="mt-1 text-2xl font-semibold text-gray-900">{{ orderTotal }}</div></div>
      <div class="rounded-lg bg-gray-50 p-4"><div class="text-xs text-gray-500">待处理退款</div><div class="mt-1 text-2xl font-semibold text-gray-900">{{ pendingRefundTotal }}</div></div>
      <div class="rounded-lg bg-primary-50 p-4"><div class="text-xs text-primary-700">累计销售收入</div><div class="mt-1 text-2xl font-semibold text-primary-700">{{ dashboard.revenue?.total || 0 }} 奶片</div></div>
    </div>

    <div class="flex flex-wrap gap-2 border-b p-4">
      <button v-for="item in tabs" :key="item.value" type="button" class="rounded-md px-4 py-2 text-sm" :class="tab === item.value ? 'bg-primary-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-primary-50'" @click="selectTab(item.value)">{{ item.label }}</button>
    </div>

    <AdminDataTable
      class="min-h-[270px] border-0 shadow-none"
      :loading="loading"
      :column-count="5"
      :scrollable="false"
      :pagination="{ page, totalPages, total, pageSize }"
      @page-change="page = $event"
    >
      <template #thead>
          <tr v-if="tab === 'products'"><th class="px-4 py-3">商品</th><th class="px-4 py-3">价格</th><th class="px-4 py-3">库存</th><th class="px-4 py-3">状态</th><th class="px-4 py-3">操作</th></tr>
          <tr v-else-if="tab === 'orders'"><th class="px-4 py-3">订单</th><th class="px-4 py-3">商品</th><th class="px-4 py-3">买家</th><th class="px-4 py-3">收入</th><th class="px-4 py-3">状态 / 时间</th></tr>
          <tr v-else-if="tab === 'refunds'"><th class="px-4 py-3">退款单</th><th class="px-4 py-3">商品</th><th class="px-4 py-3">原因</th><th class="px-4 py-3">状态</th><th class="px-4 py-3">操作</th></tr>
          <tr v-else><th class="px-4 py-3">链接</th><th class="px-4 py-3">状态</th><th class="px-4 py-3">打开次数</th><th class="px-4 py-3">最后打开</th><th class="px-4 py-3">操作</th></tr>
      </template>
      <template #tbody>
          <template v-if="tab === 'products'">
            <tr v-for="product in rows" :key="product.id">
              <td class="max-w-[280px] px-4 py-3"><div class="truncate font-medium text-gray-900">{{ product.name }}</div><div class="text-xs text-gray-400">{{ product.workflow_id }}</div></td>
              <td class="px-4 py-3">{{ product.milk_coin_price || 0 }} 奶片</td>
              <td class="px-4 py-3">{{ product.inventory_enabled ? `${product.inventory_count || 0} 件` : '—' }}</td>
              <td class="px-4 py-3">{{ productStatus(product) }}</td>
              <td class="space-x-3 whitespace-nowrap px-4 py-3">
                <button class="text-primary-700 hover:underline" @click="editProduct(product)">编辑</button>
                <button v-if="product.market_status === 'published' && product.review_status === 'approved'" class="text-primary-700 hover:underline" @click="shareProduct(product)">复制链接</button>
                <router-link to="/user/automation/workflows" class="text-gray-600 hover:underline">库存</router-link>
              </td>
            </tr>
          </template>
          <template v-else-if="tab === 'orders'">
            <tr v-for="order in rows" :key="order.id">
              <td class="px-4 py-3 font-medium text-gray-900">{{ order.order_no }}</td>
              <td class="max-w-[220px] truncate px-4 py-3">{{ order.workflow_name || '—' }}</td>
              <td class="px-4 py-3">{{ order.buyer_name || `用户 ${order.buyer_id}` }}</td>
              <td class="px-4 py-3">{{ order.seller_revenue || 0 }} 奶片</td>
              <td class="px-4 py-3">{{ orderStatus(order.status) }}<div class="text-xs text-gray-400">{{ formatTime(order.created_at) }}</div></td>
            </tr>
          </template>
          <template v-else-if="tab === 'refunds'">
            <tr v-for="refund in rows" :key="refund.id">
              <td class="px-4 py-3 font-medium text-gray-900">{{ refund.refund_no || refund.id }}</td>
              <td class="max-w-[220px] truncate px-4 py-3">{{ refund.workflow_name || '—' }}</td>
              <td class="max-w-[240px] px-4 py-3">{{ refund.reason || '—' }}</td>
              <td class="px-4 py-3">{{ refundStatus(refund.status) }}</td>
              <td class="space-x-3 whitespace-nowrap px-4 py-3">
                <template v-if="refund.status === 'pending'">
                  <button class="text-primary-700 hover:underline" @click="reviewRefund(refund, true)">同意</button>
                  <button class="text-red-600 hover:underline" @click="reviewRefund(refund, false)">拒绝</button>
                </template>
                <span v-else>—</span>
              </td>
            </tr>
          </template>
          <template v-else>
            <tr v-for="link in rows" :key="link.id">
              <td class="max-w-[260px] px-4 py-3"><div class="truncate font-medium text-gray-900">{{ link.share_type === 'store' ? '店铺链接' : (link.product_name || '商品链接') }}</div><div class="text-xs text-gray-400">{{ formatTime(link.created_at_ms) }} 创建</div></td>
              <td class="px-4 py-3"><span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="linkStatusClass(link)">{{ linkStatus(link) }}</span></td>
              <td class="px-4 py-3">{{ link.open_count || 0 }} 次</td>
              <td class="px-4 py-3">{{ formatTime(link.last_opened_at_ms) }}</td>
              <td class="space-x-3 whitespace-nowrap px-4 py-3">
                <button v-if="canCopyLink(link)" class="text-primary-700 hover:underline" @click="copyLink(link)">复制</button>
                <button v-if="link.status === 'active' && link.share_type === 'product'" class="text-red-600 hover:underline" @click="revoke(link)">撤销</button>
              </td>
            </tr>
          </template>
          <tr v-if="!rows.length"><td colspan="5" class="px-4 py-12 text-center text-gray-500">暂无记录</td></tr>
      </template>
    </AdminDataTable>
    <div v-if="tab === 'links'" class="px-4 pb-3 text-xs text-gray-500">打开次数为页面打开次数，不代表独立访客。</div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  approveWorkflowRefund, createWorkflowShare, getDashboardStats, getMyOrders,
  getMyWorkflows, getSellerRefunds, getStoreLinks, rejectWorkflowRefund, revokeStoreLink
} from '@/api/workflowMarket'
import { showConfirm, showPrompt } from '@/utils/dialog'
import { showMessage } from '@/utils/message'
import AdminDataTable from '@/components/AdminDataTable/index.vue'

const router = useRouter()
const tabs = [
  { value: 'products', label: '商品' }, { value: 'orders', label: '销售订单' },
  { value: 'refunds', label: '退款' }, { value: 'links', label: '分享链接' }
]
const tab = ref('products')
const page = ref(1)
const pageSize = 10
const total = ref(0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const rows = ref([])
const loading = ref(false)
const dashboard = ref({ revenue: {} })
const productTotal = ref(0)
const orderTotal = ref(0)
const pendingRefundTotal = ref(0)

const formatTime = (value) => value ? new Date(Number(value)).toLocaleString() : '—'
const productStatus = (product) => {
  if (product.market_status === 'published' && product.review_status === 'approved') return '在售'
  if (product.review_status === 'pending' || product.market_status === 'reviewing') return '待审核'
  if (product.review_status === 'rejected') return '已拒绝'
  if (product.market_status === 'offline' || product.market_status === 'unlisted') return '已下架'
  if (product.market_status === 'published') return '待审核'
  return '草稿'
}
const canCopyLink = (link) => link.effective_status === 'active'
const linkStatus = (link) => ({ active: '有效', revoked: '已撤销', expired: '已过期', unavailable: '商品不可用' })[link.effective_status] || link.effective_status
const linkStatusClass = (link) => ({ active: 'bg-green-50 text-green-700', revoked: 'bg-gray-100 text-gray-600', expired: 'bg-amber-50 text-amber-700', unavailable: 'bg-amber-50 text-amber-700' })[link.effective_status] || 'bg-gray-100 text-gray-600'
const orderStatus = (status) => ({ pending: '待支付', paid: '已支付', refunded: '已退款', cancelled: '已取消', failed: '失败' })[status] || status
const refundStatus = (status) => ({ pending: '待处理', rejected: '已拒绝', refunded: '已退款', provider_cancel_pending: '撤单中' })[status] || status

const loadSummary = async () => {
  const results = await Promise.allSettled([
    getDashboardStats(), getMyWorkflows({ market_only: true, page: 1, page_size: 1 }),
    getMyOrders({ page: 1, page_size: 1 }), getSellerRefunds({ status: 'pending', page: 1, page_size: 1 })
  ])
  if (results[0].status === 'fulfilled' && results[0].value.code === 0) dashboard.value = results[0].value.data || { revenue: {} }
  if (results[1].status === 'fulfilled' && results[1].value.code === 0) productTotal.value = Number(results[1].value.data?.total || 0)
  if (results[2].status === 'fulfilled' && results[2].value.code === 0) orderTotal.value = Number(results[2].value.data?.total || 0)
  if (results[3].status === 'fulfilled' && results[3].value.code === 0) pendingRefundTotal.value = Number(results[3].value.data?.total || 0)
}
const load = async () => {
  loading.value = true
  try {
    const params = { page: page.value, page_size: pageSize }
    const request = {
      products: () => getMyWorkflows({ ...params, market_only: true }),
      orders: () => getMyOrders(params), refunds: () => getSellerRefunds(params),
      links: () => getStoreLinks(params)
    }[tab.value]
    const response = await request()
    if (response.code !== 0) throw new Error(response.message || '加载失败')
    rows.value = response.data?.items || []
    total.value = Number(response.data?.total || 0)
  } catch (error) {
    rows.value = []
    total.value = 0
    showMessage(error?.message || '加载失败', 'error')
  } finally {
    loading.value = false
  }
}
const selectTab = (value) => {
  tab.value = value
  loadSummary()
  if (page.value === 1) load()
  else page.value = 1
}
const editProduct = (product) => router.push({ path: '/workflows/publish', state: { workflow_id: product.workflow_id, workflow_name: product.name, edit_mode: true } })
const urlForLink = (link) => new URL(
  link.share_type === 'store'
    ? router.resolve({ name: 'private-shop', params: { token: link.share_token } }).href
    : router.resolve({ name: 'workflow-detail', params: { id: link.workflow_id }, query: { share_token: link.share_token } }).href,
  window.location.origin
).toString()
const copyText = async (value) => {
  try { await navigator.clipboard.writeText(value); showMessage('链接已复制', 'success') }
  catch { showMessage('复制失败，请手动复制', 'error') }
}
const copyLink = (link) => copyText(urlForLink(link))
const shareProduct = async (product) => {
  try {
    const response = await createWorkflowShare(product.id)
    if (response.code !== 0) throw new Error(response.message || '创建链接失败')
    await copyText(urlForLink({ share_type: 'product', share_token: response.data.share_token, workflow_id: product.id }))
    if (tab.value === 'links') await load()
  } catch (error) { showMessage(error?.message || '创建链接失败', 'error') }
}
const revoke = async (link) => {
  if (!await showConfirm('撤销后旧链接立即失效，确定继续吗？', '撤销分享链接')) return
  try {
    const response = await revokeStoreLink(link.id)
    if (response.code !== 0) throw new Error(response.message || '撤销失败')
    showMessage('链接已撤销', 'success')
    await load()
  } catch (error) { showMessage(error?.message || '撤销失败', 'error') }
}
const reviewRefund = async (refund, approve) => {
  const reply = approve
    ? (await showConfirm('确定同意这笔退款吗？', '同意退款') ? '' : null)
    : await showPrompt('请输入拒绝原因', '拒绝退款', '')
  if (reply === null || (!approve && !reply?.trim())) return
  try {
    const response = approve ? await approveWorkflowRefund(refund.id) : await rejectWorkflowRefund(refund.id, reply.trim())
    if (response.code !== 0) throw new Error(response.message || '处理失败')
    showMessage('退款已处理', 'success')
    await Promise.all([load(), loadSummary()])
  } catch (error) { showMessage(error?.message || '处理失败', 'error') }
}

watch(page, load)
onMounted(() => { loadSummary(); load() })
</script>
