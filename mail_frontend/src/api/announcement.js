/**
 * 公告相关 API
 */
import api from '@/services/api'

/**
 * 获取公告列表
 */
export function getAnnouncements(params) {
  return api.get('/announcements', { params })
}

/**
 * 获取公告详情
 */
export function getAnnouncementDetail(id) {
  return api.get(`/announcements/${id}`)
}

/**
 * 标记公告为已读
 */
export function markAnnouncementAsRead(id) {
  return api.put(`/announcements/${id}/read`)
}

/**
 * 标记所有公告为已读
 */
export function markAllAnnouncementsAsRead() {
  return api.post('/announcements/read-all')
}
