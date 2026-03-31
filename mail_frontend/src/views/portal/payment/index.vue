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
      <div v-else-if="(purchaseType === 'mailbox' && packages.length === 0) || (purchaseType === 'plugin' && pluginPricing.length === 0)" class="text-center py-12">
        <div class="text-5xl mb-3">📦</div>
        <p class="text-black">{{ t('paymentPage.noPackages') }}</p>
      </div>

      <!-- 邮箱套餐列表 -->
      <div v-else-if="purchaseType === 'mailbox'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="(pkg, index) in packages"
          :key="pkg.id"
          class="relative bg-white rounded-2xl p-6 transition-all duration-300 transform hover:-translate-y-2 flex flex-col"
          :class="{
            'ring-2 ring-primary-600 shadow-xl hover:shadow-2xl': pkg.package_code === 'MAILBOX_50',
            'border border-gray-200 shadow-md hover:shadow-xl': pkg.package_code !== 'MAILBOX_50'
          }"
        >
          <!-- 推荐标签 -->
          <div v-if="pkg.package_code === 'MAILBOX_50'" 
               class="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-1 rounded-full text-xs font-bold shadow-md">
            ⭐ {{ t('paymentPage.recommended') }}
          </div>

          <!-- 套餐图标 -->
          <div class="flex justify-center mb-4 mt-1">
            <div class="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
              </svg>
            </div>
          </div>

          <!-- 套餐标题 -->
          <div class="text-center mb-3">
            <h3 class="text-lg font-bold text-black mb-2">{{ pkg.package_name }}</h3>
            <div class="inline-flex items-center justify-center bg-primary-100 text-primary-700 px-3 py-1.5 rounded-full text-sm">
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span class="font-semibold">{{ t('paymentPage.mailboxCount', { count: pkg.mailbox_count }) }}</span>
            </div>
          </div>

          <!-- 价格 (奶片) -->
          <div class="text-center mb-4 flex-grow">
            <div class="text-xs text-gray-400 line-through mb-1">{{ t('paymentPage.originalPrice', { price: pkg.original_price }) }}</div>
            <div class="flex items-baseline justify-center mb-2">
              <span class="text-4xl font-extrabold bg-gradient-to-r from-primary-700 to-primary-800 bg-clip-text text-transparent">{{ pkg.sale_price }}</span>
              <span class="text-lg text-primary-600 font-bold ml-1">{{ t('paymentPage.coins') }}</span>
            </div>
            <div class="inline-block bg-primary-100 text-primary-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
              {{ t('paymentPage.discount', { percent: Math.round((1 - pkg.sale_price / pkg.original_price) * 100) }) }}
            </div>
          </div>

          <!-- 描述 -->
          <div class="text-center text-black text-sm mb-4 pb-4 border-b border-gray-100">
            <p>{{ pkg.description }}</p>
          </div>

          <!-- 特性列表 -->
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

          <!-- 购买按钮 -->
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

    <!-- 支付弹窗 -->
    <div v-if="payDialogVisible" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm" @click="closePayDialog">
      <div class="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-2xl transform transition-all" @click.stop>
        <!-- 弹窗头部 -->
        <div class="bg-gradient-to-r from-[#1677FF] to-[#0D5FD9] text-white px-6 py-5 rounded-t-2xl">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-3">
              <img src="@/assets/img/zhi-white.svg" :alt="t('paymentPage.alipay')" class="w-10 h-10" />
              <div>
                <h3 class="text-xl font-bold">{{ t('paymentPage.alipayTitle') }}</h3>
                <p class="text-xs text-blue-100 mt-0.5">{{ t('paymentPage.alipayHint') }}</p>
              </div>
            </div>
            <button @click="closePayDialog" class="text-white/80 hover:text-white text-3xl w-8 h-8 flex items-center justify-center transition-colors">
              ×
            </button>
          </div>
        </div>
        
        <!-- 弹窗内容 -->
        <div class="px-6 py-6">
          <!-- 订单信息 -->
          <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 mb-5 border border-gray-200">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm text-gray-500 mb-1">{{ purchaseType === 'plugin' ? currentOrder?.plugin_name : currentOrder?.package?.package_name }}</div>
                <div class="flex items-baseline">
                  <span class="text-4xl font-extrabold text-success-600">{{ Math.floor(currentOrder?.amount) }}</span>
                  <span class="text-2xl text-success-600 font-bold ml-1">{{ t('paymentPage.coins') }}</span>
                </div>
              </div>
              <div class="text-xs text-gray-500">
                <div>{{ t('paymentPage.orderNo') }}</div>
                <div class="font-mono mt-1">{{ currentOrder?.order_no?.slice(-12) }}</div>
              </div>
            </div>
          </div>

          <!-- 二维码显示区域 -->
          <div class="mb-5">
            <div class="flex justify-center bg-white p-6 rounded-xl border-2 border-success-200 shadow-inner">
              <canvas ref="qrcodeCanvas"></canvas>
            </div>
            <div class="text-center mt-4">
              <div class="flex items-center justify-center gap-2 mb-2">
                <img src="@/assets/img/zhi.svg" :alt="t('paymentPage.alipay')" class="h-5 w-5" />
                <span class="text-sm font-medium text-gray-700">{{ t('paymentPage.alipayScan') }}</span>
              </div>
              <div class="text-xs text-gray-400">{{ t('paymentPage.alipayScanHint') }}</div>
            </div>
          </div>
        </div>

        <!-- 弹窗底部 -->
        <div class="px-6 py-5 bg-gray-50 rounded-b-2xl border-t border-gray-200">
          <div class="flex gap-3">
            <button @click="closePayDialog" class="flex-1 h-12 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition-colors">
              {{ t('common.cancel') }}
            </button>
            <button @click="checkPayment" :disabled="checking" class="flex-1 h-12 bg-gradient-to-r from-success-600 to-success-700 hover:from-success-500 hover:to-success-600 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50">
              <div v-if="checking" class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ checking ? t('paymentPage.checking') : t('paymentPage.paid') }}
            </button>
          </div>
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
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import api from '@/services/api'
import pluginApi from '@/api/plugin'
import { showMessage } from '@/utils/message'
import QRCode from 'qrcode'

