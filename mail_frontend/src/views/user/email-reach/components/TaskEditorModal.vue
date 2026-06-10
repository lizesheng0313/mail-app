<template>
  <BaseModal
    :model-value="visible"
    title="新建发送任务"
    size="lg"
    content-class="min-h-[560px] overflow-visible rounded-[28px] border border-slate-200 shadow-2xl"
    body-class="overflow-y-auto overflow-x-visible px-6 py-5"
    :confirm-text="saving ? '创建中...' : '创建任务'"
    :confirm-loading="saving"
    :confirm-disabled="!canSubmit"
    @update:modelValue="handleVisibleChange"
    @confirm="handleSave"
    @cancel="handleClose"
    @close="handleClose"
  >
    <div class="space-y-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px_260px]">
        <BaseInput v-model="form.task_name" label="任务名称" placeholder="例如：会员活动通知" />
        <div>
          <label class="mb-2 block text-sm font-medium text-slate-900">发送方式</label>
          <CustomSelect v-model="form.send_mode" :options="sendModeOptions" />
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium text-slate-900">会员分组</label>
          <CustomSelect v-model="form.recipient_filter.group_name" :options="groupOptions" placeholder="全部会员" />
        </div>
      </div>

      <div>
        <label class="mb-2 block text-sm font-medium text-slate-900">发送模板</label>
        <CustomSelect v-model="form.template_id" :options="templateOptions" placeholder="选择模板" />
      </div>

      <div v-if="templateVariables.length">
        <div class="mb-3 text-sm font-medium text-slate-900">模板变量配置</div>
        <div class="grid grid-cols-1 gap-3">
          <div v-for="item in templateVariables" :key="item" class="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
            <div class="mb-2 text-sm font-medium text-slate-900">{{ item }}</div>
            <div class="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr]">
              <CustomSelect v-model="variableSources[item]" :options="variableSourceOptions" placeholder="选择变量来源" />
              <BaseInput
                v-if="variableSources[item] === 'fixed'"
                v-model="variableValues[item]"
                placeholder="填写固定内容"
              />
              <div v-else class="flex h-[46px] items-center rounded-xl bg-emerald-50 px-4 text-sm text-emerald-700">
                发送时按每个会员的字段自动替换
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="form.send_mode === 'scheduled'" class="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <label class="mb-2 block text-sm font-medium text-slate-900">定时类型</label>
          <CustomSelect v-model="form.send_time_type" :options="scheduleTypeOptions" />
        </div>
        <BaseInput
          v-if="form.send_time_type === 'scheduled'"
          v-model="scheduledInput"
          label="发送时间"
          placeholder="2026-05-10 10:00"
        />
        <BaseInput
          v-if="form.send_time_type === 'fixed_daily'"
          v-model="triggerSendTimeInput"
          label="每天发送时间"
          placeholder="09:00"
        />
        <div v-if="['monthly_same_day', 'yearly_same_day'].includes(form.send_time_type)" class="grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px]">
          <div>
            <label class="mb-2 block text-sm font-medium text-slate-900">会员日期字段</label>
            <CustomSelect v-model="form.trigger_rule.field" :options="triggerFieldOptions" placeholder="选择会员字段" />
          </div>
          <BaseInput v-model="triggerSendTimeInput" label="发送时间" placeholder="09:00" />
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
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
const templates = ref([])
const groups = ref([])
const fields = ref([])
const scheduledInput = ref('')
const triggerSendTimeInput = ref('09:00')
const variableValues = reactive({})
const variableSources = reactive({})

const form = reactive({
  task_name: '',
  template_id: '',
  send_mode: 'now',
  send_time_type: 'now',
  recipient_filter: {
    group_name: '',
    field_conditions: []
  },
  trigger_rule: {
    type: '',
    field: ''
  }
})

const sendModeOptions = [
  { label: '立即发送', value: 'now' },
  { label: '定时发送', value: 'scheduled' }
]
const scheduleTypeOptions = [
  { label: '按时间发送', value: 'scheduled' },
  { label: '按日发送', value: 'fixed_daily' },
  { label: '按会员字段每月发送', value: 'monthly_same_day' },
  { label: '按会员字段每年发送', value: 'yearly_same_day' }
]

