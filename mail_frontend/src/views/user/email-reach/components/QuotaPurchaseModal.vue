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
      <div class="grid gap-3 sm:grid-cols-3">
        <button
          v-for="item in quotaOptions"
          :key="item"
          type="button"
          class="rounded-2xl border px-4 py-3 text-left transition"
          :class="Number(form.quota_count) === item
            ? 'border-primary-500 bg-primary-50 text-primary-700'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
          @click="form.quota_count = item"
        >
          <div class="text-xs text-slate-500">常用数量</div>
          <div class="mt-1 text-base font-semibold">{{ item.toLocaleString() }} 封</div>
        </button>
      </div>

      <div>
        <BaseInput
          v-model="quotaInput"
          label="购买邮件量"
          placeholder="请输入购买数量，例如 10000"
        />
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
import BaseInput from '@/components/BaseInput/index.vue'
import emailReachApi from '@/api/emailReach'
import { showMessage } from '@/utils/message'

const props = defineProps({
  visible: { type: Boolean, default: false },
  pricePerTenThousand: { type: Number, default: 0 },
  milkCoinBalance: { type: Number, default: 0 },
  initialQuotaCount: { type: Number, default: 10000 }
})

const emit = defineEmits(['update:visible', 'purchased'])

const submitting = ref(false)
const router = useRouter()
const quotaOptions = [10000, 50000, 100000]
const quotaInput = ref('10000')
const form = reactive({
  quota_count: 10000
})

const estimatedCost = computed(() => {
  const quota = Number(form.quota_count || 0)
  const price = Number(props.pricePerTenThousand || 0)
  if (!quota || !price) return '0.00'
  return ((price * quota) / 10000).toFixed(2)
})

const canSubmit = computed(() => Number(form.quota_count || 0) >= 1000 && !submitting.value)
const hasEnoughBalance = computed(() => Number(props.milkCoinBalance || 0) >= Number(estimatedCost.value || 0))

watch(() => props.visible, (value) => {
  if (!value) return
  form.quota_count = Number(props.initialQuotaCount || 10000)
  quotaInput.value = String(form.quota_count)
})

watch(quotaInput, (value) => {
  const normalized = String(value || '').replace(/[^\d]/g, '')
  quotaInput.value = normalized
  form.quota_count = Number(normalized || 0)
})

watch(() => form.quota_count, (value) => {
  const normalized = String(Number(value || 0) || '')
  if (quotaInput.value !== normalized) {
    quotaInput.value = normalized
  }
})

const handleVisibleChange = (value) => emit('update:visible', value)
const handleClose = () => emit('update:visible', false)

const handleConfirm = async () => {
  if (!hasEnoughBalance.value) {
    handleClose()
    router.push('/payment')
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
    if (String(res.message || '').includes('余额不足') || String(res.message || '').includes('奶片')) {
      handleClose()
      router.push('/payment')
      return
    }
    showMessage(res.message || '购买失败', 'error')
  } finally {
    submitting.value = false
  }
}
</script>
