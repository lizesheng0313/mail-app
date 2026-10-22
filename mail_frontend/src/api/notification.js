/**
 * 通知相关 API
 */

import api from '@/services/api'
import { withUnreadMutation } from '@/services/accountUnread'

/**
 * 获取通知列表
 */
export function getNotifications(params) {
  return api.get('/notifications/', { params, timeout: 15000 })
}

/**
 * 获取未读通知数量
 */
export function getUnreadCount() {
  return api.get('/notifications/unread-count', { timeout: 15000 })
}

/** 打开系统时需要逐条确认的重要通知。 */
export function getPendingImportantNotifications() {
  return api.get('/notifications/important/pending')
}

export function acknowledgeImportantNotification(notificationId, options = {}) {
  return withUnreadMutation('announcements', api.put(`/notifications/important/${notificationId}/acknowledge`, options))
}

export function getSharedEarningsNoticePreference() {
  return api.get('/notifications/important/preferences/shared-earnings')
}

export function setSharedEarningsNoticePreference(enabled) {
  return api.put('/notifications/important/preferences/shared-earnings', { enabled })
}

/**
 * 标记通知为已读
 */
export function markAsRead(notificationId) {
  return withUnreadMutation('notifications', api.put(`/notifications/${notificationId}/read`))
}

/**
 * 标记所有通知为已读
 */
export function markAllAsRead() {
  return withUnreadMutation('notifications', api.put('/notifications/read-all'))
}

/**
 * 删除通知
 */
export function deleteNotification(notificationId) {
  return withUnreadMutation('notifications', api.delete(`/notifications/${notificationId}`))
}

/**
 * 删除所有已读通知
 */
export function deleteAllRead() {
  return api.delete('/notifications/read/all')
}
