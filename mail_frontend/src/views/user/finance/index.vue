<template>
  <div class="mx-auto w-full max-w-5xl pb-24 lg:pb-8">
    <MilkAccountTabs />
    <div class="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <section class="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <div class="flex items-center gap-3 lg:flex-col lg:items-start lg:gap-5">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <WalletIcon class="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2 class="text-sm text-gray-500">{{ t('financePage.coinBalance') }}</h2>
            <p class="mt-1 text-3xl font-bold tabular-nums tracking-tight text-gray-900 lg:text-4xl">{{ formatCoins(balance.balance) }}</p>
          </div>
        </div>
        <p class="mt-4 border-t border-gray-100 pt-4 text-xs leading-6 text-gray-500">{{ t('paypalRecharge.noWithdrawal') }}</p>
        <p v-if="balance.paypal_wallet_blocked" role="alert" class="mt-2 text-sm text-red-600">{{ t('paypalRecharge.review') }}</p>
        <p v-if="balanceError" role="alert" class="mt-3 text-sm text-red-600">{{ balanceError }}</p>
      </section>

      <div class="min-w-0 space-y-5">
        <section v-if="isMailboxPayment" class="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <h3 class="text-lg font-bold">{{ t('paypalRecharge.packages') }}</h3>
          <p class="mt-1 text-sm text-gray-500">{{ t('paypalRecharge.packageHint') }}</p>
          <div class="mt-4 grid gap-3 sm:grid-cols-3">
            <button v-for="item in mailboxPackages" :key="item.quota" type="button"
              class="rounded-xl border-2 p-4 text-left"
              :class="selectedMailboxPackage === item.quota ? 'border-primary-500 bg-primary-50' : 'border-gray-200'"
              @click="selectMailboxPackage(item)">
              <p class="text-xl font-bold">{{ t('paypalRecharge.emailCount', { count: item.quota.toLocaleString() }) }}</p>
              <p class="mt-2 text-primary-600">{{ t('paypalRecharge.coinCount', { count: item.price }) }}</p>
            </button>
          </div>
        </section>

        <section id="recharge" class="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7">
          <h3 class="text-xl font-bold text-gray-900">{{ t('financePage.rechargeCoins') }}</h3>
          <p class="mt-2 text-sm leading-6 text-gray-500">{{ t('rechargeCheckout.entryHint') }}</p>

          <div v-if="!isMailboxPayment" role="group" :aria-label="t('rechargeCheckout.amount')" class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <button v-for="value in [10, 50, 100, 300, 500, 1000]" :key="value" type="button"
              :disabled="showPaymentChoice" :aria-label="t('paypalRecharge.coinCount', { count: value })" :aria-pressed="Number(rechargeAmount) === value"
              class="relative flex min-h-28 flex-col items-start justify-center rounded-xl border-2 px-5 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50"
              :class="Number(rechargeAmount) === value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-100 bg-gray-50 text-gray-900 hover:border-primary-200 hover:bg-primary-50/50'"
              @click="rechargeAmount = String(value)">
              <CheckCircleIcon v-if="Number(rechargeAmount) === value" class="absolute right-3 top-3 h-5 w-5 text-primary-600" aria-hidden="true" />
              <span class="text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">{{ value.toLocaleString() }}</span>
              <span class="mt-1 text-xs font-medium" :class="Number(rechargeAmount) === value ? 'text-primary-600' : 'text-gray-500'">{{ t('rechargeCheckout.coinsUnit') }}</span>
            </button>
          </div>

          <div class="mt-5 flex flex-col gap-3 rounded-xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <label for="recharge-coins" class="text-sm font-medium text-gray-700">{{ t('rechargeCheckout.customAmount') }}</label>
            <div class="relative w-full sm:w-48">
              <input id="recharge-coins" v-model="rechargeAmount" type="number" min="1" step="0.01" :disabled="showPaymentChoice"
                :aria-label="t('rechargeCheckout.amount')" :placeholder="t('rechargeCheckout.amountPlaceholder')"
                class="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-14 text-base tabular-nums text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100" />
              <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-gray-500">{{ t('rechargeCheckout.coinsUnit') }}</span>
            </div>
          </div>

          <div class="mt-6 flex flex-col gap-4 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-2 text-xs font-medium text-gray-500">
              <span class="rounded-md border border-gray-200 px-2.5 py-1.5">{{ t('financePage.alipay') }}</span>
              <span class="rounded-md border border-gray-200 px-2.5 py-1.5">PayPal</span>
            </div>
            <button type="button" :disabled="!canRecharge || showPaymentChoice" @click="openRecharge"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 sm:w-auto">
              {{ t('financePage.rechargeNow') }}
              <ArrowRightIcon class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>
    </div>

    <Dialog :open="showPaymentChoice" class="relative z-50" @close="closePayment">
      <div class="fixed inset-0 bg-gray-900/60" aria-hidden="true" />
      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <DialogPanel class="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div class="flex items-center justify-between gap-3">
              <DialogTitle class="text-xl font-bold text-gray-900">{{ t(showQrCode ? 'financePage.alipayTitle' : 'rechargeCheckout.chooseMethod') }}</DialogTitle>
              <button type="button" :aria-label="t('common.close')" :disabled="checkoutBusy" class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40" @click="closePayment">
                <XMarkIcon class="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <p class="mt-2 text-sm text-gray-500">{{ t('rechargeCheckout.receiving', { coins: checkoutAmount }) }}</p>

            <template v-if="!showQrCode">
              <fieldset class="mt-5" :disabled="checkoutBusy">
                <legend class="sr-only">{{ t('rechargeCheckout.chooseMethod') }}</legend>
                <div class="grid grid-cols-2 gap-3">
                  <label v-for="method in paymentMethods" :key="method" class="flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-colors"
                    :class="selectedMethod === method ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'">
                    <span class="min-w-0 flex-1 font-bold text-gray-900">{{ method === 'paypal' ? 'PayPal' : t('financePage.alipay') }}</span>
                    <input v-model="selectedMethod" type="radio" name="recharge-payment-method" :value="method" :aria-label="method === 'paypal' ? 'PayPal' : t('financePage.alipay')" class="h-4 w-4 shrink-0 accent-primary-600" />
                  </label>
                </div>
              </fieldset>

              <div class="mt-5 flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-4">
                <span class="text-sm text-gray-600">{{ t('rechargeCheckout.total') }}</span>
                <span class="text-2xl font-bold text-gray-900">{{ selectedMethod === 'paypal' ? 'USD' : 'CNY' }} {{ checkoutAmount }}</span>
              </div>

              <PayPalRecharge v-if="selectedMethod === 'paypal'" :initial-amount="checkoutAmount" checkout-only @paid="handlePayPalPaid" @busy-change="paypalBusy = $event" />
              <div v-else>
                <button type="button" :disabled="creating" @click="submitRecharge"
                  class="mt-4 w-full rounded-lg bg-primary-600 px-4 py-3 font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                  {{ t(creating ? 'common.loading' : 'rechargeCheckout.payAlipay') }}
                </button>
              </div>
            </template>

            <div v-else class="text-center">
              <p class="mt-5 text-2xl font-bold text-primary-600">CNY {{ orderAmount }}</p>
              <canvas ref="qrcodeCanvas" class="mx-auto my-4 max-w-full" />
              <p v-if="qrError" role="alert" class="mb-3 text-sm text-red-600">{{ qrError }}</p>
              <p class="text-sm text-gray-600">{{ t('financePage.alipayScanHint') }}</p>
              <p class="mt-2 text-xs text-gray-500">{{ t('financePage.paymentHint') }}</p>
              <div class="mt-5 flex gap-3">
                <button type="button" class="flex-1 rounded-lg border border-gray-300 px-4 py-2" @click="cancelRecharge">{{ t('rechargeCheckout.changeMethod') }}</button>
                <button type="button" class="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-white" @click="checkOrderStatus">{{ t('financePage.paid') }}</button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue'
