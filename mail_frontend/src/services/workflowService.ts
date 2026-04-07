import { apiClient } from './api'

export interface WorkflowConfig {
  workflow_id: string
  name: string
  description: string
  version: string
  author: string
  steps: StepConfig[]
  variables: Record<string, any>
  settings: Record<string, any>
  created_at?: string
  updated_at?: string
}

export interface StepConfig {
  step_id: string
  name: string
  plugin_id: string
  action: string
  parameters: Record<string, any>
  condition?: StepCondition
  retry_count?: number
  timeout?: number
}

export interface StepCondition {
  type: 'always' | 'success' | 'failure' | 'expression'
  expression?: string
}

export interface WorkflowCallRequest {
  workflow_id: string
  parameters?: Record<string, any>
  callback_url?: string
  priority?: number
  timeout?: number
}

export interface WorkflowCallResponse {
  call_id: string
  workflow_id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout'
  result?: Record<string, any>
  error_message?: string
  created_at: string
  started_at?: string
  completed_at?: string
  duration?: number
}

export interface WorkflowPermission {
  workflow_id: string
  user_id?: string
  role?: string
  permissions: string[]
}

export interface WorkflowCategory {
  id: string
  name: string
  description: string
  parent_id?: string
}

export interface WorkflowStatistics {
  total: number
  running: number
  pending: number
  failed: number
  completed: number
}

class WorkflowService {
  // ==================== 基础工作流管理 ====================

  /**
   * 获取工作流列表
   */
  async getWorkflows(): Promise<{ workflows: WorkflowConfig[]; total: number }> {
    const response = await apiClient.get('/workflows/')
    return response.data
  }

  /**
   * 获取工作流详情
   */
  async getWorkflow(workflowId: string): Promise<WorkflowConfig> {
    const response = await apiClient.get(`/workflows/${workflowId}`)
    return response.data
  }

  /**
   * 创建工作流
   */
  async createWorkflow(
    workflow: Omit<
      WorkflowConfig,
      'workflow_id' | 'version' | 'author' | 'created_at' | 'updated_at'
    >
  ): Promise<{ workflow_id: string }> {
    const response = await apiClient.post('/workflows/', workflow)
    return response.data.data
  }

  /**
   * 更新工作流
   */
  async updateWorkflow(workflowId: string, updates: Partial<WorkflowConfig>): Promise<void> {
    await apiClient.put(`/workflows/${workflowId}`, updates)
  }

  /**
   * 删除工作流
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    await apiClient.delete(`/workflows/${workflowId}`)
  }

  /**
   * 执行工作流（同步）
   */
  async executeWorkflow(
    workflowId: string,
    variables?: Record<string, any>,
    options: { emailId?: number; count?: number } = {}
  ): Promise<any> {
    const response = await apiClient.post(`/workflows/${workflowId}/execute`, {
      variables,
      email_id: options.emailId,
      count: options.count
    })
    return response.data.data
  }

  // ==================== 工作流调用管理 ====================

  /**
   * 调用工作流（异步）
   */
  async callWorkflow(
    request: WorkflowCallRequest
  ): Promise<{ call_id: string; status: string; estimated_duration: number }> {
    const response = await apiClient.post('/workflows/call', request)
    return response.data.data
  }

  /**
   * 获取调用状态
   */
  async getCallStatus(callId: string): Promise<WorkflowCallResponse> {
    const response = await apiClient.get(`/workflows/call/${callId}`)
    return response.data
  }

  /**
   * 取消调用
   */
  async cancelCall(callId: string): Promise<void> {
    await apiClient.delete(`/workflows/call/${callId}`)
  }

  /**
   * 获取调用列表
   */
  async getCalls(params?: {
    workflow_id?: string
    status?: string
    limit?: number
    offset?: number
  }): Promise<{ calls: WorkflowCallResponse[]; total: number }> {
    const response = await apiClient.get('/workflows/calls', { params })
    return response.data.data
  }

  // ==================== 权限管理 ====================

  /**
   * 设置工作流权限
   */
  async setPermission(
    workflowId: string,
    permission: Omit<WorkflowPermission, 'workflow_id'>
  ): Promise<void> {
    await apiClient.post(`/workflows/${workflowId}/permissions`, {
      workflow_id: workflowId,
      ...permission
    })
  }

