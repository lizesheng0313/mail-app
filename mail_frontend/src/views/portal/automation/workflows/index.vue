<template>
  <div>
    <!-- 顶部导航 -->
    <PageHeader v-if="!isWorkspaceView" />
    
    <div class="space-y-6">
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex flex-wrap items-center gap-4">
            <BaseInput
              v-model="searchQuery"
              :placeholder="t('workflowFilters.searchPlaceholder')"
              class="w-64"
              size="sm"
              @enter="fetchWorkflows"
            >
              <template #left-icon>
                <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </template>
            </BaseInput>

            <CustomSelect
              v-model="statusFilter"
              :options="statusOptions"
              :placeholder="t('workflowFilters.allStatuses')"
            />

            <CustomSelect
              v-model="activeTab"
              :options="ownershipOptions"
              :placeholder="t('automationWorkflows.tabAll')"
            />

            <button
              @click="fetchWorkflows"
              :disabled="loading"
              class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm disabled:opacity-50"
            >
              {{ t('workflowFilters.search') }}
            </button>
          </div>

          <div class="flex items-center gap-3">
            <button
              @click="openImportDialog"
              class="px-4 py-2 border border-primary-200 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-md text-sm"
            >
              {{ t('automationWorkflows.importWorkflow') }}
            </button>

            <button
              @click="showCreateDialog = true"
              class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm"
            >
              {{ t('automationWorkflows.createWorkflow') }}
            </button>
          </div>
        </div>
      </div>

      <WorkflowTable
        :workflows="filteredWorkflows"
        :loading="loading"
        @view="viewWorkflow"
        @edit="editWorkflow"
        @export="handleExportWorkflow"
        @delete="deleteWorkflow"
        @publish="handlePublish"
        @edit-publish="handleEditPublish"
        @manage-inventory="handleManageInventory"
        @execute="handleExecuteWorkflow"
        @unpublish="handleUnpublish"
        @republish="handleRepublish"
      />
    </div>

    <input
      ref="importInputRef"
      type="file"
      accept=".json,.workflow.json,application/json"
      class="hidden"
      @change="handleImportFile"
    />

    <!-- 创建工作流对话框 -->
    <CreateWorkflowModal
      v-if="showCreateDialog"
      :workflow="selectedWorkflow"
      @close="handleCreateDialogClose"
      @created="handleWorkflowCreated"
    />

    <!-- 工作流详情对话框 -->
    <WorkflowDetailModal
      v-if="showDetailDialog"
      :workflow="selectedWorkflow"
      @close="showDetailDialog = false"
      @updated="handleWorkflowUpdated"
    />

    <!-- 执行历史对话框 -->
    <ExecutionHistoryModal
      v-if="showHistoryDialog"
      :workflow-id="selectedWorkflow.workflow_id"
      :market-status="selectedWorkflow.market_status"
      @close="showHistoryDialog = false"
    />

    <!-- 删除确认对话框 -->
    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      :title="t('automationWorkflows.deleteConfirmTitle')"
      :message="t('automationWorkflows.deleteConfirmMessage', { name: workflowToDelete?.name || '' })"
      type="danger"
      :confirm-text="t('automationWorkflows.deleteConfirmAction')"
      :loading="deleting"
      :loading-text="t('automationWorkflows.deleting')"
      @confirm="confirmDeleteWorkflow"
      @cancel="cancelDelete"
    />

    <!-- 下架确认对话框 -->
    <ConfirmDialog
      v-model:visible="showUnpublishConfirm"
      :title="t('automationWorkflows.unpublishConfirmTitle')"
      :message="t('automationWorkflows.unpublishConfirmMessage', { name: workflowToUnpublish?.name || '' })"
      type="warning"
      :confirm-text="t('automationWorkflows.unpublishConfirmAction')"
      :loading="unpublishing"
      :loading-text="t('automationWorkflows.unpublishing')"
      @confirm="confirmUnpublish"
      @cancel="showUnpublishConfirm = false"
    />

    <!-- 库存管理弹窗 -->
    <InventoryManagementModal
      v-if="showInventoryModal"
      :workflow="selectedInventoryWorkflow"
      @close="showInventoryModal = false"
      @updated="handleInventoryUpdated"
    />

    <!-- 执行确认对话框 -->
    <ConfirmDialog
      :visible="showExecuteConfirm"
      :title="t('automationWorkflows.executeConfirmTitle')"
      :message="executeConfirmMessage"
      type="warning"
      :confirm-text="t('automationWorkflows.executeConfirmAction')"
      :loading="executing"
      @confirm="confirmExecuteWorkflow"
      @cancel="showExecuteConfirm = false"
    />

    <!-- 执行结果弹窗 -->
    <ExecutionResultModal
      :visible="showExecutionResult"
      :execution-data="executionResultData"
      @close="showExecutionResult = false"
    />

    <!-- 执行中的全局loading -->
    <div v-if="executing && !showExecuteConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="bg-white rounded-lg p-6 flex flex-col items-center">
        <svg class="animate-spin h-12 w-12 text-primary-600 mb-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-lg font-medium text-gray-900">{{ t('automationWorkflows.executingTitle') }}</p>
        <p class="text-sm text-gray-500 mt-2">{{ t('automationWorkflows.executingSubtitle') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { workflowApi } from '@/api/workflow'
import { unpublishWorkflow, republishWorkflow } from '@/api/workflowMarket'
import PageHeader from '@/components/PageHeader/index.vue'
import WorkflowTable from '../../workflows/components/WorkflowTable/index.vue'
import CreateWorkflowModal from '../../workflows/components/CreateWorkflowModal/index.vue'
import WorkflowDetailModal from '../../workflows/components/WorkflowDetailModal/index.vue'
import ExecutionHistoryModal from '../../workflows/components/ExecutionHistoryModal/index.vue'
import InventoryManagementModal from '../../workflows/components/InventoryManagementModal/index.vue'
import ExecutionResultModal from '../../workflows/components/ExecutionResultModal/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import { showMessage } from '@/utils/message'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const isWorkspaceView = computed(() => route.path.startsWith('/user/'))

// 响应式数据
const loading = ref(false)
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const showHistoryDialog = ref(false)
const showDeleteConfirm = ref(false)
const showUnpublishConfirm = ref(false)
const workflowToUnpublish = ref(null)
const unpublishing = ref(false)
const showInventoryModal = ref(false)
const showExecuteConfirm = ref(false)
const showExecutionResult = ref(false)
const executingWorkflow = ref(null)
const executing = ref(false)
const importing = ref(false)
const importInputRef = ref<HTMLInputElement | null>(null)
const executionResultData = ref({
  execution_id: '',
  status: '',
  result: null
})
const selectedWorkflow = ref(null)
const selectedInventoryWorkflow = ref(null)
const workflowToDelete = ref(null)
const deleting = ref(false)

const searchQuery = ref('')
const statusFilter = ref('')
const activeTab = ref('all')

const workflows = ref([])

const statusOptions = computed(() => [
  { label: t('workflowFilters.allStatuses'), value: '' },
  { label: t('workflowList.statusActive'), value: 'active' },
  { label: t('workflowList.statusInactive'), value: 'inactive' },
  { label: t('workflowList.statusDraft'), value: 'draft' }
])

const ownershipOptions = computed(() => [
  { label: t('automationWorkflows.tabAll'), value: 'all' },
  { label: t('automationWorkflows.tabOwner'), value: 'owner' },
  { label: t('automationWorkflows.tabPurchased'), value: 'purchased' }
])

// 计算属性
const executeConfirmMessage = computed(() => {
  if (!executingWorkflow.value) return t('automationWorkflows.executeConfirmDefault')
  
  const workflow = executingWorkflow.value
  const price = workflow.milk_coin_price || 0
  
  // 按次付费需要提示扣费
  if ((workflow.pricing_model === 'pay_per_use' || workflow.pricing_model === 'per_use') && price > 0) {
    return t('automationWorkflows.executeConfirmPayPerUse', { price })
  } else if (workflow.pricing_model === 'free' || !workflow.pricing_model) {
    return t('automationWorkflows.executeConfirmFree', { name: workflow.name })
  } else if (workflow.pricing_model === 'subscription') {
    return t('automationWorkflows.executeConfirmSubscription', { name: workflow.name })
  } else if (workflow.pricing_model === 'one_time') {
    return t('automationWorkflows.executeConfirmOneTime', { name: workflow.name })
  }
  
  return t('automationWorkflows.executeConfirmFree', { name: workflow.name })
})

const filteredWorkflows = computed(() => {
  let filtered = workflows.value

  // Tab 筛选（注意：后端返回is_owner是0/1数字，需要严格判断）
  if (activeTab.value === 'owner') {
    filtered = filtered.filter(w => w.is_owner === true || w.is_owner === 1)
  } else if (activeTab.value === 'purchased') {
    filtered = filtered.filter(w => w.is_owner === false || w.is_owner === 0)
  }

  // 搜索筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(workflow => 
      workflow.name.toLowerCase().includes(query) ||
      workflow.description?.toLowerCase().includes(query)
    )
  }

  // 状态筛选
  if (statusFilter.value) {
    filtered = filtered.filter(workflow => workflow.status === statusFilter.value)
  }

  return filtered
})

