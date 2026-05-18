<template>
  <BaseModal
    :model-value="visible"
    title="购买邮件量"
    size="sm"
    :confirm-text="submitting ? '购买中...' : '确定购买'"
    :confirm-loading="submitting"
    :confirm-disabled="!canSubmit"
    @update:modelValue="handleVisibleChange"
    @confirm="handleConfirm"
    @cancel="handleClose"
    @close="handleClose"
  >
    <div class="space-y-4">
      <div class="rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
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

const props = defineProps({
  visible: { type: Boolean, default: false },
  pricePerTenThousand: { type: Number, default: 0 },
  milkCoinBalance: { type: Number, default: 0 },
  initialQuotaCount: { type: Number, default: 10000 }
})

const emit = defineEmits(['update:visible', 'purchased'])

const submitting = ref(false)
const router = useRouter()
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