const resolveTemplateValue = (item) => String(item?.template_id || item?.id || '')
const selectedTemplate = computed(() => (templates.value || []).find((item) => resolveTemplateValue(item) === String(form.template_id)) || null)
const extractTemplateVariables = (text) => {
  const source = String(text || '')
  const doubleMatches = [...source.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)]
    .map((item) => String(item[1] || '').trim())
  const singleMatches = [...source.matchAll(/(^|[^{])\{\s*([\u4e00-\u9fa5a-zA-Z_][\u4e00-\u9fa5a-zA-Z0-9_]{0,48})\s*\}(?!})/g)]
    .map((item) => String(item[2] || '').trim())
  return [...new Set([...doubleMatches, ...singleMatches].filter(Boolean))]
}
const normalizeVariableName = (value) => String(value || '').replace(/^\{\{\s*/, '').replace(/\s*\}\}$/, '').trim()
const templateVariables = computed(() => {
  const variables = selectedTemplate.value?.variables || []
  const savedVariables = Array.isArray(variables) ? variables.map(normalizeVariableName).filter(Boolean) : []
  const contentVariables = extractTemplateVariables(`${selectedTemplate.value?.subject || ''}\n${selectedTemplate.value?.content || ''}`)
  return [...new Set([...savedVariables, ...contentVariables])]
})
const templateOptions = computed(() =>
  (templates.value || [])
    .map((item) => ({
      label: item.name || '未命名模板',
      value: resolveTemplateValue(item)
    }))
    .filter((item) => item.value)
)
const groupOptions = computed(() => [{ label: '全部会员', value: '' }, ...groups.value.map((item) => ({ label: item.group_name, value: item.group_name }))])
const customFieldOptions = computed(() => fields.value.map((item) => ({ label: item.field_label || item.field_key, value: item.field_key })))
const memberVariableFieldOptions = computed(() => {
  const seen = new Set()
  return [{ label: '邮箱', value: 'email' }, ...customFieldOptions.value].filter((item) => {
    if (!item.value || seen.has(item.value)) return false
    seen.add(item.value)
    return true
  })
})
const triggerFieldOptions = computed(() => customFieldOptions.value)
const variableSourceOptions = computed(() => [
  { label: '固定内容', value: 'fixed' },
  ...memberVariableFieldOptions.value.map((item) => ({ label: `取会员字段：${item.label}`, value: `field:${item.value}` }))
])
const canSubmit = computed(() => {
  if (!props.canOperate || saving.value || !form.template_id) return false
  if (form.send_mode === 'now') return !templateVariables.value.some((key) => variableSources[key] === 'fixed' && !String(variableValues[key] || '').trim())
  if (form.send_time_type === 'scheduled' && !parseScheduleTime()) return false
  if (form.send_time_type === 'fixed_daily' && !parseTriggerSendTime()) return false
  if (['monthly_same_day', 'yearly_same_day'].includes(form.send_time_type) && (!form.trigger_rule.field || !parseTriggerSendTime())) return false
  if (templateVariables.value.some((key) => variableSources[key] === 'fixed' && !String(variableValues[key] || '').trim())) return false
  return true
})

const parseScheduleTime = () => {
  const text = String(scheduledInput.value || '').trim()
  if (!text) return null
  const date = new Date(text.replace(/-/g, '/'))
  return Number.isNaN(date.getTime()) ? null : date.getTime()
}

const parseTriggerSendTime = () => {
  const matched = String(triggerSendTimeInput.value || '').trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!matched) return null
  const date = new Date()
  date.setSeconds(0, 0)
  date.setHours(Number(matched[1]), Number(matched[2]), 0, 0)
  return date.getTime()
}

const handleVisibleChange = (value) => {
  emit('update:visible', value)
}

const handleClose = () => {
  emit('update:visible', false)
}

const resetForm = () => {
  form.task_name = ''
  form.template_id = ''
  form.send_mode = 'now'
  form.send_time_type = 'now'
  form.recipient_filter.group_name = ''
  form.recipient_filter.field_conditions = []
  form.trigger_rule.type = ''
  form.trigger_rule.field = ''
  scheduledInput.value = ''
  triggerSendTimeInput.value = '09:00'
  Object.keys(variableValues).forEach((key) => delete variableValues[key])
  Object.keys(variableSources).forEach((key) => delete variableSources[key])
}

