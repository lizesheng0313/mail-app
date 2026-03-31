<template>
  <div class="min-h-screen bg-gray-50">
    <PageHeader />
    
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">{{ t('profile.title') }}</h1>
      
      <!-- 基本信息卡片 -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">{{ t('profile.basicInfo') }}</h2>
        
        <div class="space-y-4">
          <div class="flex items-center justify-between py-3 border-b border-gray-100">
            <div class="flex items-center space-x-3">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
              <div>
                <div class="text-sm text-gray-500">{{ t('profile.emailLabel') }}</div>
                <div class="text-base text-gray-900">{{ userInfo?.email || '-' }}</div>
              </div>
            </div>
          </div>
          
          <div class="flex items-center justify-between py-3">
            <div class="flex items-center space-x-3">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              <div>
                <div class="text-sm text-gray-500">{{ t('profile.registeredAt') }}</div>
                <div class="text-base text-gray-900">{{ formatDate(userInfo?.created_at) || '-' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 奶片充值卡片 -->
      <div id="recharge" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">{{ t('profile.rechargeTitle') }}</h2>
        
        <div class="space-y-4">
          <!-- 当前余额 -->
          <div class="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg border border-primary-100">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div>
                <div class="text-sm text-gray-600">{{ t('profile.currentBalance') }}</div>
                <div class="text-2xl font-bold text-primary-600">{{ userInfo?.milk_coins || 0 }} <span class="text-base font-normal text-gray-600">{{ t('profile.coinUnit') }}</span></div>
              </div>
            </div>
          </div>

          <!-- 充值金额输入 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('profile.rechargeAmount') }}</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span class="text-gray-500">¥</span>
              </div>
              <input
                v-model.number="rechargeAmount"
                type="number"
                min="1"
                step="1"
                :placeholder="t('profile.rechargePlaceholder')"
                class="block w-full pl-8 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                @keypress.enter="handleRecharge"
              />
            </div>
            <div class="mt-2 text-xs text-gray-500">
              {{ t('profile.rechargeHint') }}
            </div>
          </div>

          <!-- 快捷金额 -->
          <div>
            <div class="text-sm font-medium text-gray-700 mb-2">{{ t('profile.quickSelect') }}</div>
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="amount in [10, 50, 100, 200]"
                :key="amount"
                @click="rechargeAmount = amount"
                :class="[
                  'py-2 px-3 border rounded-lg text-sm font-medium transition-all',
                  rechargeAmount === amount
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-300 text-gray-700 hover:border-primary-300 hover:bg-gray-50'
                ]"
              >
                ¥{{ amount }}
              </button>
            </div>
          </div>

          <!-- 充值按钮 -->
          <button
            @click="handleRecharge"
            :disabled="!rechargeAmount || rechargeAmount < 1 || recharging"
            class="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {{ recharging ? t('confirmDialog.processing') : t('profile.rechargeNow') }}
          </button>
        </div>
      </div>
      
      <!-- Google 账号绑定卡片 -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">{{ t('profile.thirdPartyBinding') }}</h2>
        </div>
        
        <div class="space-y-4">
          <!-- Google 绑定 -->
          <div class="flex items-center justify-between py-4 px-4 bg-gray-50 rounded-lg">
            <div class="flex items-center space-x-4">
              <!-- Google Logo 或 Google 头像 -->
              <div v-if="googleBound && googleInfo?.google_avatar" class="relative">
                <img 
                  :src="googleInfo.google_avatar" 
                  :alt="t('profile.googleAccount')"
                  class="w-10 h-10 rounded-full border border-gray-200"
                />
                <div class="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <svg class="w-3 h-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
              </div>
              <div v-else class="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <svg class="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <div>
                <div class="text-base font-medium text-gray-900">{{ t('profile.googleAccount') }}</div>
                <div v-if="loading" class="text-sm text-gray-500">{{ t('common.loading') }}</div>
                <div v-else-if="googleBound" class="flex items-center space-x-2">
                  <span class="text-sm text-gray-600">{{ googleInfo?.google_email }}</span>
                  <span v-if="googleInfo?.google_name" class="text-sm text-gray-400">({{ googleInfo.google_name }})</span>
                </div>
                <div v-else class="text-sm text-gray-500">{{ t('profile.unbound') }}</div>
              </div>
            </div>
            
            <div>
              <span v-if="loading" class="text-sm text-gray-400">...</span>
              <span v-else-if="googleBound" class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
                {{ t('profile.bound') }}
              </span>
              <button
                v-else
                @click="bindGoogle"
                :disabled="bindLoading"
                class="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 border border-primary-600 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50"
              >
                {{ bindLoading ? t('profile.bindingRedirect') : t('profile.bindNow') }}
              </button>
            </div>
          </div>
          
          <!-- 如果已绑定且有密码，显示解绑按钮 -->
          <div v-if="googleBound && !loading && hasPassword" class="flex items-center justify-between py-3 px-4 bg-yellow-50 rounded-lg">
            <div class="flex items-center space-x-2 text-sm text-yellow-800">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
              </svg>
              <span>{{ t('profile.unbindHint') }}</span>
            </div>
            <button
              @click="showUnbindDialog = true"
              class="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              {{ t('profile.unbind') }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- 提示信息 -->
      <div v-if="message" class="fixed top-4 right-4 z-50">
        <div :class="[
          'px-6 py-4 rounded-lg shadow-lg border-l-4 max-w-sm',
          messageType === 'success' ? 'bg-green-50 border-green-400 text-green-800' : 'bg-red-50 border-red-400 text-red-800'
        ]">
          {{ message }}
        </div>
      </div>
    </div>
    
    <!-- 解绑确认弹窗 -->
    <ConfirmDialog
      v-model:visible="showUnbindDialog"
      :title="t('profile.unbindTitle')"
      :message="t('profile.unbindMessage')"
      type="warning"
      :confirmText="t('profile.confirmUnbind')"
      :cancelText="t('common.cancel')"
      :loading="unbindLoading"
      :loadingText="t('profile.unbinding')"
      :show-warning="true"
      @confirm="handleUnbindConfirm"
    />

    <!-- 充值二维码弹窗 -->
    <div v-if="showQrCode" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50" @click="cancelRecharge">
      <div class="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4" @click.stop>
        <div class="p-6 text-center">
          <h3 class="text-xl font-bold text-gray-900 mb-2">{{ t('profile.alipayTitle') }}</h3>
          <div class="text-sm text-gray-600 mb-4">{{ t('profile.rechargeAmountLabel') }}<span class="text-2xl font-bold text-primary-600">¥{{ rechargeAmount }}</span></div>
          <div class="mb-4 p-4 bg-white border-2 border-gray-200 rounded-lg inline-block">
            <img :src="qrCodeUrl" :alt="t('profile.paymentQrAlt')" class="w-64 h-64">
          </div>
          <p class="text-xs text-gray-500 mb-6">{{ t('profile.paymentHint') }}</p>
          <div class="flex space-x-3">
            <button
              @click="cancelRecharge"
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {{ t('profile.cancelPayment') }}
            </button>
            <button
              @click="checkOrderStatus"
              class="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {{ t('profile.paid') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import authAPI from '@/api/auth'
