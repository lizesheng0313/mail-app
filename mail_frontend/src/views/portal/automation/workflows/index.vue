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
import { useI18n } from 'vue-i18n'
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
import { useWorkflowListPage } from './useWorkflowListPage'

const { t } = useI18n()
const {
  activeTab,
  cancelDelete,
  confirmDeleteWorkflow,
  confirmExecuteWorkflow,
  confirmUnpublish,
  deleteWorkflow,
  deleting,
  editWorkflow,
  executeConfirmMessage,
  executing,
  executionResultData,
  fetchWorkflows,
  filteredWorkflows,
  handleCreateDialogClose,
  handleEditPublish,
  handleExecuteWorkflow,
  handleExportWorkflow,
  handleImportFile,
  handleInventoryUpdated,
  handleManageInventory,
  handlePublish,
  handleRepublish,
  handleUnpublish,
  handleWorkflowCreated,
  handleWorkflowUpdated,
  importInputRef,
  isWorkspaceView,
  loading,
  openImportDialog,
  ownershipOptions,
  searchQuery,
  selectedInventoryWorkflow,
  selectedWorkflow,
  showCreateDialog,
  showDeleteConfirm,
  showDetailDialog,
  showExecuteConfirm,
  showExecutionResult,
  showHistoryDialog,
  showInventoryModal,
  showUnpublishConfirm,
  statusFilter,
  statusOptions,
  unpublishing,
  viewWorkflow,
  workflowToDelete,
  workflowToUnpublish
} = useWorkflowListPage()
</script>
