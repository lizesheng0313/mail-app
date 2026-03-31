<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-0 border max-w-6xl shadow-lg rounded-lg bg-white mb-10">
      <!-- 头部 -->
      <div class="flex items-center justify-between p-6 border-b">
        <h3 class="text-xl font-semibold text-black">
          {{ t('triggerLogs.title', { name: trigger?.name || '' }) }}
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
        <AdminDataTable
          :columns="columns"
          :data="logs"
          :loading="loading"
          :empty-text="t('triggerLogs.empty')"
        >
          <template #execution_result="{ row }">
            <span class="px-2 py-1 text-xs font-medium rounded" :class="getResultBadgeColor(row.execution_result)">
              {{ getResultText(row.execution_result) }}
            </span>
          </template>

          <template #email_subject="{ row }">
            <div class="max-w-md">
              <div class="text-sm text-black truncate">{{ row.email_subject }}</div>
              <div v-if="row.email_sender" class="text-xs text-black truncate">{{ row.email_sender }}</div>
            </div>
          </template>

          <template #triggered_workflows="{ row }">
            <div v-if="row.triggered_workflows && row.triggered_workflows.length > 0" class="flex flex-wrap gap-1">
              <span
                v-for="workflow in row.triggered_workflows"
                :key="workflow.workflow_id"
                class="px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded"
              >
                {{ workflow.workflow_name }}
              </span>
            </div>
            <span v-else class="text-gray-400 text-sm">-</span>
          </template>

          <template #error_message="{ row }">
            <div v-if="row.error_message" class="max-w-md text-sm text-red-600 truncate" :title="row.error_message">
              {{ row.error_message }}
            </div>
            <span v-else class="text-gray-400">-</span>
          </template>

          <template #created_at="{ row }">
            <span class="text-sm text-black">{{ formatTime(row.created_at) }}</span>
          </template>
        </AdminDataTable>
      </div>

      <!-- 底部 -->
      <div class="flex justify-end p-6 border-t">
        <button
          @click="$emit('close')"
          class="px-4 py-2 text-sm font-medium text-black bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          {{ t('triggerLogs.close') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { triggerApi } from '@/api/trigger'
import { formatTimestamp } from '@/utils/timeUtils'
import AdminDataTable from '@/components/AdminDataTable/index.vue'

const { t } = useI18n()

const props = defineProps({
  trigger: {
    type: Object,
    required: true
  }
})

defineEmits(['close'])

const loading = ref(true)
const logs = ref([])

// 表格列配置
const columns = [
  { key: 'execution_result', label: t('triggerLogs.result'), width: '120px' },
  { key: 'email_subject', label: t('triggerLogs.emailInfo'), width: '300px' },
  { key: 'triggered_workflows', label: t('triggerLogs.triggeredWorkflows'), width: '200px' },
  { key: 'error_message', label: t('triggerLogs.errorInfo'), width: '250px' },
  { key: 'created_at', label: t('triggerLogs.executionTime'), width: '180px' }
]

// 获取日志
const fetchLogs = async () => {
  loading.value = true
  try {
    const data = await triggerApi.getTriggerLogs({
      limit: 50,
      offset: 0,
      trigger_id: props.trigger.id
    })
    
    if (data.code === 0) {
      logs.value = data.data?.logs || []
    } else {
      logs.value = []
    }
  } catch (error) {
    logs.value = []
  } finally {
    loading.value = false
  }
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  return formatTimestamp(timestamp, 'datetime')
}

// 获取执行结果文本
const getResultText = (result) => {
  const resultMap = {
    'success': t('triggerLogs.resultSuccess'),
    'failed': t('triggerLogs.resultFailed'),
    'no_match': t('triggerLogs.resultNoMatch'),
    'no_triggers': t('triggerLogs.resultNoTriggers')
  }
  return resultMap[result] || result
}

// 获取执行结果徽章颜色
const getResultBadgeColor = (result) => {
  const colorMap = {
    'success': 'bg-primary-100 text-success-800',
    'failed': 'bg-red-100 text-red-800',
    'no_match': 'bg-gray-100 text-black',
    'no_triggers': 'bg-gray-100 text-black'
  }
  return colorMap[result] || 'bg-gray-100 text-black'
}

onMounted(() => {
  fetchLogs()
})
</script>
