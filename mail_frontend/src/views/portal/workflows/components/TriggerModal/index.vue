<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-0 border max-w-4xl shadow-lg rounded-lg bg-white">
      <!-- 头部 -->
      <div class="flex items-center justify-between p-6 border-b">
        <h3 class="text-xl font-semibold text-black">
          {{ isEdit ? t('triggerModal.titleEdit') : t('triggerModal.titleCreate') }}
        </h3>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-black"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 内容 -->
      <div class="p-6">
        <form @submit.prevent="handleSubmit">
          <!-- 基本信息 -->
          <div class="mb-6">
            <h4 class="text-lg font-medium text-black mb-4">{{ t('triggerModal.basicInfo') }}</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="name" class="block text-sm font-medium text-black mb-2">
                  {{ t('triggerModal.name') }} *
                </label>
                <BaseInput
                  id="name"
                  v-model="form.name"
                  type="text"
                  required
                  :placeholder="t('triggerModal.namePlaceholder')"
                  :error-message="errors.name"
                  @input="clearError('name')"
                />
              </div>
              <div>
                <label for="trigger_type" class="block text-sm font-medium text-black mb-2">
                  {{ t('triggerModal.triggerType') }} *
                </label>
                <CustomSelect
                  :model-value="form.trigger_type || ''"
                  :options="triggerTypeOptions"
                  :placeholder="t('triggerModal.triggerTypePlaceholder')"
                  @update:modelValue="(value) => { form.trigger_type = value; handleTypeChange(value); clearError('trigger_type') }"
                />
                <p v-if="errors.trigger_type" class="mt-2 text-sm text-red-600">{{ errors.trigger_type }}</p>
              </div>
            </div>
          </div>

          <!-- 关联工作流 -->
          <div class="mb-6">
            <h4 class="text-lg font-medium text-black mb-4">{{ t('triggerModal.relatedWorkflow') }}</h4>
            <div>
              <label for="workflow_id" class="block text-sm font-medium text-black mb-2">
                {{ t('triggerModal.selectWorkflow') }} *
              </label>
              <CustomSelect
                :model-value="form.workflow_id || ''"
                :options="workflowOptions"
                :placeholder="t('triggerModal.selectWorkflowPlaceholder')"
                :loading="loadingWorkflows"
                @update:modelValue="(value) => { form.workflow_id = value; clearError('workflow_id') }"
              />
              <p v-if="errors.workflow_id" class="mt-2 text-sm text-red-600">{{ errors.workflow_id }}</p>
            </div>
          </div>

          <!-- 触发器配置 -->
          <div class="mb-6">
            <h4 class="text-lg font-medium text-black mb-4">{{ t('triggerModal.config') }}</h4>
            
            <!-- 邮件触发配置 -->
            <div v-if="form.trigger_type === 'email'" class="space-y-4">
              <!-- 配置方式选择 -->
              <div>
                <label class="block text-sm font-medium text-black mb-3">
                  {{ t('triggerModal.configMode') }}
                </label>
                <div class="flex space-x-4">
                  <label class="flex items-center">
                    <input
                      type="radio"
                      value="simple"
                      v-model="configMode"
                      class="form-radio text-primary-600"
                    />
                    <span class="ml-2 text-sm text-black">{{ t('triggerModal.simpleMode') }}</span>
                  </label>
                  <label class="flex items-center">
                    <input
                      type="radio"
                      value="advanced"
                      v-model="configMode"
                      class="form-radio text-primary-600"
                    />
                    <span class="ml-2 text-sm text-black">{{ t('triggerModal.advancedMode') }}</span>
                  </label>
                </div>
              </div>

              <!-- 简单匹配配置 -->
              <div v-if="configMode === 'simple'" class="space-y-4">
                <!-- 匹配类型选择 -->
                <div>
                  <label class="block text-sm font-medium text-black mb-2">
                    {{ t('triggerModal.matchCondition') }} *
                  </label>
                  <CustomSelect
                    :model-value="form.trigger_config.match_type || ''"
                    :options="matchTypeOptions"
                    :placeholder="t('triggerModal.matchTypePlaceholder')"
                    required
                    @update:modelValue="(value) => { form.trigger_config.match_type = value; clearError('match_type') }"
                  />
                  <p v-if="errors.match_type" class="mt-2 text-sm text-red-600">{{ errors.match_type }}</p>
                </div>

                <!-- 匹配内容 -->
                <div>
                  <label for="match_content" class="block text-sm font-medium text-black mb-2">
                    {{ t('triggerModal.matchContent') }} *
                  </label>
                  <BaseInput
                    id="match_content"
                    v-model="form.trigger_config.match_content"
                    type="text"
                    required
                    :placeholder="getMatchPlaceholder()"
                    :error-message="errors.match_content"
                    @input="clearError('match_content')"
                  />
                  <p class="mt-1 text-sm text-black">
                    {{ getMatchDescription() }}
                  </p>
                </div>
              </div>

              <!-- 高级规则配置 -->
              <div v-if="configMode === 'advanced'" class="space-y-4">
                <RuleBuilder
                  v-model="form.trigger_config.rules"
                  @update:modelValue="clearError('rules')"
                />
                <p v-if="errors.rules" class="mt-2 text-sm text-red-600">{{ errors.rules }}</p>
              </div>
            </div>

            <!-- 定时触发配置 -->
            <div v-else-if="form.trigger_type === 'schedule'" class="space-y-4">
              <div>
                <label for="cron_expression" class="block text-sm font-medium text-black mb-2">
                  {{ t('triggerModal.cronExpression') }} *
                </label>
                <BaseInput
                  id="cron_expression"
                  v-model="form.trigger_config.cron_expression"
                  type="text"
                  required
                  :placeholder="t('triggerModal.cronPlaceholder')"
                />
                <p class="mt-1 text-sm text-black">
                  {{ t('triggerModal.cronHelp') }}
                </p>
              </div>
              <div>
                <label for="timezone" class="block text-sm font-medium text-black mb-2">
                  {{ t('triggerModal.timezone') }}
                </label>
                <CustomSelect
                  v-model="form.trigger_config.timezone"
                  :options="timezoneOptions"
                  :placeholder="t('triggerModal.timezonePlaceholder')"
                />
              </div>
            </div>

            <!-- Webhook触发配置 -->
            <div v-else-if="form.trigger_type === 'webhook'" class="space-y-4">
              <div>
                <label for="webhook_url" class="block text-sm font-medium text-black mb-2">
                  {{ t('triggerModal.webhookUrl') }} *
                </label>
                <BaseInput
                  id="webhook_url"
                  v-model="form.trigger_config.webhook_url"
                  type="url"
                  required
                  :placeholder="t('triggerModal.webhookUrlPlaceholder')"
                />
              </div>
              <div>
                <label for="secret" class="block text-sm font-medium text-black mb-2">
                  {{ t('triggerModal.secret') }}
                </label>
                <BaseInput
                  id="secret"
                  v-model="form.trigger_config.secret"
                  type="text"
                  :placeholder="t('triggerModal.secretPlaceholder')"
                />
              </div>
            </div>

            <!-- 手动触发无需配置 -->
            <div v-else-if="form.trigger_type === 'manual'" class="text-center py-8">
              <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3.5M3 16.5h12" />
              </svg>
              <h3 class="mt-2 text-sm font-medium text-black">{{ t('triggerModal.manualTriggerTitle') }}</h3>
              <p class="mt-1 text-sm text-black">{{ t('triggerModal.manualTriggerDesc') }}</p>
            </div>
          </div>

          <!-- 按钮 -->
          <div class="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              @click="$emit('close')"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              {{ t('triggerModal.cancel') }}
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {{ submitting ? t('triggerModal.saving') : (isEdit ? t('triggerModal.update') : t('triggerModal.create')) }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseInput from '@/components/BaseInput/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import RuleBuilder from '@/components/RuleBuilder/index.vue'
import { triggerApi } from '@/api/trigger'
import { workflowApi } from '@/api/workflow'
import { showMessage } from '@/utils/message'

const props = defineProps({
  trigger: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'created', 'updated'])
const { t } = useI18n()

// 响应式数据
const submitting = ref(false)
const loadingWorkflows = ref(false)
const workflows = ref([])
const errors = ref({})

const form = ref({
  name: '',
  trigger_type: '',
  workflow_id: '',  // 改为空字符串而不是null
  trigger_config: {}
})

const configMode = ref('simple') // 'simple' | 'advanced'

// 计算属性
const isEdit = computed(() => !!props.trigger)

const triggerTypeOptions = computed(() => [
  { label: t('triggerModal.typeEmail'), value: 'email' },
  { label: t('triggerModal.typeSchedule'), value: 'schedule' },
  { label: t('triggerModal.typeWebhook'), value: 'webhook' },
  { label: t('triggerModal.typeManual'), value: 'manual' }
])

const matchTypeOptions = computed(() => [
  { label: t('triggerModal.matchSender'), value: 'sender_contains' },
  { label: t('triggerModal.matchRecipient'), value: 'recipient_contains' },
  { label: t('triggerModal.matchSubject'), value: 'subject_contains' },
  { label: t('triggerModal.matchBody'), value: 'content_contains' }
])

const workflowOptions = computed(() => {
  // 确保 workflows.value 是数组
  const workflowsArray = Array.isArray(workflows.value) ? workflows.value : []
  return workflowsArray.map(workflow => ({
    label: workflow.name,
    value: workflow.id  // 使用数据库主键 id 而不是 workflow_id
  }))
})

const timezoneOptions = [
  { label: 'Asia/Shanghai', value: 'Asia/Shanghai' },
  { label: 'UTC', value: 'UTC' },
  { label: 'America/New_York', value: 'America/New_York' },
  { label: 'Europe/London', value: 'Europe/London' }
]

// 方法
const fetchWorkflows = async () => {
  try {
    loadingWorkflows.value = true
    const response = await workflowApi.getWorkflows()
    if (response.code === 0) {
      workflows.value = Array.isArray(response.data.workflows) ? response.data.workflows : []
    } else {
      workflows.value = []
    }
  } catch (error) {
    workflows.value = []
  } finally {
    loadingWorkflows.value = false
  }
}

const handleTypeChange = (type) => {
  // 重置配置
  form.value.trigger_config = {}

  // 根据类型设置默认配置
  if (type === 'schedule') {
    form.value.trigger_config.timezone = 'Asia/Shanghai'
  } else if (type === 'email') {
    // 重置邮件配置模式
    configMode.value = 'simple'
    form.value.trigger_config.match_type = 'subject_contains'
    form.value.trigger_config.match_content = ''
  }
}

const getMatchPlaceholder = () => {
  const matchType = form.value.trigger_config?.match_type
  switch (matchType) {
    case 'sender_contains':
      return t('triggerModal.placeholderSender')
    case 'recipient_contains':
      return t('triggerModal.placeholderRecipient')
    case 'subject_contains':
      return t('triggerModal.placeholderSubject')
    case 'content_contains':
      return t('triggerModal.placeholderBody')
    default:
      return t('triggerModal.placeholderSelectMatchType')
  }
}

const getMatchDescription = () => {
  const matchType = form.value.trigger_config?.match_type
  switch (matchType) {
    case 'sender_contains':
      return t('triggerModal.descriptionSender')
    case 'recipient_contains':
      return t('triggerModal.descriptionRecipient')
    case 'subject_contains':
      return t('triggerModal.descriptionSubject')
    case 'content_contains':
      return t('triggerModal.descriptionBody')
    default:
      return t('triggerModal.descriptionSelectMatchType')
  }
}

const validateForm = () => {
  errors.value = {}

  if (!form.value.name?.trim()) {
    errors.value.name = t('triggerModal.validationName')
  }

  if (!form.value.trigger_type) {
    errors.value.trigger_type = t('triggerModal.validationType')
  }

  if (!form.value.workflow_id) {
    errors.value.workflow_id = t('triggerModal.validationWorkflow')
  }

  if (form.value.trigger_type === 'email') {
    if (configMode.value === 'simple') {
      if (!form.value.trigger_config?.match_type) {
        errors.value.match_type = t('triggerModal.validationMatchType')
      }
      if (!form.value.trigger_config?.match_content?.trim()) {
        errors.value.match_content = t('triggerModal.validationMatchContent')
      }
    } else if (configMode.value === 'advanced') {
      if (!form.value.trigger_config?.rules) {
        errors.value.rules = t('triggerModal.validationRules')
      }
    }
  }

  return Object.keys(errors.value).length === 0
}

const clearError = (field) => {
  if (errors.value[field]) {
    delete errors.value[field]
  }
}

const handleSubmit = async () => {
  // 表单验证
  if (!validateForm()) {
    return
  }

  try {
    submitting.value = true

    const data = {
      name: form.value.name,
      trigger_type: form.value.trigger_type,
      workflow_id: parseInt(form.value.workflow_id),
      trigger_config: form.value.trigger_config
    }

    if (isEdit.value) {
      const response = await triggerApi.updateTrigger(props.trigger.id, data)
      if (response.code === 0) {
        showMessage(t('triggerModal.updateSuccess'), 'success')
        emit('updated')
      }
    } else {
      const response = await triggerApi.createTrigger(data)
      if (response.code === 0) {
        showMessage(t('triggerModal.createSuccess'), 'success')
        emit('created')
      }
    }
  } catch (error) {
    // 处理后端验证错误
    if (error.response?.data?.detail) {
      const detail = error.response.data.detail
      if (Array.isArray(detail)) {
        // Pydantic 验证错误
        detail.forEach(err => {
          const field = err.loc[err.loc.length - 1]
          errors.value[field] = err.msg
        })
      } else {
        showMessage(detail, 'error')
      }
    } else {
      showMessage(t('triggerModal.saveFailed'), 'error')
    }
  } finally {
    submitting.value = false
  }
}

// 监听器
watch(() => props.trigger, (trigger) => {
  if (trigger) {
    form.value = {
      name: trigger.name || '',
      trigger_type: trigger.trigger_type || '',
      workflow_id: trigger.workflow_id || '',  // 确保不是null
      trigger_config: trigger.trigger_config || {}
    }
    
    // 根据已有配置确定配置模式
    if (trigger.trigger_type === 'email') {
      if (trigger.trigger_config?.rules) {
        configMode.value = 'advanced'
      } else {
        configMode.value = 'simple'
      }
    }
  }
}, { immediate: true })

// 生命周期
onMounted(() => {
  fetchWorkflows()
})
</script>
