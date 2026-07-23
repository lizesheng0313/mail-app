<template>
  <BaseModal
    :model-value="visible"
    title="购买邮件量"
    size="sm"
    content-class="rounded-[28px] border border-slate-200 shadow-2xl"
    body-class="overflow-y-auto px-6 py-5"
    :confirm-text="submitting ? '购买中...' : '确定购买'"
    :confirm-loading="submitting"
    :confirm-disabled="!canSubmit"
    @update:modelValue="handleVisibleChange"
    @confirm="handleConfirm"
    @cancel="handleClose"
    @close="handleClose"
  >
    <div class="space-y-4">
      <div class="grid max-h-80 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
        <button
          v-for="item in quotaPackages"
          :key="item.quota"
          type="button"
          class="rounded-2xl border px-4 py-3 text-left transition"
          :class="Number(form.quota_count) === item.quota
            ? 'border-primary-500 bg-primary-50 text-primary-700'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
          @click="form.quota_count = item.quota"
        >
          <div class="text-xs text-slate-500">{{ item.name }}</div>
          <div class="mt-1 text-base font-semibold">{{ item.quota.toLocaleString() }} 封</div>
          <div class="mt-1 text-xs text-primary-700">{{ item.price }} 奶片</div>
        </button>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <div class="flex items-center justify-between gap-4">
          <span>购买邮件量</span>
          <span class="font-medium text-black">{{ Number(form.quota_count || 0).toLocaleString() }} 封</span>
        </div>
        <div class="mt-3 flex items-center justify-between gap-4">
          <span>预计消耗</span>
          <span class="font-medium text-black">{{ estimatedCost }} 奶片</span>
        </div>
        <div class="mt-3 flex items-center justify-between gap-4">
          <span>当前余额</span>
          <span class="font-medium text-black">{{ milkCoinBalance }} 奶片</span>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BaseModal from '@/components/BaseModal/index.vue'
import emailReachApi from '@/api/emailReach'
import { showMessage } from '@/utils/message'
import { isInsufficientBalanceError } from '@/services/api'

const props = defineProps({
  visible: { type: Boolean, default: false },
  pricePerTenThousand: { type: Number, default: 0 },
  milkCoinBalance: { type: Number, default: 0 },
  initialQuotaCount: { type: Number, default: 10000 }
})

const emit = defineEmits(['update:visible', 'purchased'])

const submitting = ref(false)
const router = useRouter()
const quotaPackages = ref([])
const form = reactive({
  quota_count: 10000
})

const estimatedCost = computed(() => {
  const selected = quotaPackages.value.find((item) => item.quota === Number(form.quota_count || 0))
  return Number(selected?.price || 0).toFixed(2)
})

const canSubmit = computed(() => Number(form.quota_count || 0) >= 1000 && !submitting.value)
const hasEnoughBalance = computed(() => Number(props.milkCoinBalance || 0) >= Number(estimatedCost.value || 0))

watch(() => props.visible, (value) => {
  if (!value) return
  loadQuotaPackages()
})

const loadQuotaPackages = async () => {
  const res = await emailReachApi.getQuotaPricing()
  if (res?.code !== 0) return
  quotaPackages.value = (res.data?.packages || []).map((item) => ({
    quota: Number(item.quota || 0),
    price: Number(item.price || 0),
    name: item.name || `${Number(item.quota || 0).toLocaleString()}封套餐`
  }))
  const initialQuota = Number(props.initialQuotaCount || 0)
  const initialMatched = quotaPackages.value.find((item) => item.quota === initialQuota)
  form.quota_count = initialMatched?.quota || quotaPackages.value[0]?.quota || 0
}

const handleVisibleChange = (value) => emit('update:visible', value)
const handleClose = () => emit('update:visible', false)

const handleConfirm = async () => {
  if (!hasEnoughBalance.value) {
    handleClose()
    router.push('/user/finance#recharge')
    return
  }
  submitting.value = true
  try {
    const res = await emailReachApi.purchaseQuota({
      quota_count: Number(form.quota_count || 0)
    })
    if (res.code === 0) {
      showMessage('补量成功', 'success')
      emit('purchased', res.data || {})
      handleClose()
      return
    }
    if (isInsufficientBalanceError(res)) {
      handleClose()
      router.push('/user/finance#recharge')
      return
    }
    showMessage(res.message || '购买失败', 'error')
  } finally {
    submitting.value = false
  }
}
</script>
