/**
 * 邮件API接口
 * 统一使用 /unified-emails 路由
 */

import api from '@/services/api'

export const emailAPI = {
  // 获取当前用户所有邮件（分页）
  // 支持 type 参数：'system' (系统邮箱) 或 'external' (外部邮箱)
  getUserEmails: (params) => {
    const cleanParams = { type: 'system', ...params }
    // 移除 undefined 值
    Object.keys(cleanParams).forEach(key => {
      if (cleanParams[key] === undefined) {
        delete cleanParams[key]
      }
    })
    return api.get('/unified-emails/user/emails', { params: cleanParams })
  },

  // 获取指定邮箱的所有邮件（使用统一接口，通过 type 区分）
  getMailboxEmails: (mailboxId, params, signal) => {
    const cleanParams = { type: 'system', mailbox_id: mailboxId, ...params }
    // 移除 undefined 值
    Object.keys(cleanParams).forEach(key => {
      if (cleanParams[key] === undefined) {
        delete cleanParams[key]
      }
    })
    return api.get('/unified-emails/user/emails', { params: cleanParams, signal })
  },

  // 获取邮件详情
  // 需要传 type 参数：'system' 或 'external'
  getEmail: (id, type = 'system') => api.get(`/unified-emails/emails/${id}`, { params: { type } }),

  // 翻译邮件正文
  translateEmail: (data) => api.post('/ai/translate-email', data),

  // 标记邮件为已读
  markAsRead: (id, type = 'system') => api.put(`/unified-emails/emails/${id}/read`, null, { params: { type } }),

  // 删除邮件
  deleteEmail: (id, type = 'system') => api.delete(`/unified-emails/emails/${id}`, { params: { type } })
}

export default emailAPI
