<template>
  <section class="space-y-5">
    <form class="flex flex-wrap gap-3" @submit.prevent="loadOrders()">
      <input v-model.trim="keyword" aria-label="PayPal 订单号" placeholder="平台订单号 / PayPal 单号 / 收款交易号" class="min-w-64 flex-1 rounded-lg border p-2" maxlength="128" />
      <select v-model="status" aria-label="订单状态" class="rounded-lg border p-2">
        <option value="">全部状态</option><option v-for="(label, value) in statuses" :key="value" :value="value">{{ label }}</option>
      </select>
      <button class="rounded-lg bg-primary-600 px-4 py-2 text-white" :disabled="loading">查询订单</button>
    </form>
    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
    <div class="overflow-x-auto rounded-xl border bg-white">
      <table class="w-full text-left text-sm">
        <thead class="bg-gray-50"><tr><th class="p-3">订单 / 用户</th><th class="p-3">美元实付 / 到账奶片</th><th class="p-3">PayPal / 收款交易号</th><th class="p-3">状态 / 累计退款奶片</th><th class="p-3">创建 / 到账时间</th></tr></thead>
        <tbody><tr v-for="item in orders" :key="item.order_no" class="border-t align-top">
          <td class="p-3 break-all">{{ item.order_no }}<p class="mt-1 text-gray-500">用户 {{ item.user_id }}</p></td>
          <td class="p-3">{{ item.currency }} {{ item.usd_amount }}<p>{{ item.milk_coins }} 奶片</p></td>
          <td class="p-3 break-all">{{ item.paypal_order_id || '—' }}<p>{{ item.capture_id || '—' }}</p></td>
          <td class="p-3">{{ statuses[item.status] || item.status }}<p>{{ item.refunded_coins || '0.00' }} 奶片</p></td>
          <td class="p-3 whitespace-nowrap">{{ time(item.created_at) }}<p>{{ time(item.paid_at) }}</p></td>
        </tr><tr v-if="!orders.length"><td colspan="5" class="p-6 text-center text-gray-500">暂无订单</td></tr></tbody>
      </table>
    </div>
    <button v-if="orderCursor" class="text-sm text-primary-600" :disabled="loading" @click="loadOrders(true)">加载更多订单</button>
    <div class="flex items-center justify-between gap-3">
      <h3 class="text-lg font-bold">退款与争议核对</h3>
      <label class="text-sm"><input v-model="resolved" type="checkbox" @change="loadReviews()" /> 查看已处理</label>
    </div>
    <div v-for="item in reviews" :key="item.id" class="rounded-xl border bg-white p-4 text-sm">
      <p class="font-semibold break-all">{{ item.order_no || '尚未关联订单' }} · {{ item.event_type }}</p>
      <p class="mt-1 break-all text-gray-500">{{ item.event_id }} · {{ item.resource_id }} · {{ time(item.created_at) }}</p>
      <p class="mt-1">用户 {{ item.user_id || '—' }} · USD {{ item.usd_amount || '—' }} · 累计退款 {{ item.refunded_coins || '0.00' }} 奶片</p>
      <div v-if="item.resolved_at" class="mt-3 rounded-lg bg-gray-50 p-3">
        <p>{{ item.outcome === 'refund' ? '退款扣回' : '争议解除' }} · 操作人 {{ item.resolved_by }} · {{ time(item.resolved_at) }}</p>
        <p class="mt-1 break-all">凭证 {{ item.reference_no }} · {{ item.note }}</p>
      </div>
      <button v-else-if="item.order_no" type="button" class="mt-3 text-primary-600" @click="startReview(item)">核对处理</button>
    </div>
    <p v-if="!reviews.length" class="text-sm text-gray-500">暂无{{ resolved ? '已处理' : '待处理' }}事件</p>
    <button v-if="reviewCursor" class="text-sm text-primary-600" @click="loadReviews(true)">加载更多事件</button>
    <form v-if="selected" class="space-y-4 rounded-xl border border-primary-200 bg-white p-5" @submit.prevent="resolveReview">
      <h4 class="font-bold">处理 {{ selected.order_no }}</h4>
      <p class="text-sm text-gray-600">先在 PayPal 核对处理结果。本操作记录结论及奶片调整，不向 PayPal 发起退款；奶片不足时继续冻结。</p>
      <label class="block text-sm">处理结论
        <select v-model="form.outcome" class="mt-1 block w-full rounded-lg border p-2" :disabled="saving">
          <option v-if="selected.event_type === 'CUSTOMER.DISPUTE.CREATED'" value="release">争议已解除，无新增退款</option>
          <option value="refund">已退款，按累计金额扣回奶片</option>
        </select>
      </label>
      <label v-if="form.outcome === 'refund'" class="block text-sm">该订单在 PayPal 已完成的累计退款金额（美元，1 美元对应 1 奶片）
        <input v-model="form.refunded_total" type="number" min="0.01" :max="selected.milk_coins" step="0.01" required :disabled="saving" class="mt-1 block w-full rounded-lg border p-2" />
      </label>
      <label class="block text-sm">PayPal 退款或争议凭证编号<input v-model.trim="form.reference" required maxlength="128" :disabled="saving" class="mt-1 block w-full rounded-lg border p-2" /></label>
      <label class="block text-sm">处理说明<textarea v-model.trim="form.note" required minlength="8" maxlength="1000" :disabled="saving" class="mt-1 block w-full rounded-lg border p-2" /></label>
      <label class="block text-sm"><input v-model="form.provider_verified" type="checkbox" required :disabled="saving" /> 我已核对 PayPal 最终结果及累计退款金额</label>
      <div class="flex gap-3"><button type="submit" :disabled="saving || !form.provider_verified" class="rounded-lg bg-primary-600 px-4 py-2 text-white disabled:opacity-50">{{ saving ? '处理中…' : '提交处理结果' }}</button><button type="button" :disabled="saving" @click="selected = null">取消</button></div>
    </form>
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import api from '@/services/api'

