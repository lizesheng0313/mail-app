import axios from 'axios'
import { showMessage } from '@/utils/message'
import { getCurrentLocale, i18n } from '@/i18n'

const shouldSuppressErrorMessage = (config: any) => Boolean(config?.suppressErrorMessage)
const t = (key: string) => String(i18n.global.t(key))

// 检测是否在 Tauri 环境
const isTauri = () => {
  // Tauri v2: 检查 __TAURI_INTERNALS__ 或 __TAURI__
  // Tauri v1: 检查 __TAURI__
  // 同时检查 URL 协议（tauri:// 或 https://tauri.localhost）
  const hasTauriGlobal = '__TAURI__' in window || '__TAURI_INTERNALS__' in window
  const isTauriProtocol = window.location.protocol === 'tauri:' ||
    window.location.hostname === 'tauri.localhost' ||
    window.location.hostname === 'localhost' && window.location.port === ''
  return hasTauriGlobal || isTauriProtocol
}

// 根据环境确定 API 基础地址
const getBaseURL = () => {
  const tauriEnv = isTauri()
  const isDev = import.meta.env.DEV

  if (tauriEnv) {
    // Tauri 桌面端
    if (isDev) {
      // 开发模式：使用本地后端
      const localApi = 'http://localhost:8088/mail-api/v1'
      return localApi
    } else {
      // 生产模式：使用线上服务器
      return 'https://zjkdongao.cn/mail-api/v1'
    }
  }
  // Web 端：使用相对路径（通过 nginx 代理）
  return '/mail-api/v1'
}

// 导出 isTauri 供其他地方使用
export { isTauri }

// 获取服务器基础URL（供 Tauri 命令使用）
export const getServerUrl = () => getBaseURL()

// 系统维护状态管理
let maintenanceCallback: (() => void) | null = null
let errorCount = 0
let lastErrorTime = 0
const ERROR_THRESHOLD = 3 // 连续错误次数阈值
const ERROR_TIME_WINDOW = 10000 // 10秒内的错误计数

// 注册维护回调
export const registerMaintenanceCallback = (callback: () => void) => {
  maintenanceCallback = callback
}

// 重置错误计数
const resetErrorCount = () => {
  errorCount = 0
  lastErrorTime = 0
}

// 检查是否需要显示维护页面
const checkMaintenance = () => {
  const now = Date.now()

  // 如果距离上次错误超过时间窗口，重置计数
  if (now - lastErrorTime > ERROR_TIME_WINDOW) {
    errorCount = 1
  } else {
    errorCount++
  }

  lastErrorTime = now

  // 如果连续错误超过阈值，显示维护页面
  if (errorCount >= ERROR_THRESHOLD && maintenanceCallback) {
    maintenanceCallback()
    resetErrorCount() // 显示后重置计数，避免重复触发
  }
}

// 创建 axios 实例
const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 300000,  // 5分钟超时
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 添加授权头
    const token = localStorage.getItem('token')
    if (token) {
      if (!config.headers) {
        config.headers = {} as any
      }
      config.headers['Authorization'] = `Bearer ${token}`
    }
    if (!config.headers) {
      config.headers = {} as any
    }
    config.headers['Accept-Language'] = getCurrentLocale()
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // blob/arraybuffer 类型直接返回，不做业务层处理
    if (response.config.responseType === 'blob' || response.config.responseType === 'arraybuffer') {
      resetErrorCount()
      return response.data
    }

    const data = response.data

    // 请求成功，重置错误计数
    resetErrorCount()

    // 统一处理业务错误：只要 code !== 0 就显示错误消息
    if (data.code !== 0 && !shouldSuppressErrorMessage(response.config)) {
      showMessage(data.message || t('common.operationFailed'), 'error')
    }

    // 直接返回后端数据，保持 {code: 0, message: "", data: []} 格式
    return data
  },
  (error) => {
    // 401错误不计入维护检测
    if (error.response?.status === 401) {
      const backendDetail = String(error.response?.data?.detail || error.response?.data?.message || '').trim().toLowerCase()
      const isAccountDisabled =
        backendDetail === '账户已被禁用' ||
        backendDetail === 'this account has been disabled'
      const authErrorMessage = isAccountDisabled
        ? t('common.accountDisabled')
        : t('common.sessionExpired')

      if (isAccountDisabled) {
        sessionStorage.setItem('login_error_message', authErrorMessage)
      }

      // 未授权，清除本地存储并跳转到登录页
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('isAuthenticated')

      showMessage(authErrorMessage, 'error')

      // 刷新页面并跳转到登录页
      setTimeout(() => {
        window.location.href = '/login'
      }, 500)

      return Promise.reject({
        response: {
          data: {
            code: 1,
            message: authErrorMessage,
            data: null
          }
        }
      })
    }

    // 检测500/502/503等服务器错误
    const status = error.response?.status
    if (status && (status >= 500 || status === 502 || status === 503 || status === 504)) {
      checkMaintenance()
    }

    // 网络完全不通（如服务器宕机）
    if (!error.response && error.code === 'ERR_NETWORK') {
      checkMaintenance()
    }

    // 处理HTTP错误状态码，返回统一格式
    const errorMessage = error.response?.data?.message || error.response?.data?.detail || t('common.networkErrorRetry')

    // 显示网络错误
    if (!shouldSuppressErrorMessage(error.config)) {
      showMessage(errorMessage, 'error')
    }

    return Promise.reject({
      response: {
        data: {
          code: 1,
          message: errorMessage,
          data: null
        }
      }
    })
  }
)

export default api
