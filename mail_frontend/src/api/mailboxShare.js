/**
 * 邮箱分享 API
 */
import request from '@/services/api'
import { getStoredGuestClaimTokens } from '@/utils/guestMailboxes'

const SHARE_VISITOR_STORAGE_KEY = 'mailbox_share_visitor_id'

export const getShareVisitorId = () => {
  if (typeof window === 'undefined') return ''

  try {
    const existing = window.localStorage.getItem(SHARE_VISITOR_STORAGE_KEY)
    if (existing) return existing

    const generated =
      typeof window.crypto?.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    window.localStorage.setItem(SHARE_VISITOR_STORAGE_KEY, generated)
    return generated
  } catch {
    return ''
  }
}

export const mailboxShareAPI = {
  /**
   * 创建分享
   * @param {Object} data - { mailbox_ids: number[], mailbox_type: 'system'|'external', expire_days: number }
   */
  createShare(data, guestClaimToken = '') {
    return request.post('/mailbox-share/create', data, guestClaimToken ? {
      headers: { 'X-Guest-Mailbox-Token': guestClaimToken },
      skipAuth: true,
      suppressErrorMessage: true
    } : { suppressErrorMessage: true })
  },

  /**
   * 获取分享信息（无需登录）
  * @param {string} shareToken - 分享token
  */
  getShareInfo(shareToken) {
    const visitorId = getShareVisitorId()
    return request.get(`/mailbox-share/${shareToken}/info`, {
      headers: visitorId ? { 'X-Share-Visitor-Id': visitorId } : undefined,
      suppressErrorMessage: true
    })
  },

  /**
   * 获取分享的邮件（无需登录）
   * @param {string} shareToken - 分享token
   * @param {Object} params - { mailbox_id?: number, page: number, page_size: number }
   */
  getShareEmails(shareToken, params = {}) {
    return request.get(`/mailbox-share/${shareToken}/emails`, {
      params,
      suppressErrorMessage: true
    })
  },

  /**
   * 获取分享的邮件详情（无需登录）
   * @param {string} shareToken - 分享token
   * @param {number} emailId - 邮件ID
   * @param {string} type - 邮箱类型 'system' 或 'external'
   */
  getShareEmailDetail(shareToken, emailId, type = 'system') {
    return request.get(`/unified-emails/emails/${emailId}`, {
      params: {
        type,
        share_token: shareToken
      },
      suppressErrorMessage: true
    })
  },

  /**
   * 收取分享的外部邮箱邮件（无需登录）
   * @param {string} shareToken - 分享token
   * @param {Object} params - { mailbox_id?: number }
   */
  fetchShareEmails(shareToken, params = {}) {
    return request.post(`/mailbox-share/${shareToken}/fetch-emails`, null, {
      params,
      suppressErrorMessage: true
    })
  },

  /**
   * 获取我的分享列表
   * @param {number} page
   * @param {number} pageSize
   */
  getMyShares(page = 1, pageSize = 20, asGuest = false) {
    const guestTokens = asGuest ? getStoredGuestClaimTokens() : []
    if (asGuest && !guestTokens.length) {
      return Promise.resolve({ code: 0, data: { shares: [], pagination: { total: 0 } } })
    }
    return request.get('/mailbox-share/my/list', {
      params: { page, page_size: pageSize },
      skipAuth: asGuest,
      ...(guestTokens.length ? { headers: { 'X-Guest-Mailbox-Tokens': guestTokens.join(',') } } : {})
    })
  },

  /**
   * 删除分享
   * @param {number} shareId
   */
  deleteShare(shareId, asGuest = false) {
    const guestTokens = asGuest ? getStoredGuestClaimTokens() : []
    return request.delete(`/mailbox-share/${shareId}`, {
      skipAuth: asGuest,
      ...(guestTokens.length ? { headers: { 'X-Guest-Mailbox-Tokens': guestTokens.join(',') } } : {})
    })
  }
}

export default mailboxShareAPI