// 生命周期
onMounted(() => {
  fetchWorkflows()
  
  // 检查是否有模板参数
  if (route.query.template) {
    handleTemplateCreation(route.query.template)
  }
})

// 方法
const fetchWorkflows = async () => {
  loading.value = true
  try {
    // /workflows/ 接口已经返回了所有工作流（创建的+购买的），直接使用
    const res = await workflowApi.getWorkflows()
    
    if (res.code === 0 && res.data) {
      // 后端已经返回了所有工作流（创建的+购买的），直接使用
      workflows.value = Array.isArray(res.data.workflows) ? res.data.workflows : []
    } else {
      workflows.value = []
    }
    
  } catch (error) {
    console.error('加载工作流失败:', error)
    workflows.value = []
  } finally {
    loading.value = false
  }
}

const handleTemplateCreation = (templateId) => {
  // 根据模板ID预设创建对话框的数据
  console.log('从模板创建工作流:', templateId)
  showCreateDialog.value = true
}

const viewWorkflow = async (workflow) => {
  // 调用详情接口获取完整数据（包括 steps）
  try {
    const res = await workflowApi.getWorkflow(workflow.workflow_id)
    if (res.code === 0 && res.data) {
      selectedWorkflow.value = res.data
      showDetailDialog.value = true
    } else {
      showMessage(t('automationWorkflows.loadDetailFailed'), 'error')
    }
  } catch (error) {
    console.error('获取工作流详情失败:', error)
    showMessage(t('automationWorkflows.loadDetailFailed'), 'error')
  }
}

