<template>
  <div class="min-h-screen bg-secondary">
    <PageHeader />
    
    <!-- 页面标题区域 -->
    <div class="bg-gradient-to-r from-primary-700 to-primary-800 text-white py-8 mb-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 class="text-3xl font-bold mb-2">{{ pageTitle }}</h1>
        <p class="text-sm text-primary-100">{{ pageSubtitle }}</p>
        
        <!-- 奶片余额显示 -->
        <div class="mt-4 inline-flex items-center bg-white bg-opacity-20 backdrop-blur-sm rounded-full px-4 py-2">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="text-sm">{{ t('paymentPage.currentBalance') }}</span>
          <span class="text-xl font-bold ml-1">{{ userMilkCoins }}</span>
          <span class="text-sm ml-1">{{ t('paymentPage.coins') }}</span>
          <router-link to="/user/finance#recharge" class="ml-3 text-xs bg-white text-primary-600 px-3 py-1 rounded-full hover:bg-opacity-90 transition-colors">
            {{ t('paymentPage.recharge') }}
          </router-link>
        </div>
      </div>
    </div>
    
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      <!-- 加载中 -->
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600 mb-3"></div>
        <p class="text-black">{{ t('paymentPage.loadingPackages') }}</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="(purchaseType === 'plugin' && pluginPricing.length === 0) || (purchaseType === 'email-package' && emailPackages.length === 0)" class="text-center py-12">
        <div class="text-5xl mb-3">📦</div>
        <p class="text-black">{{ t('paymentPage.noPackages') }}</p>
      </div>

      <!-- 邮件包列表 -->
      <div v-else-if="purchaseType === 'email-package'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="pkg in emailPackages"
          :key="pkg.id"
          class="relative bg-white rounded-2xl p-6 transition-all duration-300 transform hover:-translate-y-2 flex flex-col"
          :class="{
            'ring-2 ring-primary-600 shadow-xl hover:shadow-2xl': pkg.recommended,
            'border border-gray-200 shadow-md hover:shadow-xl': !pkg.recommended
          }"
        >
          <div
            v-if="pkg.recommended"
            class="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-1 rounded-full text-xs font-bold shadow-md"
          >
            ⭐ {{ t('paymentPage.recommended') }}
          </div>

          <div class="flex justify-center mb-4 mt-1">
            <div class="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <div class="text-center mb-3">
            <h3 class="text-lg font-bold text-black mb-2">{{ pkg.name }}</h3>
            <div class="inline-flex items-center justify-center bg-primary-100 text-primary-700 px-3 py-1.5 rounded-full text-sm">
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span class="font-semibold">{{ pkg.quota.toLocaleString() }} 封</span>
            </div>
          </div>

          <div class="text-center mb-4 flex-grow">
            <div class="text-xs text-gray-400 line-through mb-1">{{ t('paymentPage.originalPrice', { price: pkg.originalPrice }) }}</div>
            <div class="flex items-baseline justify-center mb-2">
              <span class="text-4xl font-extrabold bg-gradient-to-r from-primary-700 to-primary-800 bg-clip-text text-transparent">{{ pkg.price }}</span>
              <span class="text-lg text-primary-600 font-bold ml-1">{{ t('paymentPage.coins') }}</span>
            </div>
            <div class="inline-block bg-primary-100 text-primary-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
              {{ t('paymentPage.discount', { percent: Math.round((1 - pkg.price / pkg.originalPrice) * 100) }) }}
            </div>
          </div>

          <div class="text-center text-black text-sm mb-4 pb-4 border-b border-gray-100">
            <p>{{ pkg.description }}</p>
          </div>

          <div class="space-y-2 mb-5">
            <div class="flex items-center text-xs text-black">
              <svg class="w-4 h-4 text-success-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{{ t('paymentPage.stableReliable') }}</span>
            </div>
            <div class="flex items-center text-xs text-black">
              <svg class="w-4 h-4 text-success-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{{ t('paymentPage.instantArrival') }}</span>
            </div>
            <div class="flex items-center text-xs text-black">
              <svg class="w-4 h-4 text-success-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{{ t('paymentPage.support') }}</span>
            </div>
          </div>

          <button
            @click="handleBuy(pkg)"
            :disabled="buyingPackageId === pkg.id"
            class="w-full h-11 btn-primary font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            <div v-if="buyingPackageId === pkg.id" class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <span>{{ buyingPackageId === pkg.id ? t('paymentPage.processing') : t('paymentPage.buyNow') }}</span>
          </button>
        </div>
      </div>

      <!-- 插件套餐列表 -->
      <div v-else-if="purchaseType === 'plugin'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="(pricing, index) in pluginPricing"
          :key="pricing.id"
          class="relative bg-white rounded-2xl p-6 transition-all duration-300 transform hover:-translate-y-2 flex flex-col"
          :class="{
            'ring-2 ring-primary-600 shadow-xl hover:shadow-2xl': pricing.duration_type === 'yearly',
            'border border-gray-200 shadow-md hover:shadow-xl': pricing.duration_type !== 'yearly'
          }"
        >
          <!-- 推荐标签 -->
          <div v-if="pricing.duration_type === 'yearly'" 
               class="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-1 rounded-full text-xs font-bold shadow-md">
            ⭐ {{ t('paymentPage.recommended') }}
          </div>

          <!-- 套餐图标 -->
          <div class="flex justify-center mb-4 mt-1">
            <div class="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>

          <!-- 套餐标题 -->
          <div class="text-center mb-3">
            <h3 class="text-lg font-bold text-black mb-2">{{ getDurationName(pricing.duration_type) }}</h3>
            <div class="inline-flex items-center justify-center bg-primary-100 text-primary-700 px-3 py-1.5 rounded-full text-sm">
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="font-semibold">{{ t('paymentPage.durationDays', { count: pricing.duration_days }) }}</span>
            </div>
          </div>

          <!-- 价格 -->
          <div class="text-center mb-4 flex-grow">
            <div class="text-xs text-gray-400 line-through mb-1">{{ t('paymentPage.originalPrice', { price: Math.floor(pricing.original_price) }) }}</div>
            <div class="flex items-baseline justify-center mb-2">
              <span class="text-4xl font-extrabold bg-gradient-to-r from-primary-700 to-primary-800 bg-clip-text text-transparent">{{ Math.floor(pricing.price) }}</span>
              <span class="text-lg text-primary-600 font-bold ml-1">{{ t('paymentPage.coins') }}</span>
            </div>
            <div class="inline-block bg-primary-100 text-primary-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
              {{ t('paymentPage.discount', { percent: pricing.discount }) }}
            </div>
          </div>

          <!-- 描述 -->
          <div class="text-center text-black text-sm mb-4 pb-4 border-b border-gray-100">
            <p>{{ pluginInfo?.description || t('paymentPage.pluginFallbackDesc') }}</p>
          </div>

          <!-- 特性列表 -->
          <div class="space-y-2 mb-5">
            <div class="flex items-center text-xs text-black">
              <svg class="w-4 h-4 text-success-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{{ t('paymentPage.fullAccess') }}</span>
            </div>
            <div class="flex items-center text-xs text-black">
              <svg class="w-4 h-4 text-success-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{{ t('paymentPage.readyToUse') }}</span>
            </div>
            <div class="flex items-center text-xs text-black">
              <svg class="w-4 h-4 text-success-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{{ t('paymentPage.support') }}</span>
            </div>
          </div>

          <!-- 已购买提示 -->
          <div v-if="pluginInfo?.user_has_authorization" class="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg text-center">
            <p class="text-xs text-green-700">✓ {{ t('paymentPage.subscribed') }}</p>
          </div>

          <!-- 购买按钮 -->
          <button
            @click="handleBuy(pricing)"
            :disabled="buyingPackageId === pricing.id"
            class="w-full h-11 btn-primary font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            <div v-if="buyingPackageId === pricing.id" class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <span v-if="buyingPackageId === pricing.id">{{ t('paymentPage.processing') }}</span>
            <span v-else-if="pluginInfo?.user_has_authorization">{{ t('paymentPage.renew') }}</span>
            <span v-else>{{ t('paymentPage.buyNow') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 购买确认弹窗 -->
    <ConfirmDialog
      :visible="showConfirmDialog"
      :title="confirmDialogTitle"
      :message="confirmDialogMessage"
      :loading="buyingPackageId !== null"
      @confirm="confirmBuy"
      @cancel="showConfirmDialog = false"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import api from '@/services/api'
import pluginApi from '@/api/plugin'
import emailReachApi from '@/api/emailReach'
import { showMessage } from '@/utils/message'

interface PluginPricing {
  id: number
  duration_type: string
  duration_days: number
  price: number
  original_price: number
  sort_order: number
  discount: number
}

interface EmailPackage {
  id: number
  name: string
  quota: number
  price: number
  originalPrice: number
  description: string
  recommended?: boolean
}

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const pluginPricing = ref<PluginPricing[]>([])
const pluginInfo = ref<any>(null)
const loading = ref(true)
const buyingPackageId = ref<number | null>(null)
const userMilkCoins = ref(0)
const showConfirmDialog = ref(false)
const confirmDialogTitle = ref('')
const confirmDialogMessage = ref('')
const currentBuyingItem = ref<any>(null)
const emailPackages = ref<EmailPackage[]>([])

// 仅插件与邮件触达邮件包保留购买页；旧邮箱套餐已下线。
const purchaseType = computed(() => route.query.type || '')
const pluginId = computed(() => route.query.id as string)

// 页面标题
const pageTitle = computed(() => {
  if (purchaseType.value === 'plugin') {
    return pluginInfo.value?.name || t('paymentPage.choosePluginPlan')
  }
  if (purchaseType.value === 'email-package') {
    return '购买邮件包'
  }
  return ''
})

const pageSubtitle = computed(() => {
  if (purchaseType.value === 'plugin') {
    return t('paymentPage.pluginSubtitle')
  }
  if (purchaseType.value === 'email-package') {
    return '按邮件封数补充发送额度'
  }
  return ''
})

// 获取用户奶片余额
const loadUserMilkCoins = async () => {
  try {
    const res = await api.get('/milk-coins/balance')
    if (res.code === 0 && res.data) {
      userMilkCoins.value = res.data.balance || 0
    }
  } catch (error: any) {
    console.error('获取奶片余额错误：', error)
  }
}

const loadEmailPackages = async () => {
  loading.value = true
  try {
    const res = await emailReachApi.getQuotaPricing()
    if (res.code === 0) {
      emailPackages.value = (res.data?.packages || []).map((item: any) => ({
        id: Number(item.quota || 0),
        name: item.name || `${Number(item.quota || 0).toLocaleString()}封套餐`,
        quota: Number(item.quota || 0),
        price: Number(item.price || 0),
        originalPrice: Number(item.original_price || item.price || 0),
        description: item.description || '',
        recommended: Boolean(item.recommended)
      }))
    }
  } catch (error: any) {
    console.error('加载邮件包错误：', error)
  } finally {
    loading.value = false
  }
}

// 加载插件定价
const loadPluginPricing = async () => {
  if (!pluginId.value) {
    showMessage(t('paymentPage.missingPluginId'), 'error')
    return
  }
  
  loading.value = true
  try {
    const res = await pluginApi.getPluginPricing(pluginId.value)
    if (res.code === 0) {
      pluginInfo.value = res.data.plugin
      pluginPricing.value = res.data.pricing
    }
  } catch (error: any) {
    console.error('加载插件定价错误：', error)
    showMessage(t('paymentPage.loadPluginPricingFailed'), 'error')
  } finally {
    loading.value = false
  }
}

// 统一购买处理（使用奶片）
const handleBuy = async (item: any) => {
  // 设置确认对话框内容
  if (purchaseType.value === 'plugin') {
    // 检查是否已有套餐
    const hasActivePlan = pluginInfo.value?.user_has_authorization
    
    confirmDialogTitle.value = hasActivePlan ? t('paymentPage.renewPluginTitle') : t('paymentPage.buyPluginTitle')
    let message = t('paymentPage.confirmPluginMessage', {
      name: getDurationName(item.duration_type),
      days: item.duration_days,
      price: Math.floor(item.price)
    })
    
    if (hasActivePlan) {
      message += t('paymentPage.confirmPluginRenewHint')
    }
    
    confirmDialogMessage.value = message
  } else if (purchaseType.value === 'email-package') {
    confirmDialogTitle.value = '购买邮件包'
    confirmDialogMessage.value = `确认购买 ${Number(item.quota).toLocaleString()} 封邮件吗？本次将扣除 ${item.price} 奶片。`
  }
  
  currentBuyingItem.value = item
  showConfirmDialog.value = true
}

// 确认购买
const confirmBuy = async () => {
  const item = currentBuyingItem.value
  if (!item) return
  
  buyingPackageId.value = item.id

  try {
    let res
    
    if (purchaseType.value === 'plugin') {
      // 插件购买 - 使用奶片
      res = await pluginApi.purchaseWithMilkCoins(pluginId.value, item.id)
      
      if (res.code === 0) {
        showMessage(t('paymentPage.buyPluginSuccess'), 'success')
        showConfirmDialog.value = false
        setTimeout(() => {
          router.back()
        }, 1000)
      } else {
        showMessage(res.message || t('paymentPage.buyFailed'), 'error')
      }
    } else if (purchaseType.value === 'email-package') {
      res = await emailReachApi.purchaseQuota({
        quota_count: item.quota
      })

      if (res.code === 0) {
        showMessage('购买成功', 'success')
        showConfirmDialog.value = false
        setTimeout(() => {
          router.push('/user/email-reach/dashboard')
        }, 800)
      } else {
        showMessage(res.message || t('paymentPage.buyFailed'), 'error')
      }
    }
  } catch (error: any) {
    console.error('购买失败：', error)
    showMessage(t('paymentPage.buyFailedWithReason', { reason: error.response?.data?.message || error.message }), 'error')
  } finally {
    buyingPackageId.value = null
  }
}

// 获取套餐显示名称
const getDurationName = (durationType: string) => {
  const map: Record<string, string> = {
    'monthly': t('paymentPage.monthly'),
    'half_yearly': t('paymentPage.halfYearly'),
    'yearly': t('paymentPage.yearly')
  }
  return map[durationType] || durationType
}

onMounted(() => {
  // 加载用户奶片余额
  loadUserMilkCoins()
  
  if (purchaseType.value === 'plugin') {
    loadPluginPricing()
  } else if (purchaseType.value === 'email-package') {
    loadEmailPackages()
  } else {
    router.replace('/user/finance')
  }
})
</script>

<style scoped>
/* 所有样式已使用 Tailwind CSS */
</style>
