<template>
  <div v-if="visible" class="fixed inset-0 z-[170] overflow-y-auto">
    <div class="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm" @click="$emit('close')"></div>
    <div class="flex min-h-full items-center justify-center p-4 sm:p-6">
      <div
        class="relative my-6 flex max-h-[calc(100vh-3rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
      <!-- 成功图标区域 -->
      <div
        class="relative bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 px-6 pt-10 pb-6"
      >
        <div class="mx-auto flex max-w-[260px] flex-col items-center px-6 text-center">
          <!-- 成功图标 -->
          <div
            class="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg mb-4 animate-scale-in"
          >
            <CheckCircleIcon class="w-12 h-12 text-white" />
          </div>
          <h3 class="text-2xl font-bold text-gray-900 mb-1">
            {{ t(productTitleKey) }}
          </h3>
          <p class="text-sm text-gray-600">{{ t(productSubtitleKey) }}</p>
        </div>

        <!-- 关闭按钮 -->
        <button
          @click="$emit('close')"
          class="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/50 transition-all"
        >
          <XMarkIcon class="w-5 h-5" />
        </button>
      </div>

      <!-- 内容区域 -->
      <div class="flex-1 overflow-y-auto p-6">
        <div v-if="product" class="mb-5 space-y-4">
          <div class="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
            <div class="text-xs text-gray-500">{{ t('executionResult.orderNumber') }}</div>
            <div class="mt-1 break-all font-medium text-gray-900">{{ orderResult.orderNo || orderResult.providerOrderNo || '-' }}</div>
            <div v-if="orderResult.orderNo && orderResult.providerOrderNo" class="mt-3 text-xs text-gray-500">{{ t('executionResult.supplierOrderNumber') }}</div>
            <div v-if="orderResult.orderNo && orderResult.providerOrderNo" class="mt-1 break-all text-gray-700">{{ orderResult.providerOrderNo }}</div>
          </div>
          <div v-if="deliveryLink" class="rounded-xl border border-primary-100 bg-primary-50 p-4">
            <div class="text-xs font-medium text-primary-700">{{ t('executionResult.orderLink') }}</div>
            <div class="mt-2 break-all text-sm text-primary-900">{{ deliveryLink }}</div>
            <div class="mt-3 flex flex-wrap gap-2">
              <a :href="deliveryLink" target="_blank" rel="noopener noreferrer" class="rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700">{{ t('executionResult.openLink') }}</a>
              <button type="button" class="rounded-md border border-primary-300 px-3 py-2 text-sm font-medium text-primary-700" @click="copyToClipboard(deliveryLink)">{{ t('executionResult.copyLink') }}</button>
            </div>
          </div>
          <div v-if="orderResult.delivery.pickup_code" class="rounded-xl border border-primary-100 bg-primary-50 p-4">
            <div class="text-xs font-medium text-primary-700">{{ t('executionResult.pickupCode') }}</div>
            <div class="mt-1 break-all font-semibold text-primary-900">{{ orderResult.delivery.pickup_code }}</div>
            <button type="button" class="mt-2 text-sm font-medium text-primary-700" @click="copyToClipboard(String(orderResult.delivery.pickup_code))">{{ t('executionResult.copy') }}</button>
          </div>
          <div v-for="(card, index) in deliveryCards" :key="`${card.cardNo || index}-${index}`" class="rounded-xl border border-gray-200 p-4 text-sm">
            <div class="font-semibold text-gray-900">{{ t('executionResult.cardTitle', { index: index + 1 }) }}</div>
            <div v-if="card.cardNo" class="mt-2 break-all">{{ t('executionResult.cardNumber') }}{{ card.cardNo }}</div>
            <div v-if="card.cardPwd" class="mt-1 break-all">{{ t('executionResult.cardPassword') }}{{ card.cardPwd }}</div>
            <div v-if="card.expireTime" class="mt-1">{{ t('executionResult.cardExpiry') }}{{ card.expireTime }}</div>
            <div class="mt-3 flex flex-wrap gap-3">
              <a v-if="getCardLink(card)" :href="getCardLink(card)" target="_blank" rel="noopener noreferrer" class="font-medium text-primary-700 hover:text-primary-800">{{ t('executionResult.openLink') }}</a>
              <button type="button" class="font-medium text-primary-700" @click="copyToClipboard([card.cardNo, card.cardPwd].filter(Boolean).join(' '))">{{ t('executionResult.copy') }}</button>
            </div>
          </div>
          <div v-if="!hasDelivery && !accountGroups.length" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            {{ orderResult.failReason || t(orderResult.providerStatus === 10 ? 'executionResult.processingHint' : 'executionResult.noDeliveryHint') }}
          </div>
        </div>
        <!-- 账号信息 -->
        <div v-if="accountGroups.length > 0" class="space-y-3">
          <div class="flex items-center gap-2 mb-3">
            <ShieldCheckIcon class="w-5 h-5 text-primary-600" />
            <h4 class="text-base font-semibold text-gray-900">
              {{ t('executionResult.accountTitle') }}
            </h4>
          </div>

          <!-- 账号数据 -->
          <div
            class="group rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 transition-all duration-200 hover:border-primary-300 hover:from-primary-50 hover:to-primary-100 hover:shadow-md"
          >
            <div class="flex items-center justify-between px-4 py-2 border-b border-gray-200">
              <p class="text-xs font-medium text-gray-500">
                {{ t('executionResult.accountData') }}
              </p>
              <div
                class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
              >
                {{ t('executionResult.accountCount', { count: accountGroups.length }) }}
              </div>
              <ActionButton
                icon="copy"
                variant="copy"
                size="sm"
                :tooltip="t('executionResult.copyAllData')"
                @click="copyToClipboard(allAccountText)"
              />
            </div>
            <div class="p-4">
              <div class="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div
                  v-for="(account, accountIndex) in accountGroups"
                  :key="accountIndex"
                  class="border-b border-gray-100 px-4 py-3 last:border-b-0"
                >
                  <div class="flex items-start gap-3">
                    <span class="mt-0.5 text-xs font-semibold text-gray-400">
                      {{ accountIndex + 1 }}.
                    </span>
                    <div
                      class="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-sm leading-6 text-gray-900"
                      style="word-break: break-word; overflow-wrap: anywhere"
                    >
                      {{ account.raw }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 无账号信息 -->
        <div v-else-if="!product" class="text-center py-8">
          <svg
            class="w-12 h-12 text-gray-300 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p class="text-sm text-gray-500">{{ t('executionResult.noAccountInfo') }}</p>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <button v-if="product" type="button" class="mb-2 w-full rounded-xl border border-primary-200 px-4 py-3 font-medium text-primary-700 hover:bg-primary-50" @click="$emit('view-orders')">{{ t('executionResult.viewOrders') }}</button>
        <button
          @click="$emit('close')"
          class="w-full px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium transition-colors shadow-sm hover:shadow"
        >
          {{ t('executionResult.close') }}
        </button>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ActionButton from '@/components/ActionButton/index.vue'
import { showMessage } from '@/utils/message'
import { CheckCircleIcon, XMarkIcon, ShieldCheckIcon } from '@heroicons/vue/24/outline'
import { getCardLink, getDeliveryLink, hasResourceDelivery, normalizeResourceDelivery } from '@/utils/resourceDelivery'

const { t } = useI18n()

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  executionData: {
    type: Object,
    required: true,
    default: () => ({})
  },
  product: {
    type: Boolean,
    default: false
  }
})