const editWorkflow = async (workflow) => {
  try {
    const res = await workflowApi.getWorkflow(workflow.workflow_id)
    if (res.code === 0 && res.data) {
      selectedWorkflow.value = res.data
      showCreateDialog.value = true
    } else {
      showMessage(t('automationWorkflows.loadDetailFailed'), 'error')
    }
  } catch (error) {
    console.error('获取工作流详情失败:', error)
    showMessage(t('automationWorkflows.loadDetailFailed'), 'error')
  }
}

const deleteWorkflow = (workflow) => {
  workflowToDelete.value = workflow
  showDeleteConfirm.value = true
}

const confirmDeleteWorkflow = async () => {
  try {
    deleting.value = true
    const response = await workflowApi.deleteWorkflow(workflowToDelete.value.workflow_id)
    if (response.code === 0) {
      workflows.value = workflows.value.filter(w => w.id !== workflowToDelete.value.id)
      showMessage(t('automationWorkflows.deleteSuccess'), 'success')
      console.log(`工作流 ${workflowToDelete.value.name} 已删除`)
    }
  } catch (error) {
    console.error('删除工作流失败:', error)
  } finally {
    deleting.value = false
    showDeleteConfirm.value = false
    workflowToDelete.value = null
  }
}

const cancelDelete = () => {
  showDeleteConfirm.value = false
  workflowToDelete.value = null
}

const handleWorkflowCreated = (workflow) => {
  workflows.value.push(workflow)
  showCreateDialog.value = false
  selectedWorkflow.value = null // 清空选中的工作流
  fetchWorkflows() // 重新加载列表
}

const handleCreateDialogClose = () => {
  showCreateDialog.value = false
  selectedWorkflow.value = null // 清空选中的工作流
}

const handleWorkflowUpdated = (updatedWorkflow) => {
  const index = workflows.value.findIndex(w => w.id === updatedWorkflow.id)
  if (index !== -1) {
    workflows.value[index] = updatedWorkflow
  }
  showDetailDialog.value = false
  fetchWorkflows() // 重新加载列表
}

const handlePublish = (workflow) => {
  router.push({
    path: '/workflows/publish',
    state: {
      workflow_id: workflow.workflow_id,
      workflow_name: workflow.name
    }
  })
}

// 编辑已发布的工作流
const handleEditPublish = (workflow) => {
  router.push({
    path: '/workflows/publish',
    state: {
      workflow_id: workflow.workflow_id,
      workflow_name: workflow.name,
      edit_mode: true
    }
  })
}

