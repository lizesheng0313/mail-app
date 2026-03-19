/**
 * 批量登录API接口
 */

import api from '@/services/api'

export const batchLoginAPI = {
  // 添加邮箱账号
  addAccount: (accountData, requestConfig = {}) =>
    api.post('/unified-emails/external-mailboxes', accountData, requestConfig),

  // 获取邮箱账号列表
  getAccounts: (page = 1, pageSize = 20) =>
    api.get('/unified-emails/external-mailboxes', {
      params: { page, page_size: pageSize }
    }),

  // 批量登录
  batchLogin: (accountIds = []) =>
    api.post('/batch-login/login', { account_ids: accountIds }),

  // 收取单个邮箱邮件
  fetchSingle: (accountId) =>
    api.post(`/unified-emails/external-mailboxes/${accountId}/fetch`),

  // 收取邮件（旧接口名，兼容）
  fetchEmails: (accountId) =>
    api.post(`/unified-emails/external-mailboxes/${accountId}/fetch`),

  // 获取外部邮件列表（统一接口）
  // mailboxId 可选，传入则获取该邮箱的邮件，不传则获取所有外部邮件
  getExternalEmails: (page = 1, pageSize = 20, mailboxId = null) => {
    const params = { page, page_size: pageSize }
    if (mailboxId) {
      params.mailbox_id = mailboxId
    }
    return api.get('/unified-emails/external-emails', { params })
  },

  // 获取统计信息
  getStats: () =>
    api.get('/batch-login/stats'),

  // 收取所有邮箱
  fetchAll: () =>
    api.post('/unified-emails/external-mailboxes/fetch-all'),

  // 删除邮箱账号
  deleteAccount: (accountId) =>
    api.delete(`/unified-emails/mailboxes/${accountId}`, { params: { type: 'external' } }),

  // 发送邮件
  sendEmail: (mailboxId, emailData) =>
    api.post(`/unified-emails/external-mailboxes/${mailboxId}/send`, {
      mailbox_id: mailboxId,
      to_addr: emailData.to,
      subject: emailData.subject,
      content: emailData.content,
      content_html: emailData.contentHtml || null,
      cc: emailData.cc || null,
      bcc: emailData.bcc || null
    }),

  // 获取 SMTP 配置
  getSmtpConfig: (mailboxId) =>
    api.get(`/unified-emails/external-mailboxes/${mailboxId}/smtp-config`),

  // 添加独立 SMTP 账号（仅用于发送）
  addSmtpAccount: (accountData) =>
    api.post('/unified-emails/smtp-accounts', accountData),

  // 验证已有账号的 SMTP
  verifySmtp: (accountId) =>
    api.post(`/unified-emails/external-mailboxes/${accountId}/verify-smtp`),

  // 更新邮箱状态（桌面端收取后调用）
  updateMailboxStatus: (mailboxId, status, errorMessage = null) =>
    api.post('/unified-emails/external-emails/update-status', {
      mailbox_id: mailboxId,
      status,
      error_message: errorMessage
    }),

  // ========== OAuth2 相关 ==========

  // 获取支持的 OAuth2 平台列表
  getOAuth2Providers: () =>
    api.get('/oauth2/providers'),

  // 获取 OAuth2 授权 URL
  getOAuth2AuthUrl: (provider, isDesktop = false, email = null) => {
    const params = { is_desktop: isDesktop }
    if (email) {
      params.email = email
    }
    return api.get(`/oauth2/${provider}/auth-url`, { params })
  },

  // 手动刷新 OAuth2 token
  refreshOAuth2Token: (mailboxId) =>
    api.post(`/oauth2/mailboxes/${mailboxId}/refresh`),

  // 用 OAuth2 拉取邮件
  fetchOAuth2Emails: (mailboxId) =>
    api.post(`/oauth2/mailboxes/${mailboxId}/fetch`)
}

export default batchLoginAPI
