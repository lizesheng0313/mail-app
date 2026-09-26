<template>
  <div class="fixed inset-0 z-50 h-full w-full overflow-y-auto bg-gray-600 bg-opacity-50 p-3">
    <div class="relative mx-auto my-4 max-h-[calc(100dvh-2rem)] w-full max-w-4xl overflow-y-auto rounded-md border bg-white p-4 shadow-lg sm:my-10 sm:p-5">
      <div class="mt-3">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-black">
            代理统计 - {{ proxy?.name }}
          </h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-black">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="loading" class="text-center py-8">
          <div class="inline-flex items-center">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            加载统计数据中...
          </div>
        </div>

        <div v-else>
          <!-- 基本信息 -->
          <div class="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 class="text-md font-medium text-black mb-3">基本信息</h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div class="text-sm text-black">代理地址</div>
                <div class="text-sm font-medium text-black">{{ proxy?.ip }}:{{ proxy?.port }}</div>
              </div>
              <div>
                <div class="text-sm text-black">供应商</div>
                <div class="text-sm font-medium text-black">{{ proxy?.provider || '未设置' }}</div>
              </div>
              <div>
                <div class="text-sm text-black">地理位置</div>
                <div class="text-sm font-medium text-black">{{ proxy?.location || '未设置' }}</div>
              </div>
              <div>
                <div class="text-sm text-black">创建时间</div>
                <div class="text-sm font-medium text-black">{{ formatTime(proxy?.created_at) }}</div>
              </div>
            </div>
          </div>

          <!-- 使用统计 -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div class="bg-white border border-gray-200 rounded-lg p-4">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div class="ml-4">
                  <div class="text-sm font-medium text-black">总配额</div>
                  <div class="text-2xl font-bold text-black">{{ stats.total_quota || 0 }}</div>
                </div>
              </div>
            </div>

            <div class="bg-white border border-gray-200 rounded-lg p-4">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-6 w-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div class="ml-4">
                  <div class="text-sm font-medium text-black">已使用</div>
                  <div class="text-2xl font-bold text-black">{{ stats.used_count || 0 }}</div>
                </div>
              </div>
            </div>

            <div class="bg-white border border-gray-200 rounded-lg p-4">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-6 w-6 text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div class="ml-4">
                  <div class="text-sm font-medium text-black">剩余配额</div>
                  <div class="text-2xl font-bold text-black">{{ stats.remaining_count || 0 }}</div>
                </div>
              </div>
            </div>

            <div class="bg-white border border-gray-200 rounded-lg p-4">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div class="ml-4">
                  <div class="text-sm font-medium text-black">成功率</div>
                  <div class="text-2xl font-bold text-black">{{ formatSuccessRate(stats.success_rate) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 配额使用进度 -->
          <div class="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <h4 class="text-md font-medium text-black mb-3">配额使用进度</h4>
            <div class="w-full bg-gray-200 rounded-full h-4">
              <div 
                class="bg-gradient-to-r from-primary-600 to-primary-700 h-4 rounded-full" 
                :style="`width: ${getUsagePercentage()}%`"
              ></div>
            </div>
            <div class="flex justify-between text-sm text-black mt-2">
              <span>已使用：{{ stats.used_count || 0 }}</span>
              <span>{{ getUsagePercentage() }}%</span>
              <span>总配额：{{ stats.total_quota || 0 }}</span>
            </div>
          </div>

          <!-- 详细统计 -->
          <div class="bg-white border border-gray-200 rounded-lg p-4">
            <h4 class="text-md font-medium text-black mb-3">详细统计</h4>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-sm text-black">总请求次数</div>
                <div class="text-lg font-medium text-black">{{ stats.total_logs || 0 }}</div>
              </div>
              <div>
                <div class="text-sm text-black">成功请求次数</div>
                <div class="text-lg font-medium text-black">{{ stats.success_logs || 0 }}</div>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex justify-end mt-6">
            <button
              @click="$emit('close')"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-black hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { paidProxyApi } from '@/api/proxy'
import { formatTimestamp } from '@/utils/timeUtils'

const props = defineProps({
  proxy: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])

const loading = ref(false)
const stats = ref({})

onMounted(() => {
  loadStats()
})

const loadStats = async () => {
  loading.value = true
  try {
    const response = await paidProxyApi.getUsageStats(props.proxy.id)
    if (response.code === 0) {
      stats.value = response.data || {}
    }
  } catch (error) {
    console.error('获取代理统计失败:', error)
  } finally {
    loading.value = false
  }
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  return formatTimestamp(timestamp, 'datetime')
}

const formatSuccessRate = (rate) => {
  if (typeof rate !== 'number') return '0%'
  return `${(rate * 100).toFixed(1)}%`
}

const getUsagePercentage = () => {
  const total = stats.value.total_quota || 0
  const used = stats.value.used_count || 0
  if (total === 0) return 0
  return Math.min(100, (used / total * 100).toFixed(1))
}
</script>