const resolveItems = (res) => {
  const data = res?.data
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  return []
}

const loadOptions = async () => {
  const [templateResult, groupResult, fieldResult] = await Promise.allSettled([
    emailReachApi.getTemplates(),
    emailReachApi.getMemberGroups(),
    emailReachApi.getMemberFields()
  ])
  if (templateResult.status === 'fulfilled' && templateResult.value.code === 0) templates.value = resolveItems(templateResult.value)
  if (groupResult.status === 'fulfilled' && groupResult.value.code === 0) groups.value = resolveItems(groupResult.value)
  if (fieldResult.status === 'fulfilled' && fieldResult.value.code === 0) fields.value = resolveItems(fieldResult.value)
}

watch(() => props.visible, async (value) => {
  if (!value || !props.canOperate) return
  await loadOptions()
})

watch(() => form.send_mode, (value) => {
  form.send_time_type = value === 'scheduled' ? 'scheduled' : 'now'
})

watch(() => form.template_id, () => {
  const matched = selectedTemplate.value
  if (!matched) return
  if (!form.task_name) form.task_name = matched.name || '未命名任务'
  templateVariables.value.forEach((key) => {
    if (variableValues[key] === undefined) variableValues[key] = ''
    if (!variableSources[key]) {
      variableSources[key] = 'fixed'
    }
  })
})

const handleSave = async () => {
  if (!form.template_id) {
    showMessage('先选一个模板', 'warning')
    return
  }
  if (form.send_mode === 'scheduled' && form.send_time_type === 'scheduled' && !parseScheduleTime()) {
    showMessage('发送时间不正确', 'warning')
    return
  }
  if (form.send_mode === 'scheduled' && form.send_time_type === 'fixed_daily' && !parseTriggerSendTime()) {
    showMessage('每天发送时间不正确', 'warning')
    return
  }
  if (form.send_mode === 'scheduled' && ['monthly_same_day', 'yearly_same_day'].includes(form.send_time_type) && !form.trigger_rule.field) {
    showMessage('先选择会员日期字段', 'warning')
    return
  }
  if (form.send_mode === 'scheduled' && ['monthly_same_day', 'yearly_same_day'].includes(form.send_time_type) && !parseTriggerSendTime()) {
    showMessage('发送时间不正确', 'warning')
    return
  }
  saving.value = true
  try {
    const filledVariables = {}
    templateVariables.value.forEach((key) => {
      const source = variableSources[key] || 'fixed'
      if (source.startsWith('field:')) {
        filledVariables[key] = { source: 'field', field: source.replace(/^field:/, '') }
        return
      }
      const value = variableValues[key]
      if (value !== undefined && String(value).trim()) filledVariables[key] = String(value).trim()
    })
    const res = await emailReachApi.createTask({
      task_name: form.task_name || selectedTemplate.value?.name || '未命名任务',
      template_id: String(form.template_id),
      recipient_source: 'member_filter',
      recipient_emails: [],
      recipient_variables: filledVariables,
      recipient_filter: { ...form.recipient_filter },
      trigger_rule: form.send_mode === 'scheduled' && form.send_time_type === 'fixed_daily'
        ? { type: form.send_time_type }
        : (form.send_mode === 'scheduled' && ['monthly_same_day', 'yearly_same_day'].includes(form.send_time_type)
            ? { type: form.send_time_type, field: form.trigger_rule.field }
            : {}),
      scheduled_at: form.send_mode === 'scheduled' && form.send_time_type === 'scheduled'
        ? parseScheduleTime()
        : (form.send_mode === 'scheduled' && ['fixed_daily', 'monthly_same_day', 'yearly_same_day'].includes(form.send_time_type)
            ? parseTriggerSendTime()
            : null),
      precheck_required: true
    })
    if (res.code === 0) {
      const summary = res.data?.validation_summary || {}
      showMessage(`任务创建成功，入队 ${summary.queued_count || 0}，拦截 ${summary.blocked_count || 0}`, 'success')
      emit('saved')
      handleClose()
      resetForm()
      return
    }
    showMessage(res.message || '创建任务失败', 'error')
  } finally {
    saving.value = false
  }
}
</script>