import userAPI from '@/api/user'
import PageHeader from '@/components/PageHeader/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import { isTauri } from '@/services/api'
import { getCurrentLocale } from '@/i18n'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { t } = useI18n()

const loading = ref(true)
const bindLoading = ref(false)
const unbindLoading = ref(false)
const showUnbindDialog = ref(false)
const googleBound = ref(false)
const hasPassword = ref(true) // 是否设置了密码
const userInfo = ref<any>(null)
const googleInfo = ref<any>(null)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

// 充值相关
const rechargeAmount = ref<number | null>(null)
const recharging = ref(false)
const showQrCode = ref(false)
const qrCodeUrl = ref('')
const currentOrderNo = ref('')
let pollingTimer: any = null

// 显示消息
const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
  message.value = msg
  messageType.value = type
  setTimeout(() => {
    message.value = ''
  }, 3000)
}

// 获取邮箱首字母
const getInitial = (email: string | undefined) => {
  if (!email) return '?'
  return email.charAt(0).toUpperCase()
}

// 格式化日期
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString(getCurrentLocale(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 加载用户信息和绑定状态
const loadUserInfo = async () => {
  loading.value = true
  try {
    if (!localStorage.getItem('token')) {
      return
    }

    // 获取用户信息
    const userData = await userAPI.getProfile()
    if (userData.code === 0) {
      userInfo.value = userData.data
      // 检查是否有密码（password_hash 字段）
      hasPassword.value = userData.data.password_hash && userData.data.password_hash !== ''
    }

    // 获取 Google 绑定状态
    const googleData = await authAPI.getGoogleBindStatus()
    
    console.log('Google 绑定状态原始数据:', googleData)
    console.log('is_bound 值:', googleData.data?.is_bound)
    console.log('is_bound 类型:', typeof googleData.data?.is_bound)
    
    if (googleData.code === 0 && googleData.data) {
      googleBound.value = googleData.data.is_bound === true
      console.log('设置 googleBound 为:', googleBound.value)
      if (googleBound.value) {
        googleInfo.value = googleData.data
        console.log('Google 信息:', googleInfo.value)
      }
    } else {
      console.error('获取 Google 状态失败:', googleData.message)
    }
  } catch (error) {
    console.error('加载用户信息失败:', error)
  } finally {
    loading.value = false
  }
}

// 绑定 Google 账号
const bindGoogle = async () => {
  bindLoading.value = true
  try {
    const result = await authAPI.getGoogleLoginUrl({
      is_bind: true,
      is_desktop: isTauri()
    })
    
    if (result.code === 0) {
      // 跳转到 Google 授权页面
      window.location.href = result.data.auth_url
    } else {
      showMessage(result.message || t('login.getAuthLinkFailed'), 'error')
    }
  } catch (error) {
    showMessage(t('common.networkErrorRetry'), 'error')
  } finally {
    bindLoading.value = false
  }
}

// 解绑 Google 账号
const handleUnbindConfirm = async () => {
  unbindLoading.value = true
  try {
    const result = await authAPI.unbindGoogle()
    
    if (result.code === 0) {
      showMessage(t('profile.unbindSuccess'), 'success')
      googleBound.value = false
      googleInfo.value = null
      showUnbindDialog.value = false
    } else {
      showMessage(result.message || t('profile.unbindFailed'), 'error')
      showUnbindDialog.value = false
    }
  } catch (error) {
    showMessage(t('common.networkErrorRetry'), 'error')
    showUnbindDialog.value = false
  } finally {
    unbindLoading.value = false
  }
}

const handleGoogleBindRoute = async () => {
  const bindSuccess = route.query.google_bind_success
  const bindError = route.query.google_bind_error

  if (!bindSuccess && !bindError) {
    return
  }

  if (bindSuccess) {
    showMessage(t('profile.bindSuccess'), 'success')
    await loadUserInfo()
  } else if (typeof bindError === 'string' && bindError) {
    showMessage(bindError, 'error')
  }

  const nextQuery = { ...route.query }
  delete nextQuery.google_bind_success
  delete nextQuery.google_bind_error
  await router.replace({ path: route.path, query: nextQuery })
}

// 处理充值
const handleRecharge = async () => {
  if (!rechargeAmount.value || rechargeAmount.value < 1) {
    showMessage(t('profile.invalidAmount'), 'error')
    return
  }

  try {
    recharging.value = true
    
    const token = localStorage.getItem('token')
    // 创建充值订单
    const response = await fetch('/mail-api/v1/recharge/create-order', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: rechargeAmount.value
      })
    })
    
    const result = await response.json()
    
    if (result.code === 0 && result.data) {
      currentOrderNo.value = result.data.order_no
      qrCodeUrl.value = result.data.qr_code
      showQrCode.value = true
      
      // 开始轮询订单状态
      startPollingOrderStatus()
    } else {
      showMessage(result.message || t('profile.createOrderFailed'), 'error')
    }
  } catch (error) {
    showMessage(t('common.networkErrorRetry'), 'error')
    console.error(error)
  } finally {
    recharging.value = false
  }
}