// 下架工作流
const handleUnpublish = (workflow) => {
  workflowToUnpublish.value = workflow
  showUnpublishConfirm.value = true
}

const confirmUnpublish = async () => {
  if (!workflowToUnpublish.value) return
  unpublishing.value = true
  try {
    const res = await unpublishWorkflow(workflowToUnpublish.value.workflow_id)
    if (res.code === 0) {
      showMessage(t('automationWorkflows.unpublishSuccess'), 'success')
      showUnpublishConfirm.value = false
      fetchWorkflows()
    } else {
      showMessage(t('automationWorkflows.unpublishFailed'), 'error')
    }
  } catch (error) {
    console.error('下架失败:', error)
    showMessage(t('automationWorkflows.unpublishFailed'), 'error')
  } finally {
    unpublishing.value = false
    workflowToUnpublish.value = null
  }
}

// 重新上架工作流
const handleRepublish = async (workflow) => {
  try {
    const res = await republishWorkflow(workflow.workflow_id)
    if (res.code === 0) {
      showMessage(t('automationWorkflows.republishSuccess'), 'success')
      fetchWorkflows()
    } else {
      showMessage(t('automationWorkflows.republishFailed'), 'error')
    }
  } catch (error) {
    console.error('重新上架失败:', error)
    showMessage(t('automationWorkflows.republishFailed'), 'error')
  }
}

const handleManageInventory = (workflow) => {
  selectedInventoryWorkflow.value = workflow
  showInventoryModal.value = true
}

const handleInventoryUpdated = () => {
  // 刷新工作流列表以更新库存数量
  fetchWorkflows()
}

const openImportDialog = () => {
  if (importing.value) return
  importInputRef.value?.click()
}

const handleExportWorkflow = async (workflow) => {
  try {
    const response = await workflowApi.exportWorkflow(workflow.workflow_id)
    if (response.code !== 0) {
      showMessage(response.message || '导出工作流失败', 'error')
      return
    }

    const content = response.data?.content || {}
    const filename = response.data?.filename || `${workflow.name || 'workflow'}.workflow.json`
    const blob = new Blob([JSON.stringify(content, null, 2)], {
      type: 'application/json;charset=utf-8'
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    showMessage('工作流已导出', 'success')
  } catch (error) {
    console.error('导出工作流失败:', error)
    showMessage('导出工作流失败', 'error')
  }
}

const handleImportFile = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file) return

  importing.value = true
  try {
    const text = await file.text()
    const content = JSON.parse(text)
    const response = await workflowApi.importWorkflow(content)

    if (response.code !== 0) {
      showMessage(response.message || '导入工作流失败', 'error')
      return
    }

    await fetchWorkflows()
    showMessage('工作流已导入', 'success')
  } catch (error) {
    console.error('导入工作流失败:', error)
    showMessage('导入工作流失败，请检查 JSON 文件', 'error')
  } finally {
    importing.value = false
  }
}

// 执行购买的工作流
const handleExecuteWorkflow = (workflow) => {
  console.log('handleExecuteWorkflow 被调用:', workflow)
  executingWorkflow.value = workflow
  // 所有工作流都要弹确认框
  showExecuteConfirm.value = true
  console.log('showExecuteConfirm 设置为 true')
}

const confirmExecuteWorkflow = async () => {
  console.log('confirmExecuteWorkflow 被调用')
  // 关闭确认框，显示loading
  showExecuteConfirm.value = false
  executing.value = true
  console.log('executing 设置为 true, 开始执行工作流')
  
  try {
    const response = await workflowApi.executeWorkflow(executingWorkflow.value.workflow_id, {})
    console.log('工作流执行响应:', response)
    if (response.code === 0) {
      const status = response.data.status
      
      // 执行完成，直接显示结果弹窗
      if (status === 'completed') {
        executionResultData.value = response.data
        showExecutionResult.value = true
        showMessage(t('marketDetail.executionSuccess'), 'success')
      }
      // 执行失败
      else if (status === 'failed') {
        showMessage(t('marketDetail.executionFailed'), 'error')
      }
      // 其他状态（executing/pending）
      else {
        showMessage(t('marketDetail.executionSubmitted'), 'info')
      }
    }
  } catch (error) {
    console.error('执行失败:', error)
  } finally {
    executing.value = false
  }
}

</script>
