/**
 * 邮箱管理API接口
 */

import api from '@/services/api'

export const mailboxAPI = {
  // 获取临时邮箱（未注册用户）
  getTempMailbox: () => api.post('/mailboxes/temp'),

  // 获取临时邮箱的邮件（无需登录）
  getTempMailboxEmails: (mailboxId, params = {}, claimToken = '') =>
    api.get(`/mailboxes/temp/${mailboxId}/emails`, {
      params,
      ...(claimToken
        ? { headers: { 'X-Guest-Mailbox-Token': claimToken } }
        : {})
    }),

  // 登录后保存当前浏览器创建的游客邮箱
  claimGuestMailboxes: (claimTokens = []) =>
    api.post('/mailboxes/guest/claim', { claim_tokens: claimTokens }),

  // 创建邮箱（注册用户）
  allocateMailbox: (data = {}) => api.post('/mailboxes/', data),

  // 获取系统域名列表（指定生成使用）
  getSystemDomains: (params = {}) => api.get('/mailboxes/system-domains', { params }),

  // 指定规则批量生成系统邮箱
  customGenerateSystemMailboxes: (data = {}) => api.post('/mailboxes/system/custom-generate', data),

  // 获取用户邮箱列表
  getMailboxes: (params = {}) => api.get('/mailboxes/', { params }),

  // 删除邮箱
  deleteMailbox: (id) => api.delete(`/mailboxes/${id}`),

  // 获取邮箱统计
  getStats: () => api.get('/mailboxes/stats')
}

export default mailboxAPI