const statuses = { pending: '待确认', paid: '已到账', review: '退款或争议核对中', refunded: '已退款', partially_refunded: '部分退款' }
const orders = ref([]), reviews = ref([]), keyword = ref(''), status = ref(''), resolved = ref(false)
const orderCursor = ref(null), reviewCursor = ref(null), loading = ref(false), saving = ref(false), error = ref(''), selected = ref(null)
const form = reactive({ outcome: 'refund', refunded_total: '', reference: '', note: '', provider_verified: false })
const time = value => value ? new Date(Number(value)).toLocaleString() : '—'
let active = true, orderGeneration = 0, reviewGeneration = 0
async function loadOrders(append = false) {
  const generation = ++orderGeneration
  loading.value = true
  try {
    const response = await api.get('/finance/admin/paypal-orders', { params: { status: status.value || undefined, keyword: keyword.value || undefined, before_id: append ? orderCursor.value : undefined } })
    if (!active || generation !== orderGeneration) return
    if (response.code !== 0) throw new Error('查询失败')
    orders.value = append ? [...orders.value, ...response.data.items] : response.data.items
    orderCursor.value = response.data.next_cursor
    error.value = ''
  } catch { if (active && generation === orderGeneration) error.value = '订单查询失败，请重试' }
  finally { if (active && generation === orderGeneration) loading.value = false }
}
async function loadReviews(append = false) {
  const generation = ++reviewGeneration
  try {
    const response = await api.get('/finance/admin/paypal-reviews', { params: { resolved: resolved.value, before_id: append ? reviewCursor.value : undefined } })
    if (!active || generation !== reviewGeneration) return
    if (response.code !== 0) throw new Error('查询失败')
    reviews.value = append ? [...reviews.value, ...response.data.items] : response.data.items
    reviewCursor.value = response.data.next_cursor
  } catch { if (active && generation === reviewGeneration) error.value = '核对事件查询失败，请重试' }
}
function startReview(item) {
  selected.value = item
  Object.assign(form, { outcome: item.event_type === 'CUSTOMER.DISPUTE.CREATED' ? 'release' : 'refund', refunded_total: String(item.refunded_coins || ''), reference: '', note: '', provider_verified: false })
}
async function resolveReview() {
  if (saving.value || !selected.value || !form.provider_verified) return
  saving.value = true
  try {
    const response = await api.post(`/finance/admin/paypal-reviews/${selected.value.id}/resolve`, {
      outcome: form.outcome, note: form.note, reference: form.reference, provider_verified: true,
      ...(form.outcome === 'refund' ? { refunded_total: form.refunded_total } : {})
    })
    if (!active) return
    if (response.code !== 0) throw new Error(response.message || '处理失败')
    selected.value = null
    error.value = ''
    await Promise.all([loadOrders(), loadReviews()])
  } catch (exc) { if (active) error.value = exc.response?.data?.detail || exc.message || '处理失败，原冻结状态保留' }
  finally { if (active) saving.value = false }
}
onMounted(() => Promise.all([loadOrders(), loadReviews()]))
onBeforeUnmount(() => { active = false })
</script>
