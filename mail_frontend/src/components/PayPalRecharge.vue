<template>
  <section :class="checkoutOnly ? 'mt-4' : 'rounded-xl bg-white p-5 shadow-lg'">
    <h3 v-if="!checkoutOnly" class="text-lg font-bold text-gray-900">PayPal</h3>
    <p v-if="sandbox && !checkoutOnly" class="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">{{ t('paypalRecharge.sandbox') }}</p>
    <p v-if="!checkoutOnly" class="mt-2 text-sm text-gray-600">{{ t('paypalRecharge.scope') }}</p>
    <template v-if="!checkoutOnly">
    <label class="mt-4 block text-sm font-medium text-gray-700" for="paypal-usd">{{ t('paypalRecharge.amount') }}</label>
    <input id="paypal-usd" v-model="amount" type="number" min="1" max="1000" step="0.01" :disabled="pending"
      class="mt-2 w-full rounded-lg border-2 border-gray-200 px-3 py-2 focus:border-primary-500" />
    <p class="mt-3 text-sm font-semibold text-primary-600">{{ t('paypalRecharge.quote', { usd: displayAmount, coins: displayAmount }) }}</p>
    <p class="mt-1 text-xs text-gray-500">{{ t('paypalRecharge.price') }}</p>
    </template>
    <p v-if="loading || pending" role="status" class="mt-4 text-sm text-gray-600">{{ t(pending ? 'paypalRecharge.confirming' : 'paypalRecharge.loading') }}</p>
    <p v-if="!loading && !enabled" class="mt-4 text-sm text-gray-500">{{ t(setupRequired ? 'paypalRecharge.setupRequired' : 'paypalRecharge.unavailable') }}</p>
    <p v-if="error" role="alert" class="mt-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="enabled && !amountValid" role="alert" class="mt-3 text-sm text-red-600">{{ t('paypalRecharge.invalidAmount') }}</p>
    <div v-show="amountValid" ref="buttonContainer" class="mt-4 min-h-10" />
    <button v-if="error && !pending" class="mt-3 text-sm text-primary-600 underline" type="button" @click="activeOrderNo ? checkOriginalOrder() : initialize()">{{ t(activeOrderNo ? 'paypalOrders.check' : 'common.retry') }}</button>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/services/api'

const props = defineProps({ initialAmount: { type: [String, Number], default: '' }, checkoutOnly: Boolean })
const emit = defineEmits(['paid', 'busy-change', 'order-created'])
const { t } = useI18n()
const amount = ref(props.initialAmount)
const displayAmount = computed(() => {
  const value = Number(amount.value)
  return Number.isFinite(value) && value > 0 ? value.toFixed(2) : '0.00'
})
const pending = ref(false)
watch(pending, value => emit('busy-change', value), { flush: 'sync' })
const enabled = ref(false)
const sandbox = ref(false)
const setupRequired = ref(false)
const loading = ref(true)
const error = ref('')
const minAmount = ref(1), maxAmount = ref(1000)
const amountValid = computed(() => /^\d+(\.\d{1,2})?$/.test(String(amount.value).trim()) && Number(amount.value) >= minAmount.value && Number(amount.value) <= maxAmount.value)
const activeOrderNo = ref('')
const buttonContainer = ref(null)
let buttons
let active = true
let initializing = false
watch(() => props.initialAmount, value => { if (!pending.value) amount.value = value })

async function checkOriginalOrder() {
  if (pending.value || !activeOrderNo.value) return
  pending.value = true
  try {
    const response = await api.post(`/recharge/paypal/orders/${encodeURIComponent(activeOrderNo.value)}/check`, {}, { timeout: 60000, silentErrorMessage: true })
    if (!active) return
    if (response.code !== 0 || !['paid', 'review'].includes(response.data?.status)) throw new Error('Pending')
    error.value = response.data.status === 'review' ? t('paypalRecharge.review') : ''
    emit('paid', response.data)
  } catch {
    if (active) error.value = t('paypalRecharge.pending')
  } finally {
    pending.value = false
  }
}

async function loadSdk(clientId) {
  const scriptId = 'mail-paypal-sdk'
  let script = document.getElementById(scriptId)
  if (script && script.dataset.clientId !== clientId) throw new Error('SDK configuration changed')
  if (window.paypalMailCheckout) return window.paypalMailCheckout
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { script?.remove(); reject(new Error('SDK timeout')) }, 20000)
    const loaded = () => { clearTimeout(timeout); resolve() }
    const failed = () => { clearTimeout(timeout); script?.remove(); reject(new Error('SDK unavailable')) }
    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.dataset.clientId = clientId
      script.dataset.namespace = 'paypalMailCheckout'
      script.src = `https://www.paypal.com/sdk/js?${new URLSearchParams({ 'client-id': clientId, currency: 'USD', components: 'buttons', intent: 'capture' })}`
      script.async = true
      script.addEventListener('load', loaded, { once: true })
      script.addEventListener('error', failed, { once: true })
      document.head.appendChild(script)
    } else {
      script.addEventListener('load', loaded, { once: true })
      script.addEventListener('error', failed, { once: true })
    }
  })
  if (!window.paypalMailCheckout?.Buttons) throw new Error('SDK unavailable')
  return window.paypalMailCheckout
}

async function initialize() {
  if (initializing || !active) return
  initializing = true
  loading.value = true
  error.value = ''
  try {
    await buttons?.close()
    buttons = undefined
    const config = await api.get('/recharge/paypal/config')
    enabled.value = config.code === 0 && config.data?.enabled === true
    sandbox.value = config.data?.environment === 'sandbox'
    setupRequired.value = config.data?.setup_required === true
    minAmount.value = Number(config.data?.min_amount || 1)
    maxAmount.value = Number(config.data?.max_amount || 1000)
    if (!enabled.value) return
    const sdk = await loadSdk(config.data.client_id)
    if (!active) return
    await nextTick()
    buttons = sdk.Buttons({
      style: { layout: 'vertical', label: 'pay' },
      async createOrder() {
        const value = String(amount.value).trim()
        if (!amountValid.value) {
          error.value = t('paypalRecharge.invalidAmount')
          throw new Error('Invalid amount')
        }
        pending.value = true
        error.value = ''
        try {
          const response = await api.post('/recharge/paypal/create-order', { amount: value })
          if (response.code !== 0 || !response.data?.paypal_order_id) throw new Error('Order unavailable')
          activeOrderNo.value = response.data.order_no || ''
          emit('order-created')
          return response.data.paypal_order_id
        } catch {
          pending.value = false
          error.value = t('paypalRecharge.failed')
          throw new Error('Order unavailable')
        }
      },
      async onApprove(data) {
        pending.value = true
        try {
          const response = await api.post(`/recharge/paypal/capture/${encodeURIComponent(data.orderID)}`, {}, { timeout: 60000 })
          if (!active) return
          if (response.code !== 0 || !['paid', 'review'].includes(response.data?.status)) throw new Error('Payment pending')
          error.value = response.data.status === 'review' ? t('paypalRecharge.review') : ''
          emit('paid', response.data)
        } catch {
          error.value = t('paypalRecharge.pending')
        } finally {
          pending.value = false
        }
      },
      onCancel() { pending.value = false },
      onError() { pending.value = false; if (!error.value) error.value = t('paypalRecharge.failed') }
    })
    await buttons.render(buttonContainer.value)
  } catch {
    error.value = t('paypalRecharge.failed')
  } finally {
    loading.value = false
    initializing = false
  }
}
onMounted(initialize)
onBeforeUnmount(() => { active = false; buttons?.close() })
</script>
