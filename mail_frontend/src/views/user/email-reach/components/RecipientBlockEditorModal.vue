<template>
  <BaseModal
    :model-value="visible"
    title="新增拦截名单"
    size="md"
    :confirm-text="saving ? '保存中...' : '保存'"
    :confirm-loading="saving"
    :confirm-disabled="!canOperate"
    @update:modelValue="handleVisibleChange"
    @confirm="handleSave"
    @cancel="handleClose"
    @close="handleClose"
  >
    <div class="space-y-4">
      <BaseInput v-model="form.email" label="邮箱" placeholder="输入邮箱地址" />
      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-900">名单类型</label>
          <CustomSelect v-model="form.block_type" :options="blockTypeOptions" placeholder="选择名单类型" />
        </div>
      </div>
      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-900">来源</label>
          <CustomSelect v-model="form.source" :options="sourceOptions" placeholder="选择来源" />
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-900">状态</label>
          <CustomSelect v-model="form.status" :options="statusOptions" placeholder="选择状态" />
        </div>
      </div>
      <BaseInput v-model="form.reason" label="原因" placeholder="例如：用户投诉、地址不存在、人工封禁" />
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

defineProps({
  visible: { type: Boolean, default: false },
  canOperate: { type: Boolean, default: false }
})

const emit = defineEmits(['update:visible', 'saved'])
const saving = ref(false)
const blockTypeOptions = [
  { label: '无效地址', value: 'invalid' },
  { label: '投诉地址', value: 'complaint' },
  { label: '黑名单', value: 'blacklist' }
]
const sourceOptions = [
  { label: '系统录入', value: 'system' },
  { label: '手动录入', value: 'manual' },
  { label: '发送前检测', value: 'precheck' },
  { label: '投诉同步', value: 'complaint_sync' }
]
const statusOptions = [
  { label: '生效中', value: 'active' },
  { label: '已取消', value: 'inactive' }
]
const form = reactive({
  email: '',
  block_type: 'invalid',
  scope: 'all',
  source: 'manual',
  status: 'active',
  reason: ''
})

const resetForm = () => {
  form.email = ''
  form.block_type = 'invalid'
  form.scope = 'all'
  form.source = 'manual'
  form.status = 'active'
  form.reason = ''
}

const handleVisibleChange = (value) => emit('update:visible', value)
const handleClose = () => emit('update:visible', false)

const handleSave = async () => {
  saving.value = true
  try {
    const res = await emailReachApi.saveRecipientBlock({ ...form })
    if (res.code === 0) {
      showMessage('拦截名单已保存', 'success')
      emit('saved')
      handleClose()
      resetForm()
    }
  } finally {
    saving.value = false
  }
}
</script>