import { ArrowRightIcon, WalletIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { CheckCircleIcon } from '@heroicons/vue/24/solid'
import MilkAccountTabs from '@/components/MilkAccountTabs.vue'
import PayPalRecharge from '@/components/PayPalRecharge.vue'
import { getBalance } from '@/api/milkCoin'
import api from '@/services/api'
import { showMessage } from '@/utils/message'
import { getRechargePaymentMethods } from '@/services/rechargePaymentPreference'

const { t } = useI18n()
const route = useRoute()
const isMailboxPayment = computed(() => String(route.query.type || '') === 'email-package')
const mailboxPackages = [{ quota: 10000, price: 99 }, { quota: 50000, price: 450 }, { quota: 100000, price: 850 }]
const selectedMailboxPackage = ref(10000)
const rechargeAmount = ref('')
const balance = ref({ balance: 0, general_balance: 0, paypal_service_balance: 0, paypal_wallet_blocked: false })
const balanceError = ref('')
const creating = ref(false)
const showPaymentChoice = ref(false)
const checkoutAmount = ref('')
const paymentMethods = getRechargePaymentMethods()
const selectedMethod = ref(paymentMethods[0])
const paypalBusy = ref(false)
const checkoutBusy = computed(() => creating.value || paypalBusy.value)
const showQrCode = ref(false)
const qrcodeCanvas = ref(null)
const qrError = ref('')
const orderAmount = ref('')
let currentOrderNo = ''
let polling
let checking = false
let expiresAt = 0
let active = true
const formatCoins = value => Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '0.00'
const canRecharge = computed(() => /^\d+(\.\d{1,2})?$/.test(String(rechargeAmount.value)) && Number(rechargeAmount.value) >= 1)

function selectMailboxPackage(item) {
  selectedMailboxPackage.value = item.quota
  rechargeAmount.value = String(item.price)
}
watch(isMailboxPayment, value => { if (value) selectMailboxPackage(mailboxPackages[0]) }, { immediate: true })

async function loadBalance() {
  try {
    const response = await getBalance()
    if (response.code !== 0 || !response.data) throw new Error('Balance unavailable')
    if (active) {
      balance.value = { ...response.data, general_balance: response.data.general_balance ?? response.data.balance }
      balanceError.value = ''
    }
  } catch {
    if (active) balanceError.value = t('common.networkErrorRetry')
  }
}

function handlePayPalPaid(result) {
  loadBalance()
  showMessage(t(result.status === 'review' ? 'paypalRecharge.review' : 'profile.rechargeSuccess'), result.status === 'review' ? 'warning' : 'success')
  // onApprove is still finishing; let the child unlock before closing the dialog.
  nextTick(() => closePayment())
}

function openRecharge() {
  if (!canRecharge.value || showPaymentChoice.value) return
  checkoutAmount.value = formatCoins(rechargeAmount.value)
  showPaymentChoice.value = true
}

function closePayment() {
  if (checkoutBusy.value) return
  cancelRecharge()
  showPaymentChoice.value = false
}

async function submitRecharge() {
  if (!showPaymentChoice.value || selectedMethod.value !== 'alipay' || creating.value || showQrCode.value) return
  creating.value = true
  const quotedAmount = checkoutAmount.value
  try {
    const response = await api.post('/recharge/create-order', { amount: Number(quotedAmount) })
    if (!active) return
    if (response.code !== 0 || !response.data?.order_no || !response.data?.qr_code) throw new Error('Order unavailable')
    currentOrderNo = response.data.order_no
    orderAmount.value = formatCoins(response.data.amount ?? quotedAmount)
    showQrCode.value = true
    qrError.value = ''
    expiresAt = Date.now() + 15 * 60 * 1000
    polling = setInterval(checkOrderStatus, 3000)
    await nextTick()
    try {
      const { default: QRCode } = await import('qrcode')
      if (qrcodeCanvas.value) await QRCode.toCanvas(qrcodeCanvas.value, response.data.qr_code, { width: 256, margin: 2 })
    } catch {
      qrError.value = t('common.operationFailed')
    }
  } catch {
    if (active) showMessage(t('financePage.rechargeFailed'), 'error')
  } finally {
    creating.value = false
  }
}

async function checkOrderStatus() {
  if (!currentOrderNo || checking || !active) return
  if (Date.now() > expiresAt) { cancelRecharge(); return }
  const orderNo = currentOrderNo
  checking = true
  try {
    const response = await api.get(`/recharge/order-status/${encodeURIComponent(orderNo)}`, { timeout: 15000 })
    if (active && orderNo === currentOrderNo && response.code === 0 && response.data?.status === 'paid') {
      closePayment()
      showMessage(t('profile.rechargeSuccess'), 'success')
      await loadBalance()
    }
  } catch {
    // The next poll retries; a network failure never implies that a payment failed.
  } finally {
    checking = false
  }
}

function cancelRecharge() {
  clearInterval(polling)
  currentOrderNo = ''
  showQrCode.value = false
}
onMounted(loadBalance)
onBeforeUnmount(() => { active = false; cancelRecharge() })
</script>
