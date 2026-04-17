/**
 * 工作流市场 API (从token自动获取user_id)
 */
import api from '@/services/api'

/**
 * 获取市场工作流列表
 */
export function getMarketWorkflows(params) {
  return api.get('/workflow-market/workflows', { params })
}

/**
 * 获取工作流详情 (从token自动获取user_id)
 */
export function getWorkflowDetail(workflowId) {
  return api.get(`/workflow-market/workflows/${workflowId}`)
}

/**
 * 获取工作流评价列表
 */
export function getWorkflowReviews(workflowId, params) {
  return api.get(`/workflow-market/workflows/${workflowId}/reviews`, {
    params
  })
}

/**
 * 发布工作流到市场 (从token自动获取user_id)
 */
export function publishWorkflow(data) {
  return api.post('/workflow-market/workflows/publish', {
    workflow_id: data.workflow_id,
    market_info: data.market_info
  })
}

/**
 * 更新工作流市场信息 (从token自动获取user_id)
 */
export function updateWorkflowMarketInfo(workflowId, marketInfo) {
  return api.put(`/workflow-market/workflows/${workflowId}/market-info`, marketInfo)
}

/**
 * 下架工作流 (从token自动获取user_id)
 */
export function unpublishWorkflow(workflowId) {
  return api.post(`/workflow-market/workflows/${workflowId}/unpublish`)
}

/**
 * 重新上架工作流 (已审核通过后下架的，无需再次审核)
 */
export function republishWorkflow(workflowId) {
  return api.post(`/workflow-market/workflows/${workflowId}/republish`)
}

/**
 * 购买工作流 (从token自动获取user_id)
 */
export function purchaseWorkflow(workflowId, quantity = 1) {
  return api.post(`/workflow-market/workflows/${workflowId}/purchase`, {
    quantity
  })
}

/**
 * 创建工作流评价 (从token自动获取user_id)
 */
export function createReview(workflowId, data) {
  return api.post(`/workflow-market/workflows/${workflowId}/reviews`, {
    workflow_id: workflowId,
    rating: data.rating,
    comment: data.comment,
    parent_id: data.parent_id
  })
}

/**
 * 删除工作流评价 (从token自动获取user_id)
 */
export function deleteReview(workflowId, reviewId) {
  return api.delete(`/workflow-market/workflows/${workflowId}/reviews/${reviewId}`)
}

/**
 * 获取我的购买列表 (从token自动获取user_id)
 */
export function getMyPurchases(params) {
  return api.get('/workflow-market/my/purchases', { params })
}

export function requestWorkflowRefund(purchaseId, reason = '') {
  return api.post(`/workflow-market/my/purchases/${purchaseId}/refund`, { reason })
}

export function getMyRefunds(params) {
  return api.get('/workflow-market/my/refunds', { params })
}

export function getSellerRefunds(params) {
  return api.get('/workflow-market/my/orders/refunds', { params })
}

export function approveWorkflowRefund(refundId, reply = '') {
  return api.post(`/workflow-market/my/refunds/${refundId}/approve`, { reply })
}

export function rejectWorkflowRefund(refundId, reply = '') {
  return api.post(`/workflow-market/my/refunds/${refundId}/reject`, { reply })
}

/**
 * 获取我的销售订单列表 (从token自动获取user_id)
 */
export function getMyOrders(params) {
  return api.get('/workflow-market/my/orders', { params })
}

/**
 * 获取工作流监控数据 (从token自动获取user_id)
 */
export function getWorkflowMonitor(workflowId, params) {
  return api.get(`/workflow-market/my/workflows/${workflowId}/monitor`, {
    params
  })
}

/**
 * 获取我发布的工作流列表 (从token自动获取user_id)
 */
export function getMyWorkflows(params) {
  return api.get('/workflow-market/my/workflows', { params })
}

/**
 * 获取用户中心仪表盘统计 (从token自动获取user_id)
 */
export function getDashboardStats() {
  return api.get('/workflow-market/my/dashboard')
}

// ========== 管理员接口 ==========

/**
 * 管理员获取审核列表
 */
export function adminGetReviewList(params) {
  return api.get('/workflow-market/admin/review-list', { params })
}

/**
 * 管理员通过审核 (从token自动获取admin_id)
 */
export function adminApproveWorkflow(workflowId) {
  return api.post(`/workflow-market/admin/workflows/${workflowId}/approve`)
}

/**
 * 管理员拒绝审核 (从token自动获取admin_id)
 */
export function adminRejectWorkflow(workflowId, reason) {
  return api.post(`/workflow-market/admin/workflows/${workflowId}/reject`, {
    reason
  })
}

/**
 * 管理员上架工作流
 */
export function adminPublishWorkflow(workflowId) {
  return api.post(`/workflow-market/admin/workflows/${workflowId}/publish`)
}

/**
 * 管理员下架工作流
 */
export function adminUnpublishWorkflow(workflowId) {
  return api.post(`/workflow-market/admin/workflows/${workflowId}/unpublish`)
}

export function adminForceWorkflowRefund(refundId, reply = '') {
  return api.post(`/workflow-market/admin/refunds/${refundId}/force`, { reply })
}

export function adminGetWorkflowRefunds(params) {
  return api.get('/workflow-market/admin/refunds', { params })
}
