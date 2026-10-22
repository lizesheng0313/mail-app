<template>
  <!-- 购买对话框 -->
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="$emit('close')">
    <div class="relative top-10 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-lg bg-white" @click.stop>
      <!-- 头部 -->
      <div class="flex items-start justify-between pb-4 border-b border-gray-200">
        <div class="flex items-center space-x-3">
          <PluginIcon :plugin-id="plugin.plugin_id" size="md" />
          <div>
            <h3 class="text-lg font-semibold text-black">购买插件 - {{ plugin.name }}</h3>
            <p class="text-sm text-black mt-1">{{ plugin.description }}</p>
          </div>
        </div>
        <button @click="$emit('close')" class="text-gray-400 hover:text-black">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="py-12 flex justify-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>

      <!-- 定价选择 -->
      <div v-else class="py-6 space-y-6">
        <!-- 选择套餐 -->
        <div>
          <h4 class="text-sm font-medium text-black mb-4">选择购买时长</h4>
          <div class="grid grid-cols-1 gap-4">
            <div
              v-for="pricing in pricingList"
              :key="pricing.id"
              @click="selectedPricing = pricing"
              :class="[
                'relative border-2 rounded-lg p-4 cursor-pointer transition-all',
                selectedPricing?.id === pricing.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              ]"
            >
              <!-- 推荐标签 -->
              <div v-if="pricing.duration_type === 'yearly'" class="absolute -top-3 right-4 px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded">
                最划算
              </div>
              
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-3">
                    <!-- 选中圆圈 -->
                    <div :class="[
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                      selectedPricing?.id === pricing.id
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300'
                    ]">
                      <svg v-if="selectedPricing?.id === pricing.id" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </div>
                    
                    <!-- 时长信息 -->
                    <div>
                      <h5 class="text-base font-semibold text-black">
                        {{ getDurationLabel(pricing.duration_type) }}
                      </h5>
                      <p class="text-xs text-black">{{ pricing.duration_days }} 天有效期</p>
                    </div>
                  </div>
                </div>
                
                <!-- 价格 -->
                <div class="text-right">
                  <div class="flex items-baseline space-x-2">
                    <span v-if="pricing.original_price && pricing.original_price > pricing.price" class="text-sm text-gray-400 line-through">
                      {{ Math.floor(pricing.original_price) }}奶片
                    </span>
                    <span class="text-2xl font-bold text-red-600">
                      {{ Math.floor(pricing.price) }}奶片
                    </span>
                  </div>
                  <div v-if="pricing.discount > 0" class="mt-1">
                    <span class="inline-block px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded">
                      省 {{ pricing.discount }}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 支付方式选择 -->
        <div>
          <h4 class="text-sm font-medium text-black mb-4">选择支付方式</h4>
          <div class="grid grid-cols-2 gap-4">
            <!-- PC支付 -->
            <div
              @click="paymentMethod = 'pc'"
              :class="[
                'border-2 rounded-lg p-4 cursor-pointer transition-all',
                paymentMethod === 'pc'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              ]"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div :class="[
                    'w-4 h-4 rounded-full border-2',
                    paymentMethod === 'pc' ? 'border-primary-500 bg-primary-500' : 'border-gray-300'
                  ]">
                    <svg v-if="paymentMethod === 'pc'" class="w-2 h-2 text-white ml-0.5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <circle cx="6" cy="6" r="3" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-black">PC网站支付</p>
                    <p class="text-xs text-black">跳转支付宝页面</p>
                  </div>
                </div>
                <img src="https://gw.alipayobjects.com/mdn/rms_08e378/afts/img/A*ujPbT7YRJ9wAAAAAAAAAAAAAARQnAQ" alt="支付宝" class="h-8">
              </div>
            </div>

            <!-- 扫码支付 -->
            <div
              @click="paymentMethod = 'qr'"
              :class="[
                'border-2 rounded-lg p-4 cursor-pointer transition-all',
                paymentMethod === 'qr'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              ]"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div :class="[
                    'w-4 h-4 rounded-full border-2',
                    paymentMethod === 'qr' ? 'border-primary-500 bg-primary-500' : 'border-gray-300'
                  ]">
                    <svg v-if="paymentMethod === 'qr'" class="w-2 h-2 text-white ml-0.5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <circle cx="6" cy="6" r="3" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-black">扫码支付</p>
                    <p class="text-xs text-black">使用支付宝扫码</p>
                  </div>
                </div>
                <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- 订单信息 -->
        <div v-if="selectedPricing" class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 class="text-sm font-medium text-black mb-3">订单信息</h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-black">插件名称</span>
              <span class="text-black font-medium">{{ plugin.name }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-black">购买时长</span>
              <span class="text-black font-medium">{{ getDurationLabel(selectedPricing.duration_type) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-black">有效天数</span>
              <span class="text-black font-medium">{{ selectedPricing.duration_days }} 天</span>
            </div>
            <div class="flex justify-between pt-2 border-t border-gray-200">
              <span class="text-black font-semibold">支付金额</span>
              <span class="text-2xl font-bold text-red-600">{{ Math.floor(selectedPricing.price) }}奶片</span>
            </div>
          </div>
        </div>

        <!-- 支付按钮 -->
        <div class="flex space-x-3">
          <button
            @click="$emit('close')"
            class="flex-1 px-4 py-3 border border-gray-300 text-black rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            @click="handlePurchase"
            :disabled="!selectedPricing || purchasing"
            class="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ purchasing ? '处理中...' : '立即购买' }}
          </button>
        </div>
      </div>

      <div v-if="currentOrderNo && !showQrCode" class="mt-4 text-center">
        <button class="btn-primary px-4 py-2 disabled:opacity-50" :disabled="checkingStatus" @click="checkPaymentStatus">
          {{ checkingStatus ? '查询中…' : '已支付，查询结果' }}
        </button>
      </div>

      <!-- 二维码支付对话框 -->
      <div v-if="showQrCode" class="absolute inset-0 bg-white rounded-lg flex items-center justify-center">
        <div class="text-center">
          <div class="flex items-center justify-center gap-2 mb-4">
            <img src="@/assets/img/zhi.svg" alt="支付宝" class="w-8 h-8" />
            <h3 class="text-lg font-semibold text-black">请使用支付宝扫码支付</h3>
          </div>
          <div class="mb-4 p-4 bg-white border-2 border-gray-200 rounded-lg inline-block">
            <img :src="qrCodeUrl" alt="支付二维码" class="w-64 h-64">
          </div>
          <div class="flex items-center justify-center gap-2 mb-2">
            <img src="@/assets/img/zhi.svg" alt="支付宝" class="w-5 h-5" />
            <span class="text-sm text-gray-600">打开支付宝 APP 扫描上方二维码</span>
          </div>
          <p class="text-sm text-black mb-2">订单金额：<span class="text-xl font-bold text-red-600">{{ Math.floor(selectedPricing?.price) }}奶片</span></p>
          <p class="text-xs text-black mb-4">请在15分钟内完成支付</p>
          <div class="flex space-x-3 justify-center">
            <button
              @click="checkPaymentStatus"
              :disabled="checkingStatus"
              class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {{ checkingStatus ? '查询中...' : '我已完成支付' }}
            </button>
            <button
              @click="cancelPayment"
              class="px-4 py-2 border border-gray-300 text-black rounded-md hover:bg-gray-50 transition-colors"
            >
              取消支付
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import PluginIcon from '@/components/PluginIcon/index.vue'
import { pluginApi } from '@/api/plugin'
import { showMessage } from '@/utils/message'

const props = defineProps({
  plugin: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'success'])

const loading = ref(true)
const pricingList = ref([])
const selectedPricing = ref(null)
const paymentMethod = ref('pc')
const purchasing = ref(false)
const showQrCode = ref(false)
const qrCodeUrl = ref('')
const currentOrderNo = ref('')
const checkingStatus = ref(false)

// 获取时长标签
const getDurationLabel = (type) => {
  const labels = {
    monthly: '包月套餐',
    half_yearly: '半年套餐',
    yearly: '年度套餐',
    lifetime: '永久授权'
  }
  return labels[type] || type
}

// 获取定价列表
const fetchPricing = async () => {
  try {
    loading.value = true
    const response = await pluginApi.getPluginPricing(props.plugin.plugin_id)
    
    if (response.code === 0) {
      pricingList.value = response.data.pricing
      // 默认选中第一个
      if (pricingList.value.length > 0) {
        selectedPricing.value = pricingList.value[0]
      }
    } else {
      showMessage(response.message, 'error')
    }
  } catch (error) {
    showMessage('获取定价失败', 'error')
  } finally {
    loading.value = false
  }
}

// 处理购买
const handlePurchase = async () => {
  if (!selectedPricing.value) {
    showMessage('请选择购买时长', 'warning')
    return
  }
  
  try {
    purchasing.value = true
    
    if (paymentMethod.value === 'pc') {
      // PC网站支付
      const response = await pluginApi.createPluginOrder(
        props.plugin.plugin_id,
        selectedPricing.value.id
      )
      
      if (response.code === 0) {
        currentOrderNo.value = response.data.order_no
        // 跳转到支付宝页面
        window.open(response.data.pay_url, '_blank')
        
        // 提示用户
        showMessage('订单已创建，请在新窗口完成支付', 'success')
        
      } else {
        showMessage(response.message || '创建订单失败', 'error')
      }
    } else {
      // 二维码支付
      const response = await pluginApi.createPluginQrOrder(
        props.plugin.plugin_id,
        selectedPricing.value.id
      )
      
      if (response.code === 0) {
        currentOrderNo.value = response.data.order_no
        qrCodeUrl.value = response.data.qr_code
        showQrCode.value = true
      } else {
        showMessage(response.message || '创建订单失败', 'error')
      }
    }
    
  } catch (error) {
    showMessage('创建订单失败', 'error')
  } finally {
    purchasing.value = false
  }
}

// 检查支付状态
const checkPaymentStatus = async () => {
  const orderNo = currentOrderNo.value
  if (!orderNo || checkingStatus.value) return
  
  try {
    checkingStatus.value = true
    const response = await pluginApi.queryPluginOrder(orderNo)
    
    if (orderNo !== currentOrderNo.value) return
    if (response.code !== 0) return false
    if (response.code === 0) {
      if (response.data.status === 'paid') {
        currentOrderNo.value = ''
        // 支付成功
        
        showMessage('支付成功！插件已开通', 'success')
        emit('success')
        emit('close')
      }
    }
  } catch (error) {
    console.error('查询订单状态失败:', error)
    return false
  } finally {
    checkingStatus.value = false
  }
}

// 取消支付
const cancelPayment = () => {
  showQrCode.value = false
  qrCodeUrl.value = ''
  currentOrderNo.value = ''
}

// 打开时加载价格
onMounted(() => {
  fetchPricing()
})

</script>
