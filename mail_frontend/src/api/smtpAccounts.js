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

    // 上报发信失败（用于把被风控/被封禁账号标成不可发）
    reportSendFailure: (data) =>
        api.post('/smtp-accounts/report-send-failure', data)
}

export default smtpAccountsAPI
