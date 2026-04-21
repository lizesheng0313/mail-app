<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-0 border max-w-6xl shadow-lg rounded-lg bg-white">
      <!-- 头部 -->
      <div class="flex items-center justify-between p-6 border-b">
        <div class="flex items-center space-x-3">
          <div class="h-10 w-10 rounded-lg bg-gradient-to-br from-primary-600 to-blue-600 flex items-center justify-center">
            <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 class="text-xl font-semibold text-black">{{ trigger?.name }}</h3>
            <p class="text-sm text-black">{{ getTriggerTypeLabel(trigger?.trigger_type) }}</p>
          </div>
        </div>
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
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- 左侧：基本信息和配置 -->
          <div class="lg:col-span-2">
            <!-- 基本信息 -->
            <div class="mb-6">
              <h4 class="text-lg font-semibold text-black mb-4">{{ t('triggerDetail.basicInfo') }}</h4>
              <div class="bg-gray-50 rounded-lg p-4">
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span class="text-black">{{ t('triggerDetail.triggerId') }}:</span>
                    <span class="ml-2 font-mono text-black">{{ trigger?.id }}</span>
                  </div>
                  <div>
                    <span class="text-black">{{ t('triggerDetail.type') }}:</span>
                    <span :class="getTriggerTypeClass(trigger?.trigger_type)" class="ml-2 inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full">
                      {{ getTriggerTypeLabel(trigger?.trigger_type) }}
                    </span>
                  </div>
                  <div>
                    <span class="text-black">{{ t('triggerDetail.status') }}:</span>
                    <span :class="trigger?.is_enabled ? 'text-primary-600' : 'text-red-600'" class="ml-2 font-medium">
                      {{ trigger?.is_enabled ? t('triggerDetail.enabled') : t('triggerDetail.disabled') }}
                    </span>
                  </div>
                  <div>
                    <span class="text-black">{{ t('triggerDetail.workflow') }}:</span>
                    <span class="ml-2 text-black">{{ getWorkflowName() }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 触发器配置 -->
            <div class="mb-6">
              <h4 class="text-lg font-semibold text-black mb-4">{{ t('triggerDetail.config') }}</h4>
              
              <!-- 邮件触发配置 -->
              <div v-if="trigger?.trigger_type === 'email'" class="border border-gray-200 rounded-lg p-4 bg-white">
                <div class="flex items-start space-x-3">
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                      <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <h5 class="text-sm font-medium text-black">{{ t('triggerDetail.emailConditions') }}</h5>
                      <div class="flex items-center space-x-2 text-xs">
                        <span class="text-black">{{ t('triggerDetail.configMode') }}:</span>
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                          {{ getEmailConfigMode() }}
                        </span>
                      </div>
                    </div>
                    
                    <!-- 简单匹配配置 -->
                    <div v-if="isSimpleMode()" class="mt-3">
                      <div class="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span class="text-black">{{ t('triggerDetail.matchType') }}:</span>
                          <span class="ml-1 text-black">{{ getMatchTypeLabel() }}</span>
                        </div>
                        <div>
                          <span class="text-black">{{ t('triggerDetail.matchContent') }}:</span>
                          <span class="ml-1 text-black">{{ trigger?.trigger_config?.match_content || t('triggerDetail.unconfigured') }}</span>
                        </div>
                      </div>
                    </div>
                    
                    <!-- 高级规则配置 -->
                    <div v-else class="mt-3">
                      <div class="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span class="text-black">{{ t('triggerDetail.ruleLogic') }}:</span>
                          <span class="ml-1 text-black">{{ trigger?.trigger_config?.rules?.logic?.toUpperCase() || 'AND' }}</span>
                        </div>
                        <div>
                          <span class="text-black">{{ t('triggerDetail.ruleCount') }}:</span>
                          <span class="ml-1 text-black">{{ t('triggerDetail.ruleCountValue', { count: (trigger?.trigger_config?.rules?.conditions || []).length }) }}</span>
                        </div>
                      </div>
                      
                      <div v-if="trigger?.trigger_config?.rules?.conditions && trigger?.trigger_config?.rules?.conditions.length > 0" class="mt-3">
                        <details class="group">
                          <summary class="cursor-pointer text-xs text-primary-600 hover:text-primary-700">
                            {{ t('triggerDetail.viewRuleDetails') }}
                          </summary>
                          <div class="mt-2 bg-gray-100 p-2 rounded space-y-1">
                            <div v-for="(condition, index) in trigger?.trigger_config?.rules?.conditions" :key="index" class="text-xs text-black">
                              {{ t('triggerDetail.ruleIndex', { index: index + 1, value: formatCondition(condition) }) }}
                            </div>
                          </div>
                        </details>
                      </div>
                    </div>

                    <div class="mt-4 border-t border-gray-100 pt-3">
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span class="text-black">{{ t('triggerDetail.executionMode') }}:</span>
                          <span class="ml-1 text-black">{{ getExecutionModeLabel() }}</span>
                        </div>
                        <div v-if="getExecutionScheduleSummary()">
                          <span class="text-black">{{ t('triggerDetail.executionPlan') }}:</span>
                          <span class="ml-1 text-black">{{ getExecutionScheduleSummary() }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 定时触发配置 -->
              <div v-else-if="trigger?.trigger_type === 'schedule'" class="border border-gray-200 rounded-lg p-4 bg-white">
                <div class="flex items-start space-x-3">
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                      <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h5 class="text-sm font-medium text-black">{{ t('triggerDetail.scheduleSettings') }}</h5>
                    <div class="mt-3 grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span class="text-black">{{ t('triggerDetail.cronExpression') }}:</span>
                        <code class="ml-1 bg-gray-100 px-1 py-0.5 rounded text-black">
                          {{ trigger?.trigger_config?.cron_expression || t('triggerDetail.unconfigured') }}
                        </code>
                      </div>
                      <div>
                        <span class="text-black">{{ t('triggerDetail.timezone') }}:</span>
                        <span class="ml-1 text-black">{{ trigger?.trigger_config?.timezone || 'Asia/Shanghai' }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Webhook触发配置 -->
              <div v-else-if="trigger?.trigger_type === 'webhook'" class="border border-gray-200 rounded-lg p-4 bg-white">
                <div class="flex items-start space-x-3">
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h5 class="text-sm font-medium text-black">{{ t('triggerDetail.webhookSettings') }}</h5>
                    <div class="mt-3 space-y-2 text-xs">
                      <div>
                        <span class="text-black block mb-1">{{ t('triggerDetail.webhookUrl') }}:</span>
                        <code class="bg-gray-100 px-2 py-1 rounded text-black block break-all">
                          {{ trigger?.trigger_config?.webhook_url || t('triggerDetail.unconfigured') }}
                        </code>
                      </div>
                      <div>
                        <span class="text-black">{{ t('triggerDetail.secretStatus') }}:</span>
                        <span class="ml-1 text-black">{{ trigger?.trigger_config?.secret ? t('triggerDetail.configured') : t('triggerDetail.unconfigured') }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 手动触发 -->
              <div v-else-if="trigger?.trigger_type === 'manual'" class="border border-gray-200 rounded-lg p-4 bg-white">
                <div class="flex items-start space-x-3">
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg class="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                      </svg>
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h5 class="text-sm font-medium text-black">{{ t('triggerDetail.manualTriggerTitle') }}</h5>
                    <p class="mt-1 text-xs text-black">{{ t('triggerDetail.manualTriggerDesc') }}</p>
                  </div>
                </div>
              </div>

              <!-- 未知类型 -->
              <div v-else class="border border-gray-200 rounded-lg p-4 bg-white">
                <div class="text-center py-4">
                  <p class="text-sm text-black">{{ t('triggerDetail.unknownType') }}</p>
                </div>
              </div>
            </div>

            <!-- 完整配置 -->
            <div class="mb-6">
              <h4 class="text-lg font-semibold text-black mb-4">{{ t('triggerDetail.fullConfig') }}</h4>
              <div class="bg-gray-50 rounded-lg p-4">
                <details class="group">
                  <summary class="cursor-pointer text-sm text-primary-600 hover:text-primary-700">
                    {{ t('triggerDetail.viewJsonConfig') }}
                  </summary>
                  <div class="mt-2 bg-gray-900 rounded-lg p-3">
                    <pre class="text-success-400 text-xs overflow-x-auto">{{ JSON.stringify(trigger?.trigger_config || {}, null, 2) }}</pre>
                  </div>
                </details>
              </div>
            </div>
          </div>

          <!-- 右侧：操作面板 -->
          <div class="lg:col-span-1">
            <div class="sticky top-6 space-y-6">
              <!-- 快速操作 -->
              <div class="bg-white border border-gray-200 rounded-lg p-4">
                <h4 class="text-sm font-medium text-black mb-3">{{ t('triggerDetail.quickActions') }}</h4>
                <div class="space-y-2">
                  <button
                    v-if="trigger?.trigger_type === 'manual'"
                    @click="manualTrigger"
                    :disabled="triggering"
                    class="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                    >
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h1m4 0h1M9 18h6" />
                      </svg>
                    {{ triggering ? t('triggerDetail.triggering') : t('triggerDetail.triggerNow') }}
                  </button>
                </div>
              </div>

              <!-- 统计信息 -->
              <div class="bg-white border border-gray-200 rounded-lg p-4">
                <h4 class="text-sm font-medium text-black mb-3">{{ t('triggerDetail.stats') }}</h4>
                <div class="space-y-3">
                  <div class="flex justify-between text-sm">
                    <span class="text-black">{{ t('triggerDetail.triggerId') }}:</span>
                    <span class="text-black font-mono text-xs">{{ trigger?.id }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-black">{{ t('triggerDetail.createdAt') }}:</span>
                    <span class="text-black">{{ formatDate(trigger?.created_at) }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-black">{{ t('triggerDetail.updatedAt') }}:</span>
                    <span class="text-black">{{ formatDate(trigger?.updated_at) }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-black">{{ t('triggerDetail.workflowId') }}:</span>
                    <span class="text-black font-mono text-xs">{{ trigger?.workflow_id || t('triggerDetail.none') }}</span>
                  </div>
                </div>
              </div>

              <!-- 关联工作流 -->
              <div v-if="trigger?.workflow_id" class="bg-white border border-gray-200 rounded-lg p-4">
                <h4 class="text-sm font-medium text-black mb-3">{{ t('triggerDetail.relatedWorkflow') }}</h4>
                <div class="bg-gradient-to-r from-info-container-from to-info-container-to border border-info-container-border rounded-lg p-3">
                  <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-xs font-semibold text-white">
                      WF
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-success-800">{{ getWorkflowName() }}</p>
                      <p class="text-xs text-primary-700">{{ t('triggerDetail.relatedWorkflowDesc') }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { triggerApi } from '@/api/trigger'
import { showMessage } from '@/utils/message'
import { getCurrentLocale } from '@/i18n'

const props = defineProps({
  trigger: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'view-logs'])
const { t } = useI18n()

const router = useRouter()

// 响应式数据
const triggering = ref(false)

// 方法
const getWorkflowName = () => {
  if (!props.trigger?.workflow_id) {
    return t('triggerDetail.noRelatedWorkflow')
  }
  
  // 直接从触发器对象中获取工作流名称
  if (props.trigger.workflow_info && props.trigger.workflow_info.name) {
    return props.trigger.workflow_info.name
  }
  
  return t('triggerDetail.unknownWorkflow')
}

const getEmailConfigMode = () => {
  // 根据触发器配置判断是简单匹配还是高级规则
  // 优先检查 rules.conditions
  if (props.trigger?.trigger_config?.rules?.conditions && 
      Array.isArray(props.trigger.trigger_config.rules.conditions) && 
      props.trigger.trigger_config.rules.conditions.length > 0) {
    return t('triggerDetail.advancedMode')
  } else if (props.trigger?.trigger_config?.match_content?.trim()) {
    // 只有当 match_content 有实际内容时才算简单匹配
    return t('triggerDetail.simpleMode')
  }
  return t('triggerDetail.unconfigured')
}

const isSimpleMode = () => {
  // 判断是否为简单匹配模式
  const hasAdvancedRules = props.trigger?.trigger_config?.rules?.conditions && 
                          Array.isArray(props.trigger.trigger_config.rules.conditions) && 
                          props.trigger.trigger_config.rules.conditions.length > 0
  const hasSimpleContent = props.trigger?.trigger_config?.match_content?.trim()
  
  return !hasAdvancedRules && hasSimpleContent
}

const getMatchTypeLabel = () => {
  const matchType = props.trigger?.trigger_config?.match_type
  const typeMap = {
    'sender_contains': t('triggerDetail.matchSender'),
    'recipient_contains': t('triggerDetail.matchRecipient'), 
    'subject_contains': t('triggerDetail.matchSubject'),
    'content_contains': t('triggerDetail.matchBody')
  }
  return typeMap[matchType] || matchType || t('triggerDetail.unconfigured')
}

const getExecutionSchedule = () => props.trigger?.trigger_config?.execution_schedule || null

const getExecutionModeLabel = () => {
  const executionSchedule = getExecutionSchedule()
  if (!executionSchedule?.enabled) {
    return t('triggerDetail.executionImmediate')
  }
  if (executionSchedule.mode === 'fixed_times') {
    return t('triggerDetail.executionFixedTimes')
  }
  if (executionSchedule.mode === 'random_window') {
    return t('triggerDetail.executionRandomWindow')
  }
  return t('triggerDetail.unconfigured')
}

const getExecutionScheduleSummary = () => {
  const executionSchedule = getExecutionSchedule()
  if (!executionSchedule?.enabled) {
    return ''
  }
  if (executionSchedule.mode === 'fixed_times') {
    return (executionSchedule.time_points || []).join(', ')
  }
  if (executionSchedule.mode === 'random_window') {
    if (executionSchedule.window_start && executionSchedule.window_end) {
      return `${executionSchedule.window_start} - ${executionSchedule.window_end}`
    }
  }
  return ''
}

const formatCondition = (condition) => {
  // 格式化高级规则中的条件显示
  if (!condition) return t('triggerDetail.invalidCondition')
  
  // 根据条件结构格式化显示
  if (typeof condition === 'object') {
    const field = condition.field || ''
    const operator = condition.operator || ''
    const value = condition.value || ''
    const caseSensitive = condition.case_sensitive
    
    // 字段映射
    const fieldMap = {
      'email.sender': t('triggerDetail.fieldSender'),
      'email.recipient': t('triggerDetail.fieldRecipient'), 
      'email.subject': t('triggerDetail.fieldSubject'),
      'email.body': t('triggerDetail.fieldBody'),
      'email.content': t('triggerDetail.fieldContent')
    }
    
    // 操作符映射
    const operatorMap = {
      'contains': t('triggerDetail.opContains'),
      'equals': t('triggerDetail.opEquals'),
      'starts_with': t('triggerDetail.opStartsWith'),
      'ends_with': t('triggerDetail.opEndsWith'),
      'regex': t('triggerDetail.opRegex'),
      'not_contains': t('triggerDetail.opNotContains'),
      'not_equals': t('triggerDetail.opNotEquals')
    }
    
    const fieldName = fieldMap[field] || field
    const operatorName = operatorMap[operator] || operator
    
    let result = `${fieldName} ${operatorName} "${value}"`
    
    // 添加大小写敏感信息
    if (caseSensitive === false) {
      result += ` ${t('triggerDetail.caseInsensitive')}`
    } else if (caseSensitive === true) {
      result += ` ${t('triggerDetail.caseSensitive')}`
    }
    
    return result
  }
  
  return condition.toString()
}

const viewTriggerLogs = () => {
  // 触发父组件显示日志弹窗，而不是跳转页面
  emit('view-logs', props.trigger)
}

const manualTrigger = async () => {
  if (props.trigger?.trigger_type !== 'manual') {
    return
  }
  
  try {
    triggering.value = true
    const response = await triggerApi.triggerManual(props.trigger.id)
    if (response.code === 0) {
      showMessage(t('triggerDetail.manualSuccess'), 'success')
    } else {
      showMessage(t('triggerDetail.manualFailed'), 'error')
    }
  } catch (error) {
    showMessage(t('triggerDetail.manualFailed'), 'error')
  } finally {
    triggering.value = false
  }
}

const getTriggerTypeLabel = (type) => {
  const typeMap = {
    email: t('triggerDetail.typeEmail'),
    schedule: t('triggerDetail.typeSchedule'),
    webhook: t('triggerDetail.typeWebhook'),
    manual: t('triggerDetail.typeManual')
  }
  return typeMap[type] || type
}

const getTriggerTypeClass = (type) => {
  const classMap = {
    email: 'bg-primary-100 text-primary-800',
    schedule: 'bg-primary-100 text-success-800',
    webhook: 'bg-purple-100 text-purple-800',
    manual: 'bg-gray-100 text-black'
  }
  return classMap[type] || 'bg-gray-100 text-black'
}

const formatDate = (timestamp) => {
  if (!timestamp) return t('common.unknown')
  // timestamp是毫秒级时间戳
  return new Date(timestamp).toLocaleString(getCurrentLocale())
}
</script>
