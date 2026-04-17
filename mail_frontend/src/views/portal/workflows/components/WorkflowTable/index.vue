<template>
  <AdminDataTable :title="t('workflowList.title')" :loading="loading" :column-count="5">
    <template #thead>
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
              {{ t('workflowList.info') }}
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
              {{ t('workflowList.status') }}
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
              {{ t('workflowList.triggers') }}
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
              {{ t('workflowList.steps') }}
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
              {{ t('workflowList.actions') }}
            </th>
          </tr>
    </template>

    <template #tbody>
          <tr
            v-for="workflow in workflows"
            :key="workflow.workflow_id"
            :class="[
              'hover:bg-gray-50',
              highlightWorkflowId === workflow.workflow_id ? 'bg-yellow-50 border-yellow-200' : '',
              isPurchasedUnavailable(workflow) ? 'opacity-60 bg-gray-50' : ''
            ]"
          >
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center">
                <div class="h-10 w-10 rounded-lg bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
                  <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div class="ml-4">
                  <div class="flex items-center gap-2">
                    <div class="text-sm font-medium text-black">{{ workflow.name }}</div>
                    <span v-if="workflow.is_owner === 1 || workflow.is_owner === true" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {{ t('workflowList.mine') }}
                    </span>
                    <span v-else-if="workflow.is_owner === 0 || workflow.is_owner === false" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      {{ t('workflowList.purchased') }}
                    </span>
                    <span
                      v-if="isPurchasedUnavailable(workflow)"
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600"
                    >
                      {{ getPurchasedUnavailableLabel(workflow) }}
                    </span>
                  </div>
                  <div class="text-sm text-black" v-if="workflow.description && workflow.description !== workflow.name">{{ workflow.description }}</div>
                  <div class="text-xs text-gray-400 mt-1">ID: {{ workflow.workflow_id }}</div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <!-- 优先显示市场状态，没有市场状态则显示运行状态 -->
              <template v-if="workflow.market_status && workflow.market_status !== 'draft'">
                <span 
                  :class="getMarketStatusClass(workflow.market_status)" 
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                >
                  <!-- 审核中图标 -->
                  <svg v-if="workflow.market_status === 'reviewing'" class="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <!-- 已发布图标 -->
                  <svg v-else-if="workflow.market_status === 'approved' || workflow.market_status === 'published'" class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <!-- 已驳回图标 -->
                  <svg v-else-if="workflow.market_status === 'rejected'" class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {{ getMarketStatusLabel(workflow.market_status) }}
                </span>
                <!-- 驳回原因 -->
                <div v-if="workflow.market_status === 'rejected' && workflow.review_reason" class="mt-1 text-xs text-red-600">
                  {{ t('workflowList.reviewReason', { reason: workflow.review_reason }) }}
                </div>
              </template>
              <!-- 运行状态（没有市场状态或市场状态为draft时显示） -->
              <span v-else :class="getStatusClass(workflow.status)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                {{ getStatusLabel(workflow.status) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-black">
                {{ t('workflowList.triggerCount', { count: workflow.trigger_count || 0 }) }}
              </div>
              <div v-if="workflow.trigger_types && workflow.trigger_types.length > 0" class="flex flex-wrap gap-1 mt-1">
                <span
                  v-for="type in workflow.trigger_types"
                  :key="type"
                  :class="getTriggerTypeClass(type)"
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                >
                  {{ getTriggerTypeLabel(type) }}
                </span>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-black">
              {{ t('workflowList.stepCount', { count: workflow.steps?.length || 0 }) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <!-- 我购买的工作流 - 简化按钮 -->
              <div v-if="!workflow.is_owner" class="flex items-center space-x-2">
                <!-- 执行按钮 -->
                <ActionButton
                  v-if="canExecutePurchasedWorkflow(workflow)"
                  icon="play"
                  :tooltip="t('workflowList.execute')"
                  variant="primary"
                  @click="$emit('execute', workflow)"
                />
                <!-- 执行记录 -->
                <ActionButton
                  icon="clock"
                  :tooltip="isPurchasedUnavailable(workflow) ? getPurchasedUnavailableTooltip(workflow) : t('workflowList.executionHistory')"
                  variant="default"
                  @click="viewWorkflowHistory(workflow)"
                />
              </div>
              
              <!-- 我创建的工作流 - 完整按钮 -->
              <div v-else class="flex items-center space-x-2">
                <!-- 查看详情 -->
                <ActionButton
                  icon="eye"
                  :tooltip="t('workflowList.viewDetails')"
                  variant="view"
                  @click="$emit('view', workflow)"
                />
                <!-- 编辑工作流 -->
                <ActionButton
                  icon="edit"
                  :tooltip="t('workflowList.edit')"
                  variant="edit"
                  @click="$emit('edit', workflow)"
                />
                <!-- 执行记录 -->
                <ActionButton
                  icon="clock"
                  :tooltip="t('workflowList.viewHistory')"
                  variant="default"
                  @click="viewWorkflowHistory(workflow)"
                />
                <!-- 导出工作流 -->
                <ActionButton
                  v-if="!workflow.inventory_enabled"
                  icon="download"
                  :tooltip="t('workflowList.export')"
                  variant="primary"
                  @click="$emit('export', workflow)"
                />
                <!-- 发布到市场 -->
                <ActionButton
                  v-if="!workflow.market_status || workflow.market_status === 'draft' || workflow.market_status === 'rejected'"
                  icon="cloud"
                  :tooltip="t('workflowList.publish')"
                  variant="primary"
                  @click="$emit('publish', workflow)"
                />
                <!-- 重新上架（已下架的） -->
                <ActionButton
                  v-if="workflow.market_status === 'offline'"
                  icon="upload"
                  :tooltip="t('workflowList.republish')"
                  variant="success"
                  @click="$emit('republish', workflow)"
                />
                <!-- 编辑市场信息 -->
                <ActionButton
                  v-if="workflow.market_status === 'published' || workflow.market_status === 'approved' || workflow.market_status === 'offline'"
                  icon="settings"
                  :tooltip="t('workflowList.editMarketInfo')"
                  variant="warning"
                  @click="$emit('edit-publish', workflow)"
                />
                <!-- 下架 -->
                <ActionButton
                  v-if="workflow.market_status === 'published' || workflow.market_status === 'approved'"
                  icon="download"
                  :tooltip="t('workflowList.unpublish')"
                  variant="delete"
                  @click="$emit('unpublish', workflow)"
                />
                <!-- 库存管理（只要开启了库存就显示，不需要等审核通过） -->
                <ActionButton
                  v-if="workflow.inventory_enabled"
                  icon="database"
                  :tooltip="getInventoryTooltip(workflow)"
                  :variant="workflow.inventory_count > 0 ? 'success' : 'default'"
                  @click="$emit('manage-inventory', workflow)"
                />
                <!-- 删除 -->
                <ActionButton
                  icon="delete"
                  :tooltip="t('workflowList.delete')"
                  variant="delete"
                  @click="$emit('delete', workflow)"
                />
              </div>
            </td>
          </tr>

          <tr v-if="!workflows.length">
            <td colspan="5" class="px-6 py-12 text-center text-black">
              {{ t('workflowList.emptyDesc') }}
            </td>
          </tr>
    </template>
  </AdminDataTable>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import ActionButton from '@/components/ActionButton/index.vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const props = defineProps({
  workflows: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  highlightWorkflowId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['view', 'edit', 'delete', 'publish', 'unpublish', 'republish', 'manage-inventory', 'execute', 'edit-publish', 'export'])

const isPurchasedWorkflow = (workflow) => {
  const isPurchased = workflow.is_owner === 0 || workflow.is_owner === false
  return isPurchased
}

const isPurchasedUnavailable = (workflow) => {
  if (!isPurchasedWorkflow(workflow)) return false
  if (workflow.workflow_deleted) return true
  return workflow.market_status === 'offline' || workflow.market_status === 'unlisted'
}

const canExecutePurchasedWorkflow = (workflow) => {
  return isPurchasedWorkflow(workflow) && !isPurchasedUnavailable(workflow)
}

const getPurchasedUnavailableLabel = (workflow) => {
  if (workflow.workflow_deleted) {
    return t('workflowList.deleted')
  }
  return t('workflowList.offline')
}

const getPurchasedUnavailableTooltip = (workflow) => {
  if (workflow.workflow_deleted) {
    return t('workflowList.purchasedDeletedTooltip')
  }
  return t('workflowList.purchasedOfflineTooltip')
}

// 方法
const viewWorkflowHistory = (workflow) => {
  const basePath = route.path.startsWith('/user/')
    ? '/user/automation/execution-history'
    : '/workflows/execution-history'
  router.push(`${basePath}?workflow_id=${workflow.workflow_id}`)
}
const getStatusClass = (status) => {
  const statusMap = {
    active: 'bg-primary-100 text-success-800',
    inactive: 'bg-gray-100 text-black',
    draft: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800'
  }
  return statusMap[status] || 'bg-gray-100 text-black'
}

const getStatusLabel = (status) => {
  const statusMap = {
    active: t('workflowList.statusActive'),
    inactive: t('workflowList.statusInactive'),
    draft: t('workflowList.statusDraft'),
    error: t('workflowList.statusError')
  }
  return statusMap[status] || status
}

// 市场状态样式
const getMarketStatusClass = (status) => {
  const classes = {
    'draft': 'bg-gray-200 text-gray-700 border-gray-300',
    'reviewing': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'approved': 'bg-green-100 text-green-800 border-green-300',
    'published': 'bg-green-100 text-green-800 border-green-300',
    'rejected': 'bg-red-100 text-red-800 border-red-300',
    'offline': 'bg-gray-200 text-gray-700 border-gray-300'
  }
  return classes[status] || 'bg-gray-100 text-gray-600 border-gray-200'
}

// 市场状态标签
const getMarketStatusLabel = (status) => {
  const labels = {
    'draft': t('workflowList.marketDraft'),
    'reviewing': t('workflowList.marketReviewing'),
    'approved': t('workflowList.marketPublished'),
    'published': t('workflowList.marketPublished'),
    'rejected': t('workflowList.marketRejected'),
    'offline': t('workflowList.marketOffline')
  }
  return labels[status] || status
}

const getInventoryTooltip = (workflow) => {
  if (!workflow.inventory_count || workflow.inventory_count <= 0) {
    return t('workflowList.addInventory')
  }
  return t('workflowList.remainingInventory', { count: workflow.inventory_count })
}

const getTriggerTypeLabel = (type) => {
  const typeMap = {
    email: t('workflowList.triggerEmail'),
    schedule: t('workflowList.triggerSchedule'),
    webhook: t('workflowList.triggerWebhook'),
    manual: t('workflowList.triggerManual')
  }
  return typeMap[type] || type
}

const getTriggerTypeClass = (type) => {
  const classMap = {
    email: 'bg-primary-100 text-primary-700',
    schedule: 'bg-primary-100 text-primary-700',
    webhook: 'bg-purple-100 text-purple-700',
    manual: 'bg-gray-100 text-black'
  }
  return classMap[type] || 'bg-gray-100 text-black'
}
</script>
