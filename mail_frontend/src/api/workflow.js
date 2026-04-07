/**
 * 工作流API接口
 */

import api from '@/services/api'

export const workflowApi = {
  // 获取工作流列表
  getWorkflows() {
    return api.get('/workflows/')
  },

  // 获取工作流详情
  getWorkflow(workflowId) {
    return api.get(`/workflows/${workflowId}`)
  },

  // 创建工作流
  createWorkflow(data) {
    return api.post('/workflows/', data)
  },

  // 更新工作流
  updateWorkflow(workflowId, data) {
    return api.put(`/workflows/${workflowId}`, data)
  },

  // 删除工作流
  deleteWorkflow(workflowId) {
    return api.delete(`/workflows/${workflowId}`)
  },

  // 执行工作流
  executeWorkflow(workflowId, variables = {}, options = {}) {
    const payload = { variables }
    if (options.emailId) {
      payload.email_id = options.emailId
    }
    if (options.count && options.count > 1) {
      payload.count = options.count
    }
    return api.post(`/workflows/${workflowId}/execute`, payload)
  },

  // 获取执行历史
  getExecutionHistory(workflowId, limit = 100) {
    return api.get(`/workflows/${workflowId}/executions`, { params: { limit } })
  },

  // 获取所有工作流的执行历史
  getAllExecutions(limit = 100, status = null) {
    const params = { limit }
    if (status) params.status = status
    return api.get('/workflows/history/all', { params })
  },

  // 获取执行日志
  getExecutionLogs(workflowId, executionId) {
    return api.get(`/workflows/${workflowId}/logs`, {
      params: executionId ? { execution_id: executionId } : {}
    })
  },

  // 重试工作流执行
  retryExecution(executionId) {
    return api.post(`/workflows/executions/${executionId}/retry`)
  },

  // 创建自动化工作流
  createAutomation(data) {
    return api.post('/workflows/automation', data)
  },

  // 获取自动化类型模板
  getAutomationTypes() {
    return api.get('/workflows/templates/automation-types')
  },

  // 获取爬虫连接池状态
  getCrawlerPoolStatus() {
    return api.get('/workflows/crawler-pool/status')
  },

  // 获取指定状态的工作流执行总数
  getWorkflowCountByStatus(status) {
    return api.get('/workflows/stats/count-by-status', { params: { status } })
  },

  // ============================================
  // 工作流详情和市场相关API
  // ============================================

  // 更新工作流详情说明
  updateWorkflowDescription(workflowId, longDescription) {
    return api.put(`/workflows/${workflowId}/description`, {
      long_description: longDescription
    })
  },

  // AI生成工作流详情说明
  generateWorkflowDescription(workflowId) {
    return api.post(`/workflows/${workflowId}/generate-description`)
  },

  // 发布工作流到市场（首次发布）
  publishWorkflowToMarket(workflowId, data) {
    return api.post(`/workflows/${workflowId}/publish`, data)
  },

  // 更新工作流市场信息（编辑已发布的）
  updateWorkflowMarketInfo(workflowId, data) {
    return api.put(`/workflow-market/workflows/${workflowId}/market-info`, data)
  },

  // 从市场下架工作流
  unpublishWorkflowFromMarket(workflowId) {
    return api.delete(`/workflows/${workflowId}/market`)
  },

  // ============================================
  // 账号库存管理API
  // ============================================

  // 添加库存
  addInventory(workflowId, data) {
    return api.post(`/workflows/${workflowId}/inventory`, data)
  },

  // 获取库存数量
  getInventoryCount(workflowId) {
    return api.get(`/workflows/${workflowId}/inventory/count`)
  },

  // 获取库存列表（仅所有者）
  getInventoryList(workflowId, params = {}) {
    return api.get(`/workflows/${workflowId}/inventory/list`, { params })
  },

  // 删除库存
  deleteInventory(workflowId, inventoryId) {
    return api.delete(`/workflows/${workflowId}/inventory/${inventoryId}`)
  },

  // 批量删除库存
  batchDeleteInventory(workflowId, inventoryIds) {
    return api.post(`/workflows/${workflowId}/inventory/batch-delete`, {
      inventory_ids: inventoryIds
    })
  },

  // ============================================
  // 内置Actions API
  // ============================================

  // 获取所有内置actions
  getBuiltinActions() {
    return api.get('/workflows/builtin-actions')
  },

  // 获取内置action详情
  getBuiltinActionDetail(actionId) {
    return api.get(`/workflows/builtin-actions/${actionId}`)
  }
}
