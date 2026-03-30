import axios from 'axios'

import { getCurrentLocale, i18n } from '@/i18n'
import { getServerUrl } from '@/services/api'
import { showMessage } from '@/utils/message'

const shouldSuppressErrorMessage = (config: any) => Boolean(config?.suppressErrorMessage)
const t = (key: string) => String(i18n.global.t(key))

const getOpenPlatformBaseURL = () => {
  const baseUrl = getServerUrl()
  if (baseUrl.endsWith('/mail-api/v1')) {
    return baseUrl.replace('/mail-api/v1', '/open/v1')
  }
  return '/open/v1'
}

const openPlatformApi = axios.create({
  baseURL: getOpenPlatformBaseURL(),
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json'
  }
})

openPlatformApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      if (!config.headers) {
        config.headers = {} as any
      }
      config.headers.Authorization = `Bearer ${token}`
    }
    if (!config.headers) {
      config.headers = {} as any
    }
    config.headers['Accept-Language'] = getCurrentLocale()
    return config
  },
  (error) => Promise.reject(error)
)

openPlatformApi.interceptors.response.use(
  (response) => {
    const data = response.data
    if (data.code !== 0 && !shouldSuppressErrorMessage(response.config)) {
      showMessage(data.message || t('common.operationFailed'), 'error')
    }
    return data
  },
  (error) => {
    const errorMessage = error.response?.data?.message || error.response?.data?.detail || t('common.networkErrorRetry')
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

export { getOpenPlatformBaseURL }

export default openPlatformApi