interface Package {
  id: number
  package_code: string
  package_name: string
  mailbox_count: number
  original_price: number
  sale_price: number
  description: string
  sort_order: number
}

interface PluginPricing {
  id: number
  duration_type: string
  duration_days: number
  price: number
  original_price: number
  sort_order: number
  discount: number
}

interface CurrentOrder {
  order_id: number
  order_no: string
  amount: number
  package?: Package
  plugin_name?: string
  duration_days?: number
  pay_url: string
}

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const packages = ref<Package[]>([])
const pluginPricing = ref<PluginPricing[]>([])
const pluginInfo = ref<any>(null)
const loading = ref(true)
const buyingPackageId = ref<number | null>(null)
const payDialogVisible = ref(false)
const currentOrder = ref<CurrentOrder | null>(null)
const qrcodeCanvas = ref<HTMLCanvasElement | null>(null)
const checking = ref(false)
let pollingTimer: number | null = null
const userMilkCoins = ref(0)
const showConfirmDialog = ref(false)
const confirmDialogTitle = ref('')
const confirmDialogMessage = ref('')
const currentBuyingItem = ref<any>(null)

// 购买类型：mailbox 或 plugin
const purchaseType = computed(() => route.query.type || 'mailbox')
const pluginId = computed(() => route.query.id as string)

// 页面标题
const pageTitle = computed(() => {
  if (purchaseType.value === 'plugin') {
    return pluginInfo.value?.name || t('paymentPage.choosePluginPlan')
  }
  return t('paymentPage.choosePackage')
})

