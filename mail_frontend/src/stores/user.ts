import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User, ApiResponse, EmailDomain } from '@/types'
import { authAPI } from '@/api/auth'
import { userAPI } from '@/api/user'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const isAuthenticated = ref(false)
  const loading = ref(false)
  const allowedDomains = ref<EmailDomain[]>([])
  const verificationCodeSent = ref(false)
  const verificationEmail = ref('')

  const sendVerificationCode = async (email: string, purpose: string = 'register') => {
    loading.value = true
    try {
      const response: any = await authAPI.sendCode(email, purpose)
      // 处理后端 {code: 0, message: ""} 格式
      if (response.code === 0) {
        verificationCodeSent.value = true
        verificationEmail.value = email
        return { success: true, message: response.message }
      } else {
        return { success: false, error: response.message }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data?.detail || '发送验证码失败，请稍后重试'
      }
    } finally {
      loading.value = false
    }
  }

  const login = async (email: string, password: string) => {
    loading.value = true
    try {
      const response: any = await authAPI.login(email, password)

      // 处理后端 {code: 0, message: "", data: {}} 格式
      if (response.code === 0 && response.data) {
        user.value = response.data.user
        isAuthenticated.value = true

        // 只保存token和认证状态，用户数据实时获取
        localStorage.setItem('token', response.data.access_token)
        localStorage.setItem('isAuthenticated', 'true')

        return { success: true, message: response.message }
      } else {
        return { success: false, error: response.message }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || '登录失败，请检查邮箱和密码'
      }
    } finally {
      loading.value = false
    }
  }

  const register = async (email: string, password: string, verificationCode: string) => {
    loading.value = true
    try {
      const response: any = await authAPI.register(
        email,
        password,
        verificationCode
      )

      // 处理后端 {code: 0, message: "", data: {}} 格式
      if (response.code === 0 && response.data) {
        user.value = response.data.user
        isAuthenticated.value = true
        verificationCodeSent.value = false
        verificationEmail.value = ''

        // 只保存token和认证状态，用户数据实时获取
        localStorage.setItem('token', response.data.access_token)
        localStorage.setItem('isAuthenticated', 'true')

        return { success: true, message: response.message }
      } else {
        return { success: false, error: response.message }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data?.detail || '注册失败，请稍后重试'
      }
    } finally {
      loading.value = false
    }
  }

  const resetPassword = async (email: string, verificationCode: string, newPassword: string) => {
    loading.value = true
    try {
      const response: any = await authAPI.resetPassword(email, verificationCode, newPassword)

      // 处理后端 {code: 0, message: ""} 格式
      if (response.code === 0) {
        verificationCodeSent.value = false
        verificationEmail.value = ''
        return { success: true, message: response.message }
      } else {
        return { success: false, error: response.message }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data?.detail || '密码重置失败，请稍后重试'
      }
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    user.value = null
    isAuthenticated.value = false
    verificationCodeSent.value = false
    verificationEmail.value = ''
    localStorage.removeItem('token')
    localStorage.removeItem('isAuthenticated')
  }

  const checkAuth = async () => {
    // 清除旧的用户数据缓存
    localStorage.removeItem('user')

    const savedAuth = localStorage.getItem('isAuthenticated')
    const token = localStorage.getItem('token')

    if (savedAuth === 'true' && token) {
      isAuthenticated.value = true
      // 验证token是否有效，通过调用/users/me接口
      try {
        const result = await updateUserProfile()
        if (result?.success) {
          return true
        }
        logout()
        return false
      } catch (error) {
        // token无效，清除认证状态
        logout()
        return false
      }
    }
    return false
  }

  const fetchAllowedDomains = async () => {
    try {
      const response: any = await authAPI.getAllowedDomains()
      if (response.data.code === 0 && response.data.data) {
        allowedDomains.value = response.data.data.categories || {}
        return { success: true, data: response.data.data }
      }
      return { success: false, error: response.data.message }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || '获取邮箱域名失败'
      }
    }
  }

  const updateUserProfile = async () => {
    if (!isAuthenticated.value) {
      return { success: false, error: '未登录' }
    }

    try {
      const response: any = await userAPI.getProfile()
      if (response.code === 0 && response.data) {
        user.value = response.data
        return { success: true }
      } else {
        return { success: false, error: response.message }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || '更新用户信息失败'
      }
    }
  }

  const canAddMailbox = () => {
    if (!user.value) return false
    const remaining = (user.value as any).remaining_mailboxes_today
    return remaining !== undefined ? remaining > 0 : false
  }

  return {
    user,
    isAuthenticated,
    loading,
    allowedDomains,
    verificationCodeSent,
    verificationEmail,
    sendVerificationCode,
    login,
    register,
    resetPassword,
    logout,
    checkAuth,
    fetchAllowedDomains,
    updateUserProfile,
    canAddMailbox
  }
})
