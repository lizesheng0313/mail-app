import api from '@/services/api'
import { getServerUrl } from '@/services/api'

export const monitoringAPI = {
  // 获取监控概览
  getOverview: () => api.get('/monitoring/overview'),

  // 获取用户统计
  getUserStats: (days = 7) => api.get('/monitoring/user-stats', { params: { days } }),

  // 获取邮件活动统计
  getEmailActivity: (days = 7) => api.get('/monitoring/email-activity', { params: { days } }),

  // 获取业务监控统计
  getBusinessStats: (days = 7) => api.get('/monitoring/business-stats', { params: { days } }),

  // 获取在线人数
  getOnlineCount: () => api.get('/monitoring/online-count'),

  // 获取系统健康状态
  getSystemHealth: () => api.get('/monitoring/system-health'),

  // 记录页面访问
  recordPageView: (payload) => api.post('/monitoring/page-view', payload),

  // 进入在线会话
  enterOnlineSession: (payload) => api.post('/monitoring/online-session/enter', payload),

  // 在线心跳
  heartbeatOnlineSession: (payload) => api.post('/monitoring/online-session/heartbeat', payload),

  // 离开在线会话
  leaveOnlineSession: (payload) => api.post('/monitoring/online-session/leave', payload),

  // 浏览器关闭时离线
  sendLeaveBeacon: (payload) => {
    const url = `${getServerUrl()}/monitoring/online-session/leave`
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const body = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      return navigator.sendBeacon(url, body)
    }
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {})
    return false
  },

  // 获取页面访问统计
  getPageAnalytics: (days = 7) => api.get('/monitoring/page-analytics', { params: { days } }),

  // 获取地理分布统计
  getGeoDistribution: (mode = 'global', days = 30) => 
    api.get('/monitoring/geo-distribution', { params: { mode, days } })
}

export default monitoringAPI
