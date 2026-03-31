<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-0 border max-w-6xl shadow-lg rounded-lg bg-white">
      <!-- 头部 -->
      <div class="flex items-center justify-between p-6 border-b">
        <div class="flex items-center space-x-3">
          <div class="h-10 w-10 rounded-lg bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
            <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 class="text-xl font-semibold text-black">{{ workflow?.name }}</h3>
            <p class="text-sm text-black">{{ workflow?.description || t('workflowDetail.noDescription') }}</p>
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
          <!-- 左侧：工作流信息 -->
          <div class="lg:col-span-2">
            <!-- 基本信息 -->
            <div class="mb-6">
              <h4 class="text-lg font-semibold text-black mb-4">{{ t('workflowDetail.basicInfo') }}</h4>
              <div class="bg-gray-50 rounded-lg p-4">
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span class="text-black">{{ t('workflowDetail.workflowId') }}:</span>
                    <span class="ml-2 font-mono text-black">{{ workflow?.workflow_id }}</span>
                  </div>
                  <div>
                    <span class="text-black">{{ t('workflowDetail.version') }}:</span>
                    <span class="ml-2 text-black">{{ workflow?.version }}</span>
                  </div>
                  <div>
                    <span class="text-black">{{ t('workflowDetail.author') }}:</span>
                    <span class="ml-2 text-black">{{ workflow?.author }}</span>
                  </div>
                  <div>
                    <span class="text-black">{{ t('workflowDetail.status') }}:</span>
                    <span
                      class="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                      :class="getStatusClass(workflow?.status)"
                    >
                      {{ getStatusText(workflow?.status) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>


            <!-- 工作流步骤 -->
            <div v-if="workflow?.is_owner" class="mb-6">
              <h4 class="text-lg font-semibold text-black mb-4">{{ t('workflowDetail.steps') }}</h4>
              <div class="space-y-4">
                <div
                  v-for="(step, index) in workflow?.steps"
                  :key="step.step_id"
                  class="border border-gray-200 rounded-lg p-4 bg-white"
                >
                  <div class="flex items-start space-x-3">
                    <div class="flex-shrink-0">
                      <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <span class="text-sm font-medium text-success-800">{{ index + 1 }}</span>
                      </div>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between">
                        <h5 class="text-sm font-medium text-black">{{ step.name }}</h5>
                        <div class="flex items-center space-x-2 text-xs">
                          <span class="text-black">{{ t('workflowDetail.action') }}: {{ step.action }}</span>
                        </div>
                      </div>
                      <p class="mt-1 text-sm text-black">{{ step.description || t('workflowDetail.noDescription') }}</p>
                      
                      <!-- 步骤详情 -->
                      <div class="mt-3 grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span class="text-black">{{ t('workflowDetail.timeout') }}:</span>
                          <span class="ml-1 text-black">{{ t('workflowDetail.timeoutValue', { count: step.timeout }) }}</span>
                        </div>
                        <div>
                          <span class="text-black">{{ t('workflowDetail.retry') }}:</span>
                          <span class="ml-1 text-black">{{ t('workflowDetail.retryValue', { count: step.retry_count }) }}</span>
                        </div>
                        <div v-if="step.depends_on && step.depends_on.length > 0" class="col-span-2">
                          <span class="text-black">{{ t('workflowDetail.dependencies') }}:</span>
                          <span class="ml-1 text-black">{{ step.depends_on.join(', ') }}</span>
                        </div>
                      </div>

                      <!-- 参数 -->
                      <div v-if="step.parameters && Object.keys(step.parameters).length > 0" class="mt-3">
                        <details class="group">
                          <summary class="cursor-pointer text-xs text-primary-600 hover:text-primary-700">
                            {{ t('workflowDetail.viewParameters') }}
                          </summary>
                          <pre class="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">{{ JSON.stringify(step.parameters, null, 2) }}</pre>
                        </details>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 购买者提示 -->
            <div v-if="!workflow?.is_owner && workflow?.is_purchaser" class="mb-6">
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div class="flex items-start">
                  <svg class="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 class="text-sm font-semibold text-blue-900 mb-1">{{ t('workflowDetail.purchasedTitle') }}</h4>
                    <p class="text-xs text-blue-800">{{ t('workflowDetail.purchasedDesc') }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- 全局变量 -->
            <div v-if="workflow?.is_owner && workflow?.variables && Object.keys(workflow.variables).length > 0" class="mb-6">
              <h4 class="text-lg font-semibold text-black mb-4">{{ t('workflowDetail.globalVariables') }}</h4>
              <div class="bg-gray-50 rounded-lg p-4">
                <pre class="text-sm text-black overflow-x-auto">{{ JSON.stringify(workflow.variables, null, 2) }}</pre>
              </div>
            </div>
          </div>

          <!-- 右侧：操作面板 -->
          <div class="lg:col-span-1">
            <div class="sticky top-6 space-y-6">


              <!-- 统计信息 -->
              <div class="bg-white border border-gray-200 rounded-lg p-4">
                <h4 class="text-sm font-medium text-black mb-3">{{ t('workflowDetail.stats') }}</h4>
                <div class="space-y-3">
                  <div v-if="workflow?.is_owner" class="flex justify-between text-sm">
                    <span class="text-black">{{ t('workflowDetail.stepCount') }}:</span>
                    <span class="text-black">{{ workflow?.steps?.length || 0 }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-black">{{ t('workflowDetail.createdAt') }}:</span>
                    <span class="text-black">{{ formatDate(workflow?.created_at) }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-black">{{ t('workflowDetail.updatedAt') }}:</span>
                    <span class="text-black">{{ formatDate(workflow?.updated_at) }}</span>
                  </div>
                </div>
              </div>

              <!-- 使用插件 -->
              <div v-if="workflowPlugins.length > 0" class="bg-white border border-gray-200 rounded-lg p-4">
                <h4 class="text-sm font-medium text-black mb-3">{{ t('workflowDetail.usedPlugins') }}</h4>
                <div v-for="plugin in workflowPlugins" :key="plugin.id" class="bg-gradient-to-r from-info-container-from to-info-container-to border border-info-container-border rounded-lg p-3 mb-2 last:mb-0">
                  <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-xs font-semibold text-white">
                      {{ plugin.icon }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-success-800">{{ plugin.name }}</p>
                      <p class="text-xs text-primary-700">{{ plugin.description || t('workflowDetail.relatedPluginModule') }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 工作流设置 -->
              <div v-if="workflow?.settings && Object.keys(workflow.settings).length > 0" class="bg-white border border-gray-200 rounded-lg p-4">
                <h4 class="text-sm font-medium text-black mb-3">{{ t('workflowDetail.settings') }}</h4>
                <pre class="text-xs text-black overflow-x-auto">{{ JSON.stringify(workflow.settings, null, 2) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { pluginApi } from '@/api/plugin'
import { getCurrentLocale } from '@/i18n'

const { t } = useI18n()

const props = defineProps({
  workflow: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'updated'])

// 响应式数据
const plugins = ref([])

// 获取工作流中使用的所有插件信息
const workflowPlugins = computed(() => {
  if (!props.workflow) return []
  
  const pluginIds = new Set()
  
  // 工作流级别的插件
  if (props.workflow.workflow_plugin_id) {
    pluginIds.add(props.workflow.workflow_plugin_id)
  }
  
  // 步骤级别的额外插件
  if (props.workflow.steps) {
    props.workflow.steps.forEach(step => {
      if (step.plugin_id) {
        pluginIds.add(step.plugin_id)
      }
    })
  }
  
  return Array.from(pluginIds).map(pluginId => {
    const plugin = plugins.value.find(p => p.id === pluginId)
    return {
      id: pluginId,
      name: plugin?.name || pluginId,
      icon: plugin?.icon || getPluginDisplayText(pluginId),
      description: plugin?.description || '',
      version: plugin?.version || null  // null 表示没有版本信息
    }
  })
})

// 获取插件显示文字（如果没有图标，使用文字）
const getPluginDisplayText = (pluginId) => {
  if (!pluginId) return '?'
  
  // 使用插件ID的前两个字符，或者插件名称的缩写
  if (pluginId.length >= 2) {
    return pluginId.substring(0, 2).toUpperCase()
  }
  return pluginId.toUpperCase()
}

// 获取插件信息
const fetchPlugins = async () => {
  try {
    const response = await pluginApi.getMyPlugins()
    if (response.code === 0 && response.data) {
      plugins.value = response.data.plugins || []
    }
  } catch (error) {
    // 静默处理获取插件列表失败
  }
}

// 初始化时获取插件信息
fetchPlugins()

// 方法
const getStatusClass = (status) => {
  const classes = {
    active: 'bg-primary-100 text-success-800',
    inactive: 'bg-gray-100 text-black',
    draft: 'bg-yellow-100 text-yellow-800'
  }
  return classes[status] || 'bg-gray-100 text-black'
}

const getStatusText = (status) => {
  const texts = {
    active: t('workflowDetail.statusActive'),
    inactive: t('workflowDetail.statusInactive'),
    draft: t('workflowDetail.statusDraft')
  }
  return texts[status] || status
}

const formatDate = (dateString) => {
  if (!dateString) return t('common.unknown')
  return new Date(dateString).toLocaleString(getCurrentLocale())
}
</script>
