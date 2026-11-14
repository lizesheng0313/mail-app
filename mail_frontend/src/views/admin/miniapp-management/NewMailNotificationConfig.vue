<template>
  <div class="space-y-4">
    <div class="flex gap-3">
      <button class="rounded-md border px-3 py-2 text-sm" :disabled="busy" @click="loadTemplates">
        刷新我的模板
      </button>
      <button class="rounded-md border px-3 py-2 text-sm" :disabled="busy" @click="findTemplates">
        查找邮件模板
      </button>
    </div>
    <div v-if="searchResults !== null" class="space-y-2 rounded-md border p-3">
      <p v-if="!searchResults.length" class="text-sm text-gray-500">当前类目未找到邮件模板</p>
      <div v-for="item in searchResults" :key="item.tid" class="flex justify-between gap-3 text-sm">
        <span>{{ item.title }}</span>
        <span>{{ String(item.type) === '2' ? '长期订阅' : '一次性订阅' }} · {{ item.tid }}</span>
        <button
          class="text-primary-600"
          :disabled="busy"
          @click="choosePublicTemplate(String(item.tid))"
        >
          选择
        </button>
      </div>
    </div>
    <div v-if="publicTemplateId" class="space-y-2 rounded-md border p-3">
      <label
        v-for="field in publicKeywords"
        :key="field.kid"
        class="flex items-center gap-2 text-sm"
      >
        <input v-model="keywordIds" type="checkbox" :value="field.kid" />{{ field.name }}
      </label>
      <button
        class="rounded-md border px-3 py-2 text-sm"
        :disabled="busy || !keywordIds.length || keywordIds.length > 5"
        @click="addTemplate"
      >
        添加模板
      </button>
    </div>
    <div>
      <label class="mb-2 block text-sm font-medium text-gray-700">订阅消息模板</label>
      <CustomSelect
        v-model="form.template_id"
        :options="templateOptions"
        @change="selectTemplate"
      />
      <p v-if="!templates.length && !busy" class="mt-2 text-sm text-gray-500">暂无已添加的模板</p>
    </div>
    <div v-for="field in selectedTemplate?.fields || []" :key="field">
      <label class="mb-2 block text-sm font-medium text-gray-700">{{ fieldLabel(field) }}</label>
      <CustomSelect v-model="form.field_mapping[field]" :options="sourceOptions(field)" />
    </div>
    <div>
      <label class="mb-2 block text-sm font-medium text-gray-700">通知跳转版本</label>
      <CustomSelect v-model="form.miniprogram_state" :options="stateOptions" />
    </div>
    <label class="flex items-center gap-2 text-sm text-gray-700">
      <input v-model="form.enabled" type="checkbox" class="rounded border-gray-300" />
      启用新邮件提醒
    </label>
    <div class="flex justify-end">
      <button
        class="rounded-md bg-primary-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        :disabled="busy"
        @click="save"
      >
        {{ busy ? '处理中...' : '保存' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import api from '@/services/api'
import { showMessage } from '@/utils/message'

interface MessageTemplate {
  template_id: string
  title: string
  content: string
  fields: string[]
  template_type: string
}
const props = defineProps<{ miniappId: number }>()
const busy = ref(false)
const templates = ref<MessageTemplate[]>([])
const searchResults = ref<Array<{ tid: string; title: string; type: number }> | null>(null)
const publicTemplateId = ref('')
const publicKeywords = ref<Array<{ kid: number; name: string }>>([])
const keywordIds = ref<number[]>([])
const form = ref({
  template_id: '',
  field_mapping: {} as Record<string, string>,
  miniprogram_state: 'formal',
  enabled: false
})
const selectedTemplate = computed(() =>
  templates.value.find((item) => item.template_id === form.value.template_id)
)
const templateOptions = computed(() =>
  templates.value.map((item) => ({
    value: item.template_id,
    label: `${item.title} · ${item.template_type === 'permanent' ? '长期订阅' : '一次性订阅'}`
  }))
)
const stateOptions = [
  { value: 'formal', label: '正式版' },
  { value: 'trial', label: '体验版' },
  { value: 'developer', label: '开发版' }
]
const sourceOptions = (field: string) =>
  /^(time|date)/.test(field)
    ? [{ value: 'received_at', label: '收件时间' }]
    : field.startsWith('phrase')
      ? [{ value: 'status', label: '新邮件状态' }]
      : field.startsWith('number')
        ? [{ value: 'count', label: '新邮件数' }]
        : [
            { value: 'mailbox', label: '收件邮箱' },
            { value: 'subject', label: '邮件主题' },
            { value: 'sender', label: '发件人' }
          ]
const fieldLabel = (field: string) => {
  const line = selectedTemplate.value?.content
    .split('\n')
    .find((item) => item.includes(`{{${field}.DATA}}`))
  return line?.split('{{')[0].replace(/[：:]\s*$/, '') || field
}
const selectTemplate = () => {
  form.value.field_mapping = Object.fromEntries(
    (selectedTemplate.value?.fields || []).map((field) => [
      field,
      /^(time|date|phrase|number)/.test(field) ? sourceOptions(field)[0].value : ''
    ])
  )
}
const fail = (error: any) =>
  showMessage(error?.response?.data?.detail || error?.message || '操作失败', 'error')

const loadTemplates = async () => {
  busy.value = true
  try {
    const result = await api.get(`/admin/miniapp/${props.miniappId}/mail-notification-templates`)
    if (result.code !== 0) throw new Error(result.message || '读取模板失败')
    templates.value = result.data.items || []
  } catch (error) {
    fail(error)
  } finally {
    busy.value = false
  }
}
const findTemplates = async () => {
  busy.value = true
  try {
    const result = await api.get(`/admin/miniapp/${props.miniappId}/mail-notification-templates`, {
      params: { public: true }
    })
    if (result.code !== 0) throw new Error(result.message || '搜索模板失败')
    searchResults.value = result.data.items || []
  } catch (error) {
    fail(error)
  } finally {
    busy.value = false
  }
}
const save = async () => {
  if (
    form.value.enabled &&
    (!form.value.template_id ||
      !selectedTemplate.value?.fields.length ||
      selectedTemplate.value.fields.some((field) => !form.value.field_mapping[field]))
  ) {
    showMessage('请选择模板并绑定全部字段', 'error')
    return
  }
  busy.value = true
  try {
    const result = form.value.enabled
      ? await api.put(`/admin/miniapp/${props.miniappId}/mail-notifications`, form.value)
      : await api.post(`/admin/miniapp/${props.miniappId}/mail-notifications/disable`)
    if (result.code !== 0) throw new Error(result.message || '保存失败')
    showMessage('保存成功', 'success')
  } catch (error) {
    fail(error)
  } finally {
    busy.value = false
  }
}
const choosePublicTemplate = async (tid: string) => {
  busy.value = true
  try {
    const result = await api.get(
      `/admin/miniapp/${props.miniappId}/mail-notification-keywords/${encodeURIComponent(tid)}`
    )
    if (result.code !== 0) throw new Error(result.message || '读取模板字段失败')
    publicTemplateId.value = tid
    publicKeywords.value = result.data.items || []
    keywordIds.value = []
  } catch (error) {
    fail(error)
  } finally {
    busy.value = false
  }
}
const addTemplate = async () => {
  busy.value = true
  try {
    const result = await api.post(`/admin/miniapp/${props.miniappId}/mail-notification-templates`, {
      tid: publicTemplateId.value,
      keyword_ids: keywordIds.value
    })
    if (result.code !== 0) throw new Error(result.message || '添加模板失败')
    await loadTemplates()
    form.value.template_id = result.data.template_id
    selectTemplate()
    publicTemplateId.value = ''
    searchResults.value = null
    showMessage('添加成功', 'success')
  } catch (error) {
    fail(error)
  } finally {
    busy.value = false
  }
}
onMounted(async () => {
  try {
    const result = await api.get(`/admin/miniapp/${props.miniappId}/mail-notifications`)
    if (result.code !== 0) throw new Error(result.message || '读取配置失败')
    if (result.data)
      form.value = {
        template_id: result.data.template_id,
        field_mapping: result.data.field_mapping,
        miniprogram_state: result.data.miniprogram_state,
        enabled: Boolean(result.data.enabled)
      }
  } catch (error) {
    fail(error)
  }
  await loadTemplates()
})
</script>