// 开始轮询订单状态
const startPollingOrderStatus = () => {
  pollingTimer = setInterval(async () => {
    await checkOrderStatus()
  }, 3000) // 每3秒查询一次
}

// 检查订单状态
const checkOrderStatus = async () => {
  try {
    const token = localStorage.getItem('token')
    const response = await fetch(`/mail-api/v1/recharge/order-status/${currentOrderNo.value}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    const result = await response.json()
    
    if (result.code === 0 && result.data?.status === 'paid') {
      // 支付成功
      if (pollingTimer) {
        clearInterval(pollingTimer)
        pollingTimer = null
      }
      
      showQrCode.value = false
      showMessage(t('profile.rechargeSuccess'), 'success')
      
      // 刷新用户信息
      await loadUserInfo()
      
      // 清空输入
      rechargeAmount.value = null
    }
  } catch (error) {
    console.error('查询订单状态失败:', error)
  }
}

// 取消支付
const cancelRecharge = () => {
  showQrCode.value = false
  qrCodeUrl.value = ''
  currentOrderNo.value = ''
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

onMounted(() => {
  loadUserInfo()
  handleGoogleBindRoute()
  
  // 如果URL有 #recharge 锚点，自动滚动到充值区域
  if (window.location.hash === '#recharge') {
    setTimeout(() => {
      const rechargeElement = document.getElementById('recharge')
      if (rechargeElement) {
        rechargeElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // 添加高亮动画
        rechargeElement.classList.add('ring-2', 'ring-primary-500', 'ring-offset-2')
        setTimeout(() => {
          rechargeElement.classList.remove('ring-2', 'ring-primary-500', 'ring-offset-2')
        }, 2000)
      }
    }, 500)
  }
})

watch(() => [route.query.google_bind_success, route.query.google_bind_error], () => {
  handleGoogleBindRoute()
})
</script>
