<template>
  <div>
    <!-- 顶部导航 -->
    <PageHeader v-if="!isWorkspaceView" />
    
    <div class="space-y-6">
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex flex-wrap items-center gap-4">
          <!-- 搜索框 -->
          <div class="w-64">
            <BaseInput
              v-model="searchQuery"
              :placeholder="t('triggerManagement.searchPlaceholder')"
              show-clear
            >
              <template #left-icon>
                <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </template>
            </BaseInput>
          </div>
          <!-- 触发器类型 -->
          <div class="w-48">
            <CustomSelect
              v-model="typeFilter"
              :options="typeOptions"
              :placeholder="t('triggerManagement.typePlaceholder')"
            />
          </div>
          <!-- 状态筛选 -->
          <div class="w-32">
            <CustomSelect
              v-model="statusFilter"
              :options="statusOptions"
              :placeholder="t('triggerManagement.statusPlaceholder')"
            />
          </div>
          <!-- 查询按钮 -->
          <div class="flex items-center">
            <button
              @click="loadTriggers"
              :disabled="loading"
              class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ t('triggerManagement.search') }}
            </button>
          </div>
          </div>

          <button
            @click="showCreateDialog = true"
            class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm"
          >
            {{ t('triggerManagement.create') }}
          </button>
        </div>
      </div>

      <!-- 触发器列表 -->
      <AdminDataTable :title="t('triggerManagement.listTitle')" :loading="loading" :column-count="5">
        <template #thead>
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  {{ t('triggerManagement.info') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  {{ t('triggerManagement.type') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  {{ t('triggerManagement.relatedWorkflow') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  {{ t('triggerManagement.status') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  {{ t('triggerManagement.actions') }}
                </th>
              </tr>
        </template>

        <template #tbody>
              <tr v-for="trigger in filteredTriggers" :key="trigger.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div :class="`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${getTriggerIconBg(trigger.trigger_type)}`">
                      <svg class="h-5 w-5" :class="getTriggerIconColor(trigger.trigger_type)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getTriggerIconPath(trigger.trigger_type)" />
                      </svg>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-black">{{ trigger.name }}</div>
                      <div class="text-sm text-black">{{ trigger.description || t('triggerManagement.noDescription') }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-black">
                    {{ getTriggerTypeLabel(trigger.trigger_type) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-black">
                  <div v-if="trigger.workflow_count > 0" class="flex items-center">
                    <span class="text-primary-600">{{ t('triggerManagement.workflowCount', { count: trigger.workflow_count }) }}</span>
                    <div v-if="trigger.workflow_info" class="ml-2 text-sm text-black">
                      ({{ trigger.workflow_info.name }})
                    </div>
                  </div>
                  <div v-else class="text-gray-400">{{ t('triggerManagement.unlinked') }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(trigger.is_enabled)}`">
                    {{ getStatusText(trigger.is_enabled) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div class="flex items-center space-x-2">
                    <ActionButton
                      icon="eye"
                      :tooltip="t('triggerManagement.viewDetails')"
                      variant="view"
                      @click="viewTrigger(trigger)"
                    />
                    <ActionButton
                      icon="log"
                      :tooltip="t('triggerManagement.executionLogs')"
                      variant="secondary"
                      @click="viewExecutionLogs(trigger)"
                    />
                    <ActionButton
                      icon="edit"
                      :tooltip="t('triggerManagement.edit')"
                      variant="edit"
                      @click="editTrigger(trigger)"
                    />
                    <ActionButton
                      :icon="trigger.is_enabled ? 'disable' : 'enable'"
                      :tooltip="trigger.is_enabled ? t('triggerManagement.disable') : t('triggerManagement.enable')"
                      :variant="trigger.is_enabled ? 'disable' : 'enable'"
                      @click="toggleTrigger(trigger)"
                    />
                    <ActionButton
                      icon="delete"
                      :tooltip="t('triggerManagement.delete')"
                      variant="delete"
                      @click="showDeleteConfirmDialog(trigger)"
                    />
                  </div>
                </td>
              </tr>

              <tr v-if="!filteredTriggers.length">
                <td colspan="5" class="px-6 py-12 text-center text-black">
                  {{ t('triggerManagement.emptyDesc') }}
                </td>
              </tr>
        </template>
      </AdminDataTable>
    </div>

    <!-- 创建触发器对话框 -->
    <TriggerModal
      v-if="showCreateDialog"
      :trigger="selectedTrigger"
      @close="closeCreateDialog"
      @created="handleTriggerCreated"
      @updated="handleTriggerUpdated"
    />

    <!-- 触发器详情对话框 -->
    <TriggerDetailModal
      v-if="showDetailDialog"
      :trigger="selectedTrigger"
      @close="showDetailDialog = false"
      @updated="handleTriggerUpdated"
    />

    <!-- 删除确认对话框 -->
    <div v-if="showDeleteDialog" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3 text-center">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.848L13.732 4.224c-.77-1.18-2.694-1.18-3.464 0L3.34 16.152c-.77 1.18.192 2.848 1.732 2.848z" />
            </svg>
          </div>
          <h3 class="text-lg leading-6 font-medium text-black mt-2">{{ t('triggerManagement.deleteTitle') }}</h3>
          <div class="mt-2 px-7 py-3">
            <p class="text-sm text-black">
              {{ t('triggerManagement.deleteMessage', { name: triggerToDelete?.name || '' }) }}
            </p>
          </div>
          <div class="flex items-center px-4 py-3 space-x-3">
            <button
              @click="showDeleteDialog = false"
              class="px-4 py-2 bg-white text-black border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              {{ t('triggerManagement.cancel') }}
            </button>
            <button
              @click="confirmDelete"
              class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              {{ t('triggerManagement.delete') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 执行日志模态框 -->
  <div v-if="showLogsModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-md shadow-lg w-full max-w-7xl max-h-[90vh] flex flex-col">
      <div class="flex justify-between items-center p-5 border-b">
        <h3 class="text-lg font-medium text-black">{{ t('triggerLogs.title', { name: selectedTrigger?.name || '' }) }}</h3>
        <button @click="showLogsModal = false" class="text-gray-400 hover:text-black">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div class="flex-1 overflow-y-auto p-5">
        <div v-if="loadingLogs" class="p-8 text-center">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto"></div>
          <p class="mt-2 text-black">{{ t('triggerManagement.logsLoading') }}</p>
        </div>
        
        <div v-else-if="executionLogs.length === 0" class="p-8 text-center">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-black">{{ t('triggerManagement.logsEmptyTitle') }}</h3>
          <p class="mt-1 text-sm text-black">{{ t('triggerManagement.logsEmptyDesc') }}</p>
        </div>
        
        <div v-else>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">{{ t('triggerManagement.logsTriggerInfo') }}</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">{{ t('triggerManagement.logsEmailInfo') }}</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">{{ t('triggerManagement.logsResult') }}</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">{{ t('triggerManagement.logsMatchedCondition') }}</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">{{ t('triggerManagement.logsDuration') }}</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">{{ t('triggerManagement.logsTime') }}</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="log in executionLogs" :key="log.id" class="hover:bg-gray-50">
                  <td class="px-6 py-4">
                    <div class="text-sm font-medium text-black">{{ log.trigger_name }}</div>
                    <div class="text-sm text-black">ID: {{ log.trigger_id || t('triggerManagement.logsSystem') }}</div>
                    <div class="text-sm text-black">{{ t('triggerManagement.logsType') }}: {{ getTriggerTypeText(log.trigger_type) }}</div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="text-sm text-black max-w-xs truncate">{{ log.email_subject || t('triggerManagement.logsNoSubject') }}</div>
                    <div class="text-sm text-black max-w-xs truncate">{{ t('triggerManagement.logsSender') }}: {{ log.email_sender || t('triggerManagement.logsNone') }}</div>
                    <div class="text-sm text-black max-w-xs truncate">{{ t('triggerManagement.logsRecipient') }}: {{ log.email_recipient || t('triggerManagement.logsNone') }}</div>
                  </td>
                  <td class="px-6 py-4">
                    <span :class="getResultColor(log.execution_result)" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                      {{ getResultText(log.execution_result) }}
                    </span>
                    <div v-if="log.error_message" class="text-xs text-red-600 mt-1 max-w-xs truncate" :title="log.error_message">
                      {{ log.error_message }}
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="text-sm text-black max-w-xs" :title="log.matched_condition">
                      {{ log.matched_condition || t('triggerManagement.logsNone') }}
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-black">
                    {{ formatDuration(log.execution_time_ms) }}
                  </td>
                  <td class="px-6 py-4 text-sm text-black">
                    {{ formatTime(log.created_at) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- 删除确认对话框 -->
  <ConfirmDialog
    :visible="showDeleteConfirm"
    :title="t('triggerManagement.deleteConfirmTitle')"
    :message="deleteConfirmMessage"
    type="danger"
    :confirm-text="t('triggerManagement.delete')"
    :loading="deleting"
    :show-warning="true"
    @confirm="confirmDelete"
    @cancel="showDeleteConfirm = false"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/PageHeader/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import { triggerApi } from '@/api/trigger'
import { showMessage } from '@/utils/message'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import TriggerModal from '../../workflows/components/TriggerModal/index.vue'
import TriggerDetailModal from '../../workflows/components/TriggerDetailModal/index.vue'
import { getCurrentLocale } from '@/i18n'

const { t } = useI18n()
const route = useRoute()
const isWorkspaceView = computed(() => route.path.startsWith('/user/'))

// 响应式数据
const loading = ref(false)
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const showDeleteDialog = ref(false)
const showLogsModal = ref(false)
const loadingLogs = ref(false)
const executionLogs = ref([])
const selectedTrigger = ref(null)
const triggerToDelete = ref(null)

const searchQuery = ref('')
const typeFilter = ref('')
const statusFilter = ref('')

const triggers = ref([])

// 删除确认对话框
const showDeleteConfirm = ref(false)
const deletingTrigger = ref(null)
const deleting = ref(false)

// 筛选选项
const typeOptions = computed(() => [
  { label: t('triggerManagement.typeAll'), value: '' },
  { label: t('triggerManagement.typeEmail'), value: 'email' },
  { label: t('triggerManagement.typeSchedule'), value: 'schedule' },
  { label: t('triggerManagement.typeWebhook'), value: 'webhook' },
  { label: t('triggerManagement.typeManual'), value: 'manual' }
])

const statusOptions = computed(() => [
  { label: t('triggerManagement.statusAll'), value: '' },
  { label: t('triggerManagement.statusActive'), value: true },
  { label: t('triggerManagement.statusPaused'), value: false }
])

// 计算属性
const filteredTriggers = computed(() => {
  let filtered = triggers.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(trigger => 
      trigger.name.toLowerCase().includes(query) ||
      (trigger.description && trigger.description.toLowerCase().includes(query))
    )
  }

  if (typeFilter.value) {
    filtered = filtered.filter(trigger => trigger.trigger_type === typeFilter.value)
  }

  if (statusFilter.value !== '') {
    filtered = filtered.filter(trigger => trigger.is_enabled === statusFilter.value)
  }

  return filtered
})

const deleteConfirmMessage = computed(() => {
  return t('triggerManagement.deleteMessage', { name: deletingTrigger.value?.name || '' })
})

// 生命周期
onMounted(() => {
  loadTriggers()
})

// 方法
const loadTriggers = async () => {
  loading.value = true
  try {
    const response = await triggerApi.getTriggers()
    if (response.code === 0) {
      // 正确提取 triggers 数组
      triggers.value = Array.isArray(response.data.triggers) ? response.data.triggers : []
      console.log('加载的触发器数据:', triggers.value)
    } else {
      console.error('获取触发器列表失败:', response.message)
      triggers.value = []
    }
  } catch (error) {
    console.error('加载触发器失败:', error)
    triggers.value = []
  } finally {
    loading.value = false
  }
}

const getTriggerIconBg = (type: string) => {
  const bgMap = {
    email: 'bg-red-100',
    schedule: 'bg-primary-100',
    webhook: 'bg-primary-100',
    manual: 'bg-purple-100',
    default: 'bg-gray-100'
  }
  return bgMap[type] || bgMap.default
}

const getTriggerIconColor = (type: string) => {
  const colorMap = {
    email: 'text-red-600',
    schedule: 'text-primary-600',
    webhook: 'text-primary-600',
    manual: 'text-purple-600',
    default: 'text-black'
  }
  return colorMap[type] || colorMap.default
}

const getTriggerIconPath = (type: string) => {
  const pathMap = {
    email: 'M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    schedule: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    webhook: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
    manual: 'M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11',
    default: 'M13 10V3L4 14h7v7l9-11h-7z'
  }
  return pathMap[type] || pathMap.default
}

const getTriggerTypeLabel = (type: string) => {
  const labelMap = {
    email: t('triggerManagement.typeEmail'),
    schedule: t('triggerManagement.typeSchedule'),
    webhook: 'Webhook',
    manual: t('triggerManagement.typeManual'),
    default: t('triggerManagement.unknownType')
  }
  return labelMap[type] || labelMap.default
}

const getStatusBadge = (is_enabled: boolean) => {
  return is_enabled 
    ? 'bg-primary-100 text-success-800' 
    : 'bg-gray-100 text-black'
}

const getStatusText = (is_enabled: boolean) => {
  return is_enabled ? t('triggerManagement.statusActive') : t('triggerManagement.statusPaused')
}

const viewTrigger = (trigger: any) => {
  selectedTrigger.value = trigger
  showDetailDialog.value = true
}

const editTrigger = (trigger: any) => {
  selectedTrigger.value = trigger
  showCreateDialog.value = true
}

// 查看执行日志
const viewExecutionLogs = async (trigger: any) => {
  selectedTrigger.value = trigger
  showLogsModal.value = true
  loadingLogs.value = true
  
  try {
    // 使用trigger-logs.vue的接口
    const params = new URLSearchParams()
    params.append('limit', '50')
    params.append('offset', '0')
    
    if (trigger.id) {
      params.append('trigger_id', trigger.id.toString())
    }
    
    const response = await fetch(`/mail-api/v1/triggers/logs/all?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.code === 0 && data.data) {
        executionLogs.value = data.data.logs || []
      } else {
        executionLogs.value = []
        console.warn('获取日志失败:', data.message)
      }
    } else {
      executionLogs.value = []
      showMessage(t('triggerManagement.loadLogsFailed'), 'error')
    }
  } catch (error) {
    console.error('加载执行日志失败:', error)
    executionLogs.value = []
    showMessage(t('triggerManagement.loadLogsFailed'), 'error')
  } finally {
    loadingLogs.value = false
  }
}

const toggleTrigger = async (trigger: any) => {
  try {
    const newStatus = !trigger.is_enabled
    const response = await triggerApi.updateTrigger(trigger.id, { is_enabled: newStatus })
    if (response.code === 0) {
      trigger.is_enabled = newStatus
      console.log(`触发器 ${trigger.name} 状态已更新为 ${newStatus ? '启用' : '禁用'}`)
    } else {
      console.error('更新触发器状态失败:', response.message)
    }
  } catch (error) {
    console.error('更新触发器状态失败:', error)
  }
}

const showDeleteConfirmDialog = (trigger: any) => {
  deletingTrigger.value = trigger
  showDeleteConfirm.value = true
}

const confirmDelete = async () => {
  if (!deletingTrigger.value) return
  
  deleting.value = true
  try {
    const response = await triggerApi.deleteTrigger(deletingTrigger.value.id)
    if (response.code === 0) {
      triggers.value = triggers.value.filter(t => t.id !== deletingTrigger.value!.id)
      showMessage(t('triggerManagement.deletedSuccess'), 'success')
    } else {
      showMessage(t('triggerManagement.deletedFailed'), 'error')
    }
  } catch (error) {
    showMessage(t('triggerManagement.deletedFailed'), 'error')
  } finally {
    deleting.value = false
    showDeleteConfirm.value = false
    deletingTrigger.value = null
  }
}

const closeCreateDialog = () => {
  showCreateDialog.value = false
  selectedTrigger.value = null  // 清除选中的触发器
}

// 日志相关辅助函数
const getResultText = (result: string) => {
  const resultMap = {
    'waiting': t('triggerManagement.resultWaiting'),
    'success': t('triggerManagement.resultSuccess'),
    'failed': t('triggerManagement.resultFailed'),
    'no_match': t('triggerManagement.resultNoMatch'),
    'no_triggers': t('triggerManagement.resultNoTriggers')
  }
  return resultMap[result] || result
}

const getResultColor = (result: string) => {
  const colorMap = {
    'waiting': 'bg-yellow-100 text-yellow-800',
    'success': 'bg-primary-100 text-success-800',
    'failed': 'bg-red-100 text-red-800',
    'no_match': 'bg-yellow-100 text-yellow-800',
    'no_triggers': 'bg-gray-100 text-black'
  }
  return colorMap[result] || 'bg-gray-100 text-black'
}

const formatDuration = (duration: number) => {
  if (!duration || duration === 0) return '0ms'
  if (duration < 1000) return `${duration}ms`
  if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`
  return `${(duration / 60000).toFixed(1)}min`
}

const getTriggerTypeText = (type: string) => {
  const typeMap = {
    'email': t('triggerManagement.typeEmail'),
    'schedule': t('triggerManagement.typeSchedule'),
    'webhook': t('triggerManagement.typeWebhook'),
    'manual': t('triggerManagement.typeManual')
  }
  return typeMap[type] || type
}

const formatTime = (timestamp: number) => {
  if (!timestamp) return ''
  // timestamp是毫秒级时间戳
  const date = new Date(timestamp)
  return date.toLocaleString(getCurrentLocale())
}

const handleTriggerCreated = (trigger: any) => {
  loadTriggers()  // 重新加载触发器列表
  showCreateDialog.value = false  // 确保关闭对话框
  selectedTrigger.value = null  // 清除选中的触发器
}

const handleTriggerUpdated = (updatedTrigger: any) => {
  loadTriggers()  // 重新加载触发器列表  
  showCreateDialog.value = false  // 确保关闭对话框
  selectedTrigger.value = null  // 清除选中的触发器
}
</script>