  /**
   * 获取工作流权限
   */
  async getPermissions(workflowId: string): Promise<{ workflow_id: string; permissions: any[] }> {
    const response = await apiClient.get(`/workflows/${workflowId}/permissions`)
    return response.data.data
  }

  /**
   * 移除权限
   */
  async removePermission(
    workflowId: string,
    params: { user_id?: string; role?: string }
  ): Promise<void> {
    await apiClient.delete(`/workflows/${workflowId}/permissions`, { params })
  }

  // ==================== 分类和标签管理 ====================

  /**
   * 创建分类
   */
  async createCategory(category: Omit<WorkflowCategory, 'id'>): Promise<{ category_id: string }> {
    const response = await apiClient.post('/workflows/categories', category)
    return response.data.data
  }

  /**
   * 获取分类列表
   */
  async getCategories(): Promise<{ categories: WorkflowCategory[] }> {
    const response = await apiClient.get('/workflows/categories')
    return response.data.data
  }

  /**
   * 设置工作流分类
   */
  async setWorkflowCategory(workflowId: string, categoryId: string): Promise<void> {
    await apiClient.put(`/workflows/${workflowId}/category`, null, {
      params: { category_id: categoryId }
    })
  }

  /**
   * 设置工作流标签
   */
  async setWorkflowTags(workflowId: string, tags: string[]): Promise<void> {
    await apiClient.post(`/workflows/${workflowId}/tags`, {
      workflow_id: workflowId,
      tags
    })
  }

  /**
   * 获取所有标签
   */
  async getAllTags(): Promise<{ tags: string[] }> {
    const response = await apiClient.get('/workflows/tags')
    return response.data.data
  }

  // ==================== 执行历史 ====================

  /**
   * 获取执行历史
   */
  async getExecutionHistory(
    workflowId: string,
    limit = 100
  ): Promise<{ executions: any[]; total: number }> {
    const response = await apiClient.get(`/workflows/${workflowId}/executions`, {
      params: { limit }
    })
    return response.data
  }

  // ==================== 自动化工作流 ====================

  /**
   * 创建自动化工作流
   */
  async createAutomation(automation: {
    name: string
    description: string
    type: string
    config: Record<string, any>
  }): Promise<{ workflow_id: string }> {
    const response = await apiClient.post('/workflows/automation', automation)
    return response.data.data
  }

  /**
   * 获取自动化类型模板
   */
  async getAutomationTypes(): Promise<Record<string, any>> {
    const response = await apiClient.get('/workflows/templates/automation-types')
    return response.data.data
  }

  // ==================== 统计信息 ====================

  /**
   * 获取工作流统计信息
   */
  async getStatistics(): Promise<WorkflowStatistics> {
    // 这里可能需要调用多个API来获取统计信息
    const [workflows, calls] = await Promise.all([
      this.getWorkflows(),
      this.getCalls({ limit: 1000 })
    ])

    const statistics: WorkflowStatistics = {
      total: workflows.total,
      running: 0,
      pending: 0,
      failed: 0,
      completed: 0
    }

    // 统计各种状态的数量
    calls.calls.forEach((call) => {
      switch (call.status) {
        case 'running':
          statistics.running++
          break
        case 'pending':
          statistics.pending++
          break
        case 'failed':
        case 'timeout':
          statistics.failed++
          break
        case 'completed':
          statistics.completed++
          break
      }
    })

    return statistics
  }

  // ==================== 工具方法 ====================

  /**
   * 轮询调用状态直到完成
   */
  async pollCallStatus(
    callId: string,
    onUpdate?: (status: WorkflowCallResponse) => void
  ): Promise<WorkflowCallResponse> {
    const poll = async (): Promise<WorkflowCallResponse> => {
      const status = await this.getCallStatus(callId)

      if (onUpdate) {
        onUpdate(status)
      }

      if (['completed', 'failed', 'timeout'].includes(status.status)) {
        return status
      }

      // 等待2秒后继续轮询
      await new Promise((resolve) => setTimeout(resolve, 2000))
      return poll()
    }

    return poll()
  }

  /**
   * 批量调用工作流
   */
  async batchCallWorkflows(
    requests: WorkflowCallRequest[]
  ): Promise<{ call_id: string; status: string }[]> {
    const results = await Promise.allSettled(requests.map((request) => this.callWorkflow(request)))

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          call_id: `error_${index}`,
          status: 'failed'
        }
      }
    })
  }
}

export const workflowService = new WorkflowService()
export default workflowService
