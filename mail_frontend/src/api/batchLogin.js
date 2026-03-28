/**
 * 批量登录API接口
 */

import api from '@/services/api'

export const batchLoginAPI = {
  // 添加邮箱账号
  addAccount: (accountData, requestConfig = {}) =>
    api.post('/unified-emails/external-mailboxes', accountData, requestConfig),

  // 获取邮箱账号列表
  getAccounts: (page = 1, pageSize = 20, requestConfig = {}) => {
    const { search, ...restConfig } = requestConfig
    return api.get('/unified-emails/external-mailboxes', {
      params: {
        page,
        page_size: pageSize,
        ...(search ? { search } : {})
      },
      ...restConfig
    })
  },

  // 获取全部邮箱账号（自动翻页）
  getAllAccounts: async (pageSize = 100, requestConfig = {}) => {
    const accounts = []
    let page = 1
    let totalPages = 1

    while (page <= totalPages) {
      const response = await batchLoginAPI.getAccounts(page, pageSize, requestConfig)
      if (response.code !== 0) {
        return response
      }

      const data = response.data || {}
      const list = Array.isArray(data) ? data : data.accounts || []
      accounts.push(...list)

      const pagination = Array.isArray(data) ? null : data.pagination
      if (pagination?.total_pages) {
        totalPages = Number(pagination.total_pages || 1)
      } else if (list.length < pageSize) {
        totalPages = page
      } else {
        totalPages = page + 1
      }

      page += 1
    }

    return {
      code: 0,
      message: '获取成功',
      data: {
        accounts
      }
    }
  },

  // 批量登录
  batchLogin: (accountIds = []) =>
    api.post('/batch-login/login', { account_ids: accountIds }),

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

  // 删除邮箱账号
  deleteAccount: (accountId) =>
    api.delete(`/unified-emails/mailboxes/${accountId}`, { params: { type: 'external' } }),

  // 更新邮箱状态（桌面端收取后调用）
  updateMailboxStatus: (mailboxId, status, errorMessage = null) =>
    api.post('/unified-emails/external-emails/update-status', {
      mailbox_id: mailboxId,
      status,
      error_message: errorMessage
    }),

  // ========== OAuth2 相关 ==========

  // 批量导入 OAuth2 账号（通过 refresh_token + 自定义 client_id）
  batchImportOAuth2: (accounts) =>
    api.post('/oauth2/batch-import', { accounts }),

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
  refreshOAuth2Token: (mailboxId, requestConfig = {}) =>
    api.post(`/oauth2/mailboxes/${mailboxId}/refresh`, null, requestConfig),

  // 获取 OAuth2 access_token（桌面端本地 IMAP XOAUTH2 用）
  getOAuth2AccessToken: (mailboxId, requestConfig = {}) =>
    api.post(`/oauth2/mailboxes/${mailboxId}/access-token`, null, requestConfig),
}

export default batchLoginAPI
