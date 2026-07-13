/**
 * 通知相关 API
 */

import api from '@/services/api'

/**
 * 获取通知列表
 */
export function getNotifications(params) {
  return api.get('/notifications/', { params })
}

/**
 * 获取未读通知数量
 */
export function getUnreadCount() {
  return api.get('/notifications/unread-count')
}

/**
 * 标记通知为已读
 */
export function markAsRead(notificationId) {
  return api.put(`/notifications/${notificationId}/read`)
}

/**
 * 标记所有通知为已读
 */
export function markAllAsRead() {
  return api.put('/notifications/read-all')
}

/**
 * 删除通知
 */
export function deleteNotification(notificationId) {
  return api.delete(`/notifications/${notificationId}`)
}

/**
 * 删除所有已读通知
 */
export function deleteAllRead() {
  return api.delete('/notifications/read/all')
}