defineEmits(['close', 'view-orders'])

const orderResult = computed(() => normalizeResourceDelivery(props.executionData))
const deliveryLink = computed(() => getDeliveryLink(orderResult.value.delivery))
const deliveryCards = computed(() => Array.isArray(orderResult.value.delivery.cards) ? orderResult.value.delivery.cards : [])
const hasDelivery = computed(() => hasResourceDelivery(orderResult.value.delivery))
const productTitleKey = computed(() => {
  if (!props.product) return 'executionResult.successTitle'
  if (orderResult.value.providerStatus === 10) return 'executionResult.productProcessingTitle'
  if (orderResult.value.providerStatus === 30) return 'executionResult.productFailedTitle'
  return hasDelivery.value || accountGroups.value.length ? 'executionResult.productSuccessTitle' : 'executionResult.productPendingTitle'
})
const productSubtitleKey = computed(() => {
  if (!props.product) return 'executionResult.successSubtitle'
  if (orderResult.value.providerStatus === 10) return 'executionResult.productProcessingSubtitle'
  if (orderResult.value.providerStatus === 30) return 'executionResult.productFailedSubtitle'
  return hasDelivery.value || accountGroups.value.length ? 'executionResult.productSuccessSubtitle' : 'executionResult.productPendingSubtitle'
})

// 获取账号数据
const accountData = computed(() => {
  // 直接传入的 inventory_account
  if (props.executionData.inventory_account) {
    return props.executionData.inventory_account
  }

  // 从 result.data.variables.inventory_account 获取
  if (!props.executionData.result) return null

  try {
    const result =
      typeof props.executionData.result === 'string'
        ? JSON.parse(props.executionData.result)
        : props.executionData.result

    const variables = result?.data?.variables
    if (variables && variables.inventory_account) {
      return variables.inventory_account
    }

    return null
  } catch (e) {
    console.error('解析账号数据失败:', e)
    return null
  }
})

const accountGroups = computed(() => {
  const directAccounts = Array.isArray(props.executionData.accounts)
    ? props.executionData.accounts
        .map((item) => item?.account_data || item?.inventory_account || '')
        .filter(Boolean)
    : []

  const rawAccounts =
    directAccounts.length > 0 ? directAccounts : accountData.value ? [accountData.value] : []

  return rawAccounts
    .map((item) => {
      const raw = String(item ?? '').trim()
      return {
        raw
      }
    })
    .filter((item) => item.raw)
})


const allAccountText = computed(() => accountGroups.value.map((item) => item.raw).join('\n\n'))

// 复制到剪贴板
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    showMessage(t('executionResult.copied'), 'success')
  } catch (error) {
    console.error('复制失败:', error)
    showMessage(t('executionResult.copyFailed'), 'error')
  }
}
</script>

<style scoped>
@keyframes scale-in {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-scale-in {
  animation: scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
</style>
