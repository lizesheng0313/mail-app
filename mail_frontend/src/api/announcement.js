/**
 * 公告相关 API
 */
import api from '@/services/api'
import { withUnreadMutation } from '@/services/accountUnread'

const pendingReadRequests = new Map()

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
  const key = `${localStorage.getItem('token') || ''}:${id}`
  const pending = pendingReadRequests.get(key)
  if (pending) return pending

  const request = withUnreadMutation('announcements', api.post(`/announcements/${id}/read`))
    .finally(() => pendingReadRequests.delete(key))

  pendingReadRequests.set(key, request)
  return request
}

/**
 * 标记所有公告为已读
 */
export function markAllAnnouncementsAsRead() {
  return withUnreadMutation('announcements', api.post('/announcements/read-all'))
}
