/**
 * 邮箱管理API接口
 */

import api from '@/services/api'

export const mailboxAPI = {
  // 获取临时邮箱（未注册用户）
  getTempMailbox: () => api.post('/mailboxes/temp'),

  // 获取临时邮箱的邮件（无需登录）
  getTempMailboxEmails: (mailboxId, params = {}) => api.get(`/mailboxes/temp/${mailboxId}/emails`, { params }),

  // 创建邮箱（注册用户）
  allocateMailbox: () => api.post('/mailboxes/'),

  // 获取用户邮箱列表
  getMailboxes: (params = {}) => api.get('/mailboxes/', { params }),

  // 删除邮箱
  deleteMailbox: (id) => api.delete(`/mailboxes/${id}`),

  // 获取邮箱统计
  getStats: () => api.get('/mailboxes/stats')
}

export default mailboxAPI
