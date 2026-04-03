<template>
  <div>
    <!-- 顶部导航 -->
    <PageHeader v-if="!isWorkspaceView" />
    
    <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- 面包屑导航 -->
      <nav class="flex mb-6" aria-label="Breadcrumb">
        <ol class="inline-flex items-center space-x-1 md:space-x-3">
          <li class="inline-flex items-center">
            <router-link :to="automationHomePath" class="inline-flex items-center text-sm font-medium text-black hover:text-primary-600">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {{ t('executionHistory.automationCenter') }}
            </router-link>
          </li>
          <li>
            <div class="flex items-center">
              <svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
              </svg>
              <span class="ml-1 text-sm font-medium text-black md:ml-2">{{ t('automationWorkflows.breadcrumbCurrent') }}</span>
            </div>
          </li>
        </ol>
      </nav>

      <!-- 页面头部 -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-black">{{ t('automationWorkflows.title') }}</h1>
            <p class="mt-2 text-black">{{ t('automationWorkflows.subtitle') }}</p>
          </div>
          <div class="flex space-x-3">
            <button
              @click="showCreateDialog = true"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              {{ t('automationWorkflows.createWorkflow') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Tab 切换 -->
      <div class="bg-white rounded-lg shadow-sm p-1 inline-flex mb-4">
        <button
          @click="activeTab = 'all'"
          :class="[
            'px-5 py-2 rounded-md font-medium text-sm transition-all',
            activeTab === 'all'
              ? 'bg-primary-600 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          ]"
        >
          {{ t('automationWorkflows.tabAll') }}
        </button>
        <button
          @click="activeTab = 'owner'"
          :class="[
            'px-5 py-2 rounded-md font-medium text-sm transition-all',
            activeTab === 'owner'
              ? 'bg-primary-600 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          ]"
        >
          {{ t('automationWorkflows.tabOwner') }}
        </button>
        <button
          @click="activeTab = 'purchased'"
          :class="[
            'px-5 py-2 rounded-md font-medium text-sm transition-all',
            activeTab === 'purchased'
              ? 'bg-primary-600 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          ]"
        >
          {{ t('automationWorkflows.tabPurchased') }}
        </button>
      </div>

      <!-- 筛选栏 -->
      <WorkflowFilters
        v-model:search-query="searchQuery"
        v-model:status-filter="statusFilter"
        :loading="loading"
        @refresh="fetchWorkflows"
      />

      <!-- 工作流列表 -->
      <WorkflowTable
        :workflows="filteredWorkflows"
        :loading="loading"
        @view="viewWorkflow"
        @edit="editWorkflow"
        @delete="deleteWorkflow"
        @publish="handlePublish"
        @edit-publish="handleEditPublish"
        @manage-inventory="handleManageInventory"
        @execute="handleExecuteWorkflow"
        @unpublish="handleUnpublish"
        @republish="handleRepublish"
      />
    </div>

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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { workflowApi } from '@/api/workflow'
import { unpublishWorkflow, republishWorkflow } from '@/api/workflowMarket'
import PageHeader from '@/components/PageHeader/index.vue'
import WorkflowFilters from '../../workflows/components/WorkflowFilters/index.vue'
import WorkflowTable from '../../workflows/components/WorkflowTable/index.vue'
import CreateWorkflowModal from '../../workflows/components/CreateWorkflowModal/index.vue'
import WorkflowDetailModal from '../../workflows/components/WorkflowDetailModal/index.vue'
import ExecutionHistoryModal from '../../workflows/components/ExecutionHistoryModal/index.vue'
import InventoryManagementModal from '../../workflows/components/InventoryManagementModal/index.vue'
import ExecutionResultModal from '../../workflows/components/ExecutionResultModal/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import { showMessage } from '@/utils/message'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const isWorkspaceView = computed(() => route.path.startsWith('/user/'))
const automationHomePath = computed(() => (isWorkspaceView.value ? '/user/automation' : '/automation'))

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