const pageSubtitle = computed(() => {
  if (purchaseType.value === 'plugin') {
    return t('paymentPage.pluginSubtitle')
  }
  return t('paymentPage.mailboxSubtitle')
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

// 加载邮箱套餐列表
const loadMailboxPackages = async () => {
  loading.value = true
  try {
    const res = await api.get('/payment/packages')
    if (res.code === 0) {
      packages.value = res.data.packages
    }
  } catch (error: any) {
    console.error('加载套餐错误：', error)
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

// 生成二维码
const generateQRCode = async () => {
  setTimeout(async () => {
    if (qrcodeCanvas.value && currentOrder.value?.pay_url) {
      try {
        await QRCode.toCanvas(qrcodeCanvas.value, currentOrder.value.pay_url, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        })
      } catch (error) {
        console.error('生成二维码失败：', error)
      }
    }
  }, 100)
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
  } else {
    confirmDialogTitle.value = t('paymentPage.buyMailboxTitle')
    confirmDialogMessage.value = t('paymentPage.confirmMailboxMessage', {
      name: item.package_name,
      count: item.mailbox_count,
      price: Math.floor(item.sale_price)
    })
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
    } else {
      // 邮箱套餐购买 - 使用奶片
      res = await api.post('/payment/purchase-with-milk-coins', {
        package_id: item.id
      })
      
      if (res.code === 0) {
        showMessage(t('paymentPage.buyMailboxSuccess'), 'success')
        showConfirmDialog.value = false
        setTimeout(() => {
          router.push('/')
        }, 1000)
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

// 开始轮询支付状态
const startPolling = () => {
  // 清除旧的定时器
  if (pollingTimer) {
    clearInterval(pollingTimer)
  }
  
  // 每3秒查询一次
  pollingTimer = window.setInterval(async () => {
    if (!currentOrder.value?.order_no || checking.value) return
    
    try {
      const res = await api.post('/payment/query-order', {
        order_no: currentOrder.value.order_no
      })
      
      if (res.code === 0 && res.data.status === 'paid') {
        // 支付成功
        stopPolling()
        handlePaymentSuccess()
      }
    } catch (error) {
      console.error('轮询查询支付状态失败：', error)
    }
  }, 3000)
}

// 停止轮询
const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

// 支付成功处理
const handlePaymentSuccess = () => {
  // 关闭支付弹窗
  payDialogVisible.value = false
  
  // 显示成功提示
  if (purchaseType.value === 'plugin') {
    showMessage(t('paymentPage.paymentPluginSuccess', {
      days: currentOrder.value?.duration_days,
      name: currentOrder.value?.plugin_name
    }), 'success')
  } else {
    showMessage(t('paymentPage.paymentMailboxSuccess', {
      count: currentOrder.value?.package?.mailbox_count
    }), 'success')
  }
  
  // 等待 2 秒后跳转
  setTimeout(() => {
    // 根据购买类型跳转到不同页面
    if (purchaseType.value === 'plugin') {
      router.push('/plugins')  // 跳转到我的插件页面
    } else {
      router.push('/mailboxes')  // 跳转到邮箱列表页面
    }
  }, 2000)
}

// 关闭支付弹窗
const closePayDialog = () => {
  stopPolling()
  payDialogVisible.value = false
  currentOrder.value = null
}

// 查询支付状态（手动触发）
const checkPayment = async () => {
  if (!currentOrder.value?.order_no) return
  
  checking.value = true
  try {
    const res = await api.post('/payment/query-order', {
      order_no: currentOrder.value.order_no
    })
    
    if (res.code === 0) {
      if (res.data.status === 'paid') {
        // 支付成功
        stopPolling()
        handlePaymentSuccess()
      } else {
        showMessage(t('paymentPage.paymentNotFound'), 'warning')
      }
    } else {
      showMessage(res.message || t('paymentPage.queryFailed'), 'error')
    }
  } catch (error: any) {
    console.error('查询支付状态失败：', error)
    showMessage(t('paymentPage.queryFailed'), 'error')
  } finally {
    checking.value = false
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
  } else {
    loadMailboxPackages()
  }
})

onUnmounted(() => {
  // 清理定时器
  stopPolling()
})
</script>

<style scoped>
/* 所有样式已使用 Tailwind CSS */
</style>
