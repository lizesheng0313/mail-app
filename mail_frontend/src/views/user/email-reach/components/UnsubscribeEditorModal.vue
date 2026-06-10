<template>
  <BaseModal
    :model-value="visible"
    title="新增退订"
    size="md"
    content-class="rounded-[28px] border border-slate-200 shadow-2xl"
    body-class="overflow-y-auto px-6 py-5"
    :confirm-text="saving ? '保存中...' : '保存'"
    :confirm-loading="saving"
    :confirm-disabled="!canOperate"
    @update:modelValue="handleVisibleChange"
    @confirm="handleSave"
    @cancel="handleClose"
    @close="handleClose"
  >
    <div class="space-y-4">
      <BaseInput v-model="form.email" label="邮箱" placeholder="输入退订邮箱" />
      <div class="grid gap-4 md:grid-cols-1">
        <div>
          <label class="mb-2 block text-sm font-medium text-slate-900">状态</label>
          <CustomSelect v-model="form.status" :options="statusOptions" placeholder="选择状态" />
        </div>
      </div>
      <BaseInput v-model="form.reason" label="原因" placeholder="例如：用户主动退订" />
    </div>
  </BaseModal>
</template>

<script setup>
import { reactive, ref } from 'vue'
import BaseModal from '@/components/BaseModal/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import emailReachApi from '@/api/emailReach'
import { showMessage } from '@/utils/message'

const props = defineProps({
  visible: { type: Boolean, default: false },
  canOperate: { type: Boolean, default: false }
})

const emit = defineEmits(['update:visible', 'saved'])
const saving = ref(false)
const statusOptions = [
  { label: '生效中', value: 'active' },
  { label: '已取消', value: 'inactive' }
]
const form = reactive({
  email: '',
  scope: 'all',
  source: 'system',
  status: 'active',
  reason: ''
})

const handleVisibleChange = (value) => emit('update:visible', value)
const handleClose = () => emit('update:visible', false)

const resetForm = () => {
  form.email = ''
  form.scope = 'all'
  form.source = 'system'
  form.status = 'active'
  form.reason = ''
}

const handleSave = async () => {
  saving.value = true
  try {
    const res = await emailReachApi.saveUnsubscribe({ ...form })
    if (res.code === 0) {
      showMessage('退订记录已保存', 'success')
      emit('saved')
      handleClose()
      resetForm()
    }
  } finally {
    saving.value = false
  }
}
</script>
