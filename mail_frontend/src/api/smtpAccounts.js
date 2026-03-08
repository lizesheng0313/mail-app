/**
 * SMTP 发件账号 API
 */

import api from '@/services/api'

export const smtpAccountsAPI = {
    // 获取 SMTP 发件账号列表
    getAccounts: () =>
        api.get('/smtp-accounts'),

    // 获取已发送邮件列表
    getSentEmails: (params) =>
        api.get('/smtp-accounts/sent-emails', { params }),

    // 保存已发送邮件记录
    saveSentEmails: (data) =>
        api.post('/smtp-accounts/sent-emails', data),

    // 添加 SMTP 发件账号
    addAccount: (accountData) =>
        api.post('/smtp-accounts', accountData),

    // 删除 SMTP 发件账号
    deleteAccount: (accountId) =>
        api.delete(`/smtp-accounts/${accountId}`),

    // 发送邮件
    sendEmail: (accountId, emailData) =>
        api.post(`/smtp-accounts/${accountId}/send`, emailData),

    // 批量发送邮件
    batchSend: (data) =>
        api.post('/smtp-accounts/batch-send', data)
}

export default smtpAccountsAPI
