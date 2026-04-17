import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { workflowApi } from '@/api/workflow'
import { getMyPurchases, republishWorkflow, requestWorkflowRefund, unpublishWorkflow } from '@/api/workflowMarket'
import { showMessage } from '@/utils/message'

type WorkflowItem = Record<string, any>

export function useWorkflowListPage() {
  const route = useRoute()
  const router = useRouter()
  const { t } = useI18n()

  const isWorkspaceView = computed(() => route.path.startsWith('/user/'))

  const loading = ref(false)
  const showCreateDialog = ref(false)
  const showDetailDialog = ref(false)
  const showHistoryDialog = ref(false)
  const showDeleteConfirm = ref(false)
  const showUnpublishConfirm = ref(false)
  const showInventoryModal = ref(false)
  const showExecuteConfirm = ref(false)
  const showRefundConfirm = ref(false)
  const showExecutionResult = ref(false)

  const unpublishing = ref(false)
  const executing = ref(false)
  const refunding = ref(false)
  const importing = ref(false)
  const deleting = ref(false)

  const workflowToUnpublish = ref<WorkflowItem | null>(null)
  const executingWorkflow = ref<WorkflowItem | null>(null)
  const refundWorkflow = ref<WorkflowItem | null>(null)
  const selectedWorkflow = ref<WorkflowItem | null>(null)
  const selectedInventoryWorkflow = ref<WorkflowItem | null>(null)
  const workflowToDelete = ref<WorkflowItem | null>(null)

  const importInputRef = ref<HTMLInputElement | null>(null)
  const executionResultData = ref<Record<string, any>>({
    execution_id: '',
    status: '',
    result: null
  })

  const searchQuery = ref('')
  const statusFilter = ref('')
  const activeTab = ref('all')
  const workflows = ref<WorkflowItem[]>([])

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

  const executeConfirmMessage = computed(() => {
    if (!executingWorkflow.value) return t('automationWorkflows.executeConfirmDefault')

    const workflow = executingWorkflow.value
    const price = workflow.milk_coin_price || 0

    if ((workflow.pricing_model === 'pay_per_use' || workflow.pricing_model === 'per_use') && price > 0) {
      return t('automationWorkflows.executeConfirmPayPerUse', { price })
    }
    if (workflow.pricing_model === 'free' || !workflow.pricing_model) {
      return t('automationWorkflows.executeConfirmFree', { name: workflow.name })
    }
    if (workflow.pricing_model === 'subscription') {
      return t('automationWorkflows.executeConfirmSubscription', { name: workflow.name })
    }
    if (workflow.pricing_model === 'one_time') {
      return t('automationWorkflows.executeConfirmOneTime', { name: workflow.name })
    }

    return t('automationWorkflows.executeConfirmFree', { name: workflow.name })
  })

  const filteredWorkflows = computed(() => {
    let filtered = workflows.value

    if (activeTab.value === 'owner') {
      filtered = filtered.filter((workflow) => workflow.is_owner === true || workflow.is_owner === 1)
    } else if (activeTab.value === 'purchased') {
      filtered = filtered.filter((workflow) => workflow.is_owner === false || workflow.is_owner === 0)
    }

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      filtered = filtered.filter((workflow) =>
        workflow.name.toLowerCase().includes(query) ||
        workflow.description?.toLowerCase().includes(query)
      )
    }

    if (statusFilter.value) {
      filtered = filtered.filter((workflow) => workflow.status === statusFilter.value)
    }

    return filtered
  })

  const isWorkflowExecutionBlocked = (workflow: WorkflowItem | null) => {
    if (!workflow) return false
    return workflow.workflow_deleted === true || workflow.market_status === 'offline' || workflow.market_status === 'unlisted'
  }

  const getWorkflowExecutionBlockedMessage = (workflow: WorkflowItem | null) => {
    if (workflow?.workflow_deleted) {
      return t('workflowList.purchasedDeletedTooltip')
    }
    return t('workflowList.purchasedOfflineTooltip')
  }

  const fetchWorkflows = async () => {
    loading.value = true
    try {
      const res = await workflowApi.getWorkflows()
      if (res.code === 0 && res.data) {
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

  const handleTemplateCreation = (_templateId: string | string[] | undefined) => {
    showCreateDialog.value = true
  }

  const loadWorkflowDetail = async (workflow: WorkflowItem) => {
    const res = await workflowApi.getWorkflow(workflow.workflow_id)
    if (res.code === 0 && res.data) {
      return res.data
    }
    throw new Error(res.message || t('automationWorkflows.loadDetailFailed'))
  }

  const viewWorkflow = async (workflow: WorkflowItem) => {
    try {
      selectedWorkflow.value = await loadWorkflowDetail(workflow)
      showDetailDialog.value = true
    } catch (error) {
      console.error('获取工作流详情失败:', error)
      showMessage(t('automationWorkflows.loadDetailFailed'), 'error')
    }
  }

  const editWorkflow = async (workflow: WorkflowItem) => {
    try {
      selectedWorkflow.value = await loadWorkflowDetail(workflow)
      showCreateDialog.value = true
    } catch (error) {
      console.error('获取工作流详情失败:', error)
      showMessage(t('automationWorkflows.loadDetailFailed'), 'error')
    }
  }

  const deleteWorkflow = (workflow: WorkflowItem) => {
    workflowToDelete.value = workflow
    showDeleteConfirm.value = true
  }

  const confirmDeleteWorkflow = async () => {
    if (!workflowToDelete.value) return

    try {
      deleting.value = true
      const response = await workflowApi.deleteWorkflow(workflowToDelete.value.workflow_id)
      if (response.code === 0) {
        workflows.value = workflows.value.filter((workflow) => workflow.id !== workflowToDelete.value?.id)
        showMessage(t('automationWorkflows.deleteSuccess'), 'success')
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

  const handleWorkflowCreated = (_workflow: WorkflowItem) => {
    showCreateDialog.value = false
    selectedWorkflow.value = null
    fetchWorkflows()
  }

  const handleCreateDialogClose = () => {
    showCreateDialog.value = false
    selectedWorkflow.value = null
  }

  const handleWorkflowUpdated = (updatedWorkflow: WorkflowItem) => {
    const index = workflows.value.findIndex((workflow) => workflow.id === updatedWorkflow.id)
    if (index !== -1) {
      workflows.value[index] = updatedWorkflow
    }
    showDetailDialog.value = false
    fetchWorkflows()
  }

  const handlePublish = (workflow: WorkflowItem) => {
    router.push({
      path: '/workflows/publish',
      state: {
        workflow_id: workflow.workflow_id,
        workflow_name: workflow.name
      }
    })
  }

  const handleEditPublish = (workflow: WorkflowItem) => {
    router.push({
      path: '/workflows/publish',
      state: {
        workflow_id: workflow.workflow_id,
        workflow_name: workflow.name,
        edit_mode: true
      }
    })
  }

  const handleUnpublish = (workflow: WorkflowItem) => {
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

  const handleRepublish = async (workflow: WorkflowItem) => {
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

  const handleManageInventory = (workflow: WorkflowItem) => {
    selectedInventoryWorkflow.value = workflow
    showInventoryModal.value = true
  }

  const handleInventoryUpdated = () => {
    fetchWorkflows()
  }

  const openImportDialog = () => {
    if (importing.value) return
    importInputRef.value?.click()
  }

  const handleExportWorkflow = async (workflow: WorkflowItem) => {
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

  const handleExecuteWorkflow = (workflow: WorkflowItem) => {
    if (isWorkflowExecutionBlocked(workflow)) {
      showMessage(getWorkflowExecutionBlockedMessage(workflow), 'warning')
      return
    }
    executingWorkflow.value = workflow
    showExecuteConfirm.value = true
  }

  const confirmExecuteWorkflow = async () => {
    if (!executingWorkflow.value) return
    if (isWorkflowExecutionBlocked(executingWorkflow.value)) {
      showMessage(getWorkflowExecutionBlockedMessage(executingWorkflow.value), 'warning')
      return
    }

    showExecuteConfirm.value = false
    executing.value = true

    try {
      const response = await workflowApi.executeWorkflow(executingWorkflow.value.workflow_id, {})
      if (response.code === 0) {
        const status = response.data.status
        if (status === 'completed') {
          executionResultData.value = response.data
          showExecutionResult.value = true
          showMessage(t('marketDetail.executionSuccess'), 'success')
        } else if (status === 'failed') {
          showMessage(t('marketDetail.executionFailed'), 'error')
        } else {
          showMessage(t('marketDetail.executionSubmitted'), 'info')
        }
      }
    } catch (error) {
      console.error('执行失败:', error)
    } finally {
      executing.value = false
    }
  }

  const handleRefundWorkflow = (workflow: WorkflowItem) => {
    refundWorkflow.value = workflow
    showRefundConfirm.value = true
  }

  const resolveRefundPurchaseId = async (workflow: WorkflowItem) => {
    if (workflow?.purchase_id) return workflow.purchase_id

    const response = await getMyPurchases({ page: 1, page_size: 100 })
    const purchases = Array.isArray(response?.data?.items) ? response.data.items : []
    const matched = purchases.find((item: WorkflowItem) => Number(item.workflow_id) === Number(workflow?.id))

    if (matched?.id) {
      workflow.purchase_id = matched.id
      return matched.id
    }

    return null
  }

  const confirmRefundWorkflow = async () => {
    if (!refundWorkflow.value) return

    refunding.value = true
    try {
      const purchaseId = await resolveRefundPurchaseId(refundWorkflow.value)
      if (!purchaseId) {
        showMessage('没有找到这笔购买记录，暂时不能申请退款', 'error')
        return
      }

      const response = await requestWorkflowRefund(purchaseId)
      if (response.code === 0) {
        showMessage(t('automationWorkflows.refundRequested'), 'success')
        showRefundConfirm.value = false
        await fetchWorkflows()
      } else {
        showMessage(response.message, 'error')
      }
    } catch (error) {
      console.error('退款申请失败:', error)
    } finally {
      refunding.value = false
    }
  }

  onMounted(() => {
    fetchWorkflows()
    if (route.query.template) {
      handleTemplateCreation(route.query.template)
    }
  })

  return {
    activeTab,
    cancelDelete,
    confirmDeleteWorkflow,
    confirmExecuteWorkflow,
    confirmRefundWorkflow,
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
    handleRefundWorkflow,
    handleRepublish,
    handleUnpublish,
    handleWorkflowCreated,
    handleWorkflowUpdated,
    importing,
    importInputRef,
    isWorkspaceView,
    loading,
    openImportDialog,
    ownershipOptions,
    refundWorkflow,
    refunding,
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
    showRefundConfirm,
    showUnpublishConfirm,
    statusFilter,
    statusOptions,
    unpublishing,
    viewWorkflow,
    workflowToDelete,
    workflowToUnpublish,
    workflows
  }
}
