/**
 * 邮箱标签和站点API
 */

import api from '@/services/api'

export const mailboxTagsAPI = {
  // 获取单个邮箱的站点和标签
  getMailboxTags: (mailboxType, mailboxId) => 
    api.get(`/mailbox-tags/${mailboxType}/${mailboxId}`),

  // 批量获取多个邮箱的站点和标签
  getBatchMailboxTags: (mailboxType, mailboxIds) => 
    api.get(`/mailbox-tags/batch/${mailboxType}`, { 
      params: { mailbox_ids: mailboxIds.join(',') } 
    }),

  // 创建手动标签
  createTag: (data) => api.post('/mailbox-tags/tag', data),

  // 删除手动标签
  deleteTag: (tagId) => api.delete(`/mailbox-tags/tag/${tagId}`),

  // 删除站点记录
  deleteSite: (siteId) => api.delete(`/mailbox-tags/site/${siteId}`)
}

export default mailboxTagsAPI
