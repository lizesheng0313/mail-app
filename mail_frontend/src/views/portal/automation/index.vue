<template>
  <div>
    <!-- 顶部导航 -->
    <PageHeader />
    
    <div class="bg-gray-50 pb-20">
  
    <!-- 主要内容 -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <!-- 新手引导卡片 -->
      <div class="bg-gradient-to-r from-info-container-from to-info-container-to border border-info-container-border rounded-xl p-8 mb-12 shadow-sm">
        <div class="flex items-start justify-between">
          <div class="flex">
            <div class="flex-shrink-0">
              <div class="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                <svg class="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            </div>
            <div class="ml-6">
              <h3 class="text-lg font-semibold text-black mb-4">{{ t('automationDashboard.heroTitle') }}</h3>
              <p class="text-primary-700 mb-5 text-base">{{ t('automationDashboard.heroDesc') }}</p>
              <div class="flex flex-wrap items-center gap-8">
                <div class="flex items-center">
                  <div class="flex-shrink-0 w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white text-base font-semibold">1</div>
                  <div class="ml-3">
                    <div class="text-base font-semibold text-black">{{ t('automationDashboard.step1Title') }}</div>
                    <div class="text-sm text-primary-600">{{ t('automationDashboard.step1Desc') }}</div>
                  </div>
                </div>
                <svg class="w-4 h-4 text-primary-500 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
                <div class="flex items-center">
                  <div class="flex-shrink-0 w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white text-base font-semibold">2</div>
                  <div class="ml-3">
                    <div class="text-base font-semibold text-black">{{ t('automationDashboard.step2Title') }}</div>
                    <div class="text-sm text-primary-600">{{ t('automationDashboard.step2Desc') }}</div>
                  </div>
                </div>
                <svg class="w-4 h-4 text-primary-500 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
                <div class="flex items-center">
                  <div class="flex-shrink-0 w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white text-base font-semibold">3</div>
                  <div class="ml-3">
                    <div class="text-base font-semibold text-black">{{ t('automationDashboard.step3Title') }}</div>
                    <div class="text-sm text-primary-600">{{ t('automationDashboard.step3Desc') }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 统计概览卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
        <!-- 触发器统计 -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="p-10">
            <div class="flex items-center">
              <div class="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div class="ml-4">
                <h3 class="text-base font-semibold text-black">{{ t('automationDashboard.triggersTitle') }}</h3>
                <p class="text-sm text-black">{{ t('automationDashboard.triggersDesc') }}</p>
              </div>
            </div>
            
            <div class="mt-6">
              <div class="flex items-center justify-between mb-6">
                <div class="grid grid-cols-2 gap-4">
                  <div class="text-center">
                    <div class="text-2xl font-bold text-black">{{ triggerStats.total }}</div>
                    <div class="text-sm text-black">{{ t('automationDashboard.total') }}</div>
                  </div>
                  <div class="text-center">
                    <div class="text-2xl font-bold text-primary-600">{{ triggerStats.active }}</div>
                    <div class="text-sm text-black">{{ t('automationDashboard.active') }}</div>
                  </div>
                </div>
                <div class="flex flex-col space-y-2">
                  <button
                    @click="showCreateTrigger = true"
                    class="relative group inline-flex items-center justify-center w-8 h-8 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      {{ t('automationDashboard.createTrigger') }}
                    </div>
                  </button>
                  <router-link
                    to="/automation/triggers"
                    class="relative group inline-flex items-center justify-center w-8 h-8 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      {{ t('automationDashboard.manageTriggers') }}
                    </div>
                  </router-link>
                </div>
              </div>
              
              <div class="mt-6">
                <div class="bg-gradient-to-r from-info-container-from to-info-container-to rounded-lg p-5">
                  <div class="flex items-center">
                    <svg class="w-4 h-4 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div class="ml-3">
                      <p class="text-sm font-medium text-black">{{ t('automationDashboard.triggerInfoTitle') }}</p>
                      <p class="text-sm text-primary-700 mt-1">{{ t('automationDashboard.triggerInfoDesc') }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 工作流统计 -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="p-10">
            <div class="flex items-center">
              <div class="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <div class="ml-4">
                <h3 class="text-base font-semibold text-black">{{ t('automationDashboard.workflowsTitle') }}</h3>
                <p class="text-sm text-black">{{ t('automationDashboard.workflowsDesc') }}</p>
              </div>
            </div>
            
            <div class="mt-6">
              <div class="flex items-center justify-between mb-6">
                <div class="grid grid-cols-2 gap-4">
                  <div class="text-center">
                    <div class="text-2xl font-bold text-black">{{ workflowStats.total }}</div>
                    <div class="text-sm text-black">{{ t('automationDashboard.total') }}</div>
                  </div>
                  <div class="text-center">
                    <div class="text-2xl font-bold text-primary-600">{{ workflowStats.active }}</div>
                    <div class="text-sm text-black">{{ t('automationDashboard.running') }}</div>
                  </div>
                </div>
                <div class="flex flex-col space-y-2">
                  <button
                    @click="showCreateWorkflow = true"
                    class="relative group inline-flex items-center justify-center w-8 h-8 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      {{ t('automationDashboard.createWorkflow') }}
                    </div>
                  </button>
                  <router-link
                    to="/automation/workflows"
                    class="relative group inline-flex items-center justify-center w-8 h-8 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      {{ t('automationDashboard.manageWorkflows') }}
                    </div>
                  </router-link>
                </div>
              </div>
              
              <div class="mt-6">
                <div class="bg-gradient-to-r from-info-container-from to-info-container-to rounded-lg p-5">
                  <div class="flex items-center">
                    <svg class="w-4 h-4 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div class="ml-3">
                      <p class="text-sm font-medium text-black">{{ t('automationDashboard.workflowInfoTitle') }}</p>
                      <p class="text-sm text-primary-700 mt-1">{{ t('automationDashboard.workflowInfoDesc') }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 插件统计 -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="p-10">
            <div class="flex items-center">
              <div class="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div class="ml-4">
                <h3 class="text-base font-semibold text-black">{{ t('automationDashboard.pluginsTitle') }}</h3>
                <p class="text-sm text-black">{{ t('automationDashboard.pluginsDesc') }}</p>
              </div>
            </div>
            
            <div class="mt-6">
              <div class="flex items-center justify-between mb-6">
                <div class="grid grid-cols-2 gap-4">
                  <div class="text-center">
                    <div class="text-2xl font-bold text-black">{{ pluginStats.installed }}</div>
                    <div class="text-sm text-black">{{ t('automationDashboard.installed') }}</div>
                  </div>
                  <div class="text-center">
                    <div class="text-2xl font-bold text-primary-600">{{ pluginStats.active }}</div>
                    <div class="text-sm text-black">{{ t('automationDashboard.enabled') }}</div>
                  </div>
                </div>
                <div class="flex flex-col space-y-2">
                  <router-link
                    to="/plugins"
                    class="relative group inline-flex items-center justify-center w-8 h-8 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      {{ t('automationDashboard.managePlugins') }}
                    </div>
                  </router-link>
                  <router-link
                    to="/plugin-store"
                    class="relative group inline-flex items-center justify-center w-8 h-8 border border-success-200 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors z-20"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      {{ t('automationDashboard.pluginStore') }}
                    </div>
                  </router-link>
                </div>
              </div>
              
              <div class="mt-6">
                <div class="bg-gradient-to-r from-info-container-from to-info-container-to rounded-lg p-5">
                  <div class="flex items-center">
                    <svg class="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div class="ml-3">
                      <p class="text-sm font-medium text-black">{{ t('automationDashboard.pluginInfoTitle') }}</p>
                      <p class="text-sm text-primary-700 mt-1">{{ t('automationDashboard.pluginInfoDesc') }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- 创建触发器对话框 -->
    <TriggerModal
      v-if="showCreateTrigger"
      @close="showCreateTrigger = false"
      @created="handleTriggerCreated"
    />

    <!-- 创建工作流对话框 -->
    <CreateWorkflowModal
      v-if="showCreateWorkflow"
      @close="showCreateWorkflow = false"
      @created="handleWorkflowCreated"
    />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { triggerApi } from '@/api/trigger'
import { workflowApi } from '@/api/workflow'
import { pluginApi } from '@/api/plugin'
import PageHeader from '@/components/PageHeader/index.vue'
import TriggerModal from '../workflows/components/TriggerModal/index.vue'
import CreateWorkflowModal from '../workflows/components/CreateWorkflowModal/index.vue'

const router = useRouter()
const { t } = useI18n()

// 响应式数据
const loading = ref(false)
const showWelcome = ref(true)
const showCreateTrigger = ref(false)
const showCreateWorkflow = ref(false)

// 统计数据
const triggerStats = ref({ total: 0, active: 0 })
const workflowStats = ref({ total: 0, active: 0 })
const pluginStats = ref({ installed: 0, active: 0 })

// 快速开始模板
const quickStartTemplates = ref([])

// 触发器类型统计
const triggerTypes = ref([
  { type: 'email', label: t('automationDashboard.typeEmail'), count: 0, color: 'bg-primary-500' },
  { type: 'schedule', label: t('automationDashboard.typeSchedule'), count: 0, color: 'bg-primary-500' },
  { type: 'webhook', label: t('automationDashboard.typeWebhook'), count: 0, color: 'bg-purple-500' },
  { type: 'manual', label: t('automationDashboard.typeManual'), count: 0, color: 'bg-gray-500' }
])

// 生命周期
onMounted(() => {
  loadDashboardData()
})

// 方法
const loadDashboardData = async () => {
  loading.value = true
  try {
    // 首先获取工作流数据，然后并行处理其他数据
    const workflowsResponse = await workflowApi.getWorkflows()
    let workflows = []
    if (workflowsResponse.code === 0) {
      workflows = Array.isArray(workflowsResponse.data.workflows) ? workflowsResponse.data.workflows : []
      console.log('工作流数据:', workflows)
      // 设置工作流统计
      workflowStats.value = {
        total: workflows.length,
        active: workflows.filter(w => w.status === 'active').length
      }
      console.log('工作流统计:', workflowStats.value)
    }
    
    // 并行处理其他数据
    await Promise.all([
      loadTriggerStats(),
      loadPluginStats()
    ])
  } catch (error) {
    console.error('加载仪表板数据失败:', error)
  } finally {
    loading.value = false
  }
}

const loadTriggerStats = async () => {
  try {
    const response = await triggerApi.getTriggers()
    if (response.code === 0) {
      const triggers = Array.isArray(response.data.triggers) ? response.data.triggers : []
      console.log('触发器数据:', triggers)
      triggerStats.value = {
        total: triggers.length,
        active: triggers.filter(t => t.is_enabled).length
      }
      console.log('触发器统计:', triggerStats.value)
      
      // 统计触发器类型
      const typeCount = {}
      triggers.forEach(trigger => {
        const type = trigger.trigger_type || 'other'
        typeCount[type] = (typeCount[type] || 0) + 1
      })
      
      triggerTypes.value = [
        { type: 'email', label: t('automationDashboard.typeEmail'), count: typeCount.email || 0, color: 'bg-primary-500' },
        { type: 'schedule', label: t('automationDashboard.typeSchedule'), count: typeCount.schedule || 0, color: 'bg-primary-500' },
        { type: 'webhook', label: t('automationDashboard.typeWebhook'), count: typeCount.webhook || 0, color: 'bg-purple-500' },
        { type: 'manual', label: t('automationDashboard.typeManual'), count: typeCount.manual || 0, color: 'bg-gray-500' }
      ]
    }
  } catch (error) {
    console.error('加载触发器统计失败:', error)
    // 设置默认值
    triggerStats.value = { total: 0, active: 0 }
    triggerTypes.value = [
      { type: 'email', label: t('automationDashboard.typeEmail'), count: 0, color: 'bg-primary-500' },
      { type: 'schedule', label: t('automationDashboard.typeSchedule'), count: 0, color: 'bg-primary-500' },
      { type: 'webhook', label: t('automationDashboard.typeWebhook'), count: 0, color: 'bg-purple-500' },
      { type: 'manual', label: t('automationDashboard.typeManual'), count: 0, color: 'bg-gray-500' }
    ]
  }
}

const loadPluginStats = async () => {
  try {
    const response = await pluginApi.getMyPlugins()
    if (response.code === 0) {
      const plugins = Array.isArray(response.data) ? response.data : []
      pluginStats.value = {
        installed: plugins.length,
        active: plugins.filter(p => p.is_enabled && !p.is_expired).length
      }
    }
  } catch (error) {
    console.error('加载插件统计失败:', error)
    // 设置默认值
    pluginStats.value = { installed: 0, active: 0 }
  }
}

const createFromTemplate = async (template) => {
  try {
    console.log('从模板创建:', template)
    // 跳转到对应的创建流程
    router.push('/automation/workflows/create?template=' + template.id)
  } catch (error) {
    console.error('从模板创建失败:', error)
  }
}

const handleTriggerCreated = (trigger) => {
  console.log('触发器创建成功:', trigger)
  loadDashboardData()
}

const handleWorkflowCreated = (workflow) => {
  console.log('工作流创建成功:', workflow)
  loadDashboardData()
}
</script>
