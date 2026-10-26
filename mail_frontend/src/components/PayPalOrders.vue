<template>
  <section v-if="items.length || error" class="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
    <h3 class="text-lg font-bold text-gray-900">{{ t('paypalOrders.title') }}</h3>
    <p v-if="error" role="alert" class="mt-3 text-sm text-red-600">{{ error }}</p>
    <button v-if="error" type="button" class="mt-2 text-sm text-primary-600" @click="load()">{{ t('common.retry') }}</button>
    <ul class="divide-y divide-gray-100">
      <li v-for="item in items" :key="item.order_no" class="py-4 text-sm">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="font-semibold text-gray-900">{{ item.currency }} {{ item.usd_amount }} · {{ t('paypalRecharge.coinCount', { count: item.milk_coins }) }}</p>
            <p class="mt-1 text-gray-500">{{ t(`paypalOrders.${item.status}`) }}</p>
          </div>
          <button v-if="item.status === 'pending' && item.paypal_order_id" type="button" :disabled="!!checking"
            class="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-primary-600 disabled:opacity-50" @click="check(item)">
            {{ t(checking === item.order_no ? 'paypalRecharge.confirming' : 'paypalOrders.check') }}
          </button>
        </div>
        <details class="mt-2 text-gray-500">
          <summary class="cursor-pointer">{{ t('paypalOrders.details') }}</summary>
          <dl class="mt-2 space-y-1 break-all">
            <div>{{ t('paypalOrders.orderNo') }}: {{ item.order_no }}</div>
            <div v-if="item.paypal_order_id">PayPal: {{ item.paypal_order_id }}</div>
            <div v-if="item.capture_id">{{ t('paypalOrders.captureId') }}: {{ item.capture_id }}</div>
            <div>{{ t('paypalOrders.createdAt') }}: {{ formatTime(item.created_at) }}</div>
            <div v-if="item.paid_at">{{ t('paypalOrders.paidAt') }}: {{ formatTime(item.paid_at) }}</div>
          </dl>
        </details>
      </li>
    </ul>
    <button v-if="cursor" type="button" :disabled="loading" class="mt-3 text-sm text-primary-600 disabled:opacity-50" @click="load(true)">{{ t('paypalOrders.more') }}</button>
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/services/api'

const emit = defineEmits(['paid'])
const { t } = useI18n()
const items = ref([])
const cursor = ref(null)
const loading = ref(false)
const checking = ref('')
const error = ref('')
let active = true
let generation = 0
const formatTime = value => new Date(Number(value)).toLocaleString()
async function load(append = false) {
  const request = ++generation
  loading.value = true
  try {
    const response = await api.get('/recharge/paypal/orders', { params: { limit: 10, ...(append && cursor.value ? { before_id: cursor.value } : {}) }, silentErrorMessage: true })
    if (!active || request !== generation) return
    if (response.code !== 0 || !Array.isArray(response.data?.items)) throw new Error('Unavailable')
    items.value = append ? [...items.value, ...response.data.items] : response.data.items
    cursor.value = response.data.next_cursor
    error.value = ''
  } catch {
    if (active && request === generation) error.value = t('common.networkErrorRetry')
  } finally {
    if (active && request === generation) loading.value = false
  }
}
async function check(item) {
  if (checking.value) return
  checking.value = item.order_no
  error.value = ''
  try {
    const response = await api.post(`/recharge/paypal/orders/${encodeURIComponent(item.order_no)}/check`, {}, { timeout: 60000, silentErrorMessage: true })
    if (!active) return
    if (response.code !== 0) throw new Error('Pending')
    Object.assign(item, response.data)
    if (['paid', 'review'].includes(item.status)) emit('paid', response.data)
    else error.value = t('paypalRecharge.pending')
  } catch {
    if (active) error.value = t('paypalRecharge.pending')
  } finally {
    if (active) checking.value = ''
  }
}
defineExpose({ reload: () => load() })
onMounted(() => load())
onBeforeUnmount(() => { active = false; generation++ })
</script>
