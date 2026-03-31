<template>
  <div>
    <!-- 顶部导航 -->
    <PageHeader />
    
    <div class="p-6">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h1 style="font-size: 14px;" class="font-bold text-black">{{ t('proxyPage.title') }}</h1>
      <p class="mt-1 text-sm text-black">{{ t('proxyPage.subtitle') }}</p>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-black">{{ t('proxyPage.availableProxies') }}</p>
            <p style="font-size: 14px;" class="font-semibold text-black">{{ stats.total_proxies || 0 }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-black">{{ t('proxyPage.dailyUsage') }}</p>
            <p style="font-size: 14px;" class="font-semibold text-black">{{ stats.daily_usage || 0 }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-black">{{ t('proxyPage.avgResponse') }}</p>
            <p style="font-size: 14px;" class="font-semibold text-black">{{ Math.round(stats.avg_response_time || 0) }}ms</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-black">{{ t('proxyPage.successRate') }}</p>
            <p style="font-size: 14px;" class="font-semibold text-black">{{ Math.round(stats.success_rate || 0) }}%</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 左侧：代理池列表 -->
      <div class="lg:col-span-2">
        <div class="bg-white rounded-lg shadow">
            <div class="px-6 py-4 border-b border-gray-200">
            <h3 style="font-size: 14px;" class="font-medium text-black">{{ t('proxyPage.poolTitle') }}</h3>
          </div>
          <div class="p-6">
            <div v-if="loading" class="text-center py-8">
              <div class="inline-flex items-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-500" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ t('proxyPage.loading') }}
              </div>
            </div>

            <div v-else-if="proxyPools.length === 0" class="text-center py-8">
              <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 class="mt-2 text-sm font-medium text-black">{{ t('proxyPage.noPools') }}</h3>
              <p class="mt-1 text-sm text-black">{{ t('proxyPage.noPoolsDesc') }}</p>
            </div>

            <div v-else class="space-y-4">
              <div
                v-for="pool in proxyPools"
                :key="pool.id"
                class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="text-sm font-medium text-black">{{ pool.pool_name }}</h4>
                    <p class="text-sm text-black">{{ pool.provider || t('proxyPage.unknownProvider') }}</p>
                  </div>
                  <div class="flex items-center space-x-4 text-sm text-black">
                    <span>{{ pool.pool_type.toUpperCase() }}</span>
                    <span>{{ t('proxyPage.proxyCount', { count: pool.proxy_count || 0 }) }}</span>
                    <span
                      class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                      :class="pool.is_active ? 'bg-primary-100 text-success-800' : 'bg-red-100 text-red-800'"
                    >
                      {{ pool.is_active ? t('proxyPage.active') : t('proxyPage.inactive') }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：代理策略设置 -->
      <div class="lg:col-span-1">
        <div class="bg-white rounded-lg shadow">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 style="font-size: 14px;" class="font-medium text-black">{{ t('proxyPage.strategyTitle') }}</h3>
          </div>
          <div class="p-6">
            <form @submit.prevent="updateStrategy">
              <div class="space-y-4">
                <!-- IP重用策略 -->
                <div>
                  <label class="block text-sm font-medium text-black mb-2">
                    {{ t('proxyPage.ipReusePolicy') }}
                  </label>
                  <CustomSelect
                    v-model="strategy.ip_reuse_policy"
                    :options="reuseOptions"
                    :placeholder="t('proxyPage.chooseReusePolicy')"
                  />
                </div>

                <!-- 时间间隔设置 -->
                <div v-if="strategy.ip_reuse_policy === 'time_based'">
                  <label class="block text-sm font-medium text-black mb-2">
                    {{ t('proxyPage.reuseIntervalHours') }}
                  </label>
                  <input
                    v-model.number="strategy.reuse_interval_hours"
                    type="number"
                    min="1"
                    max="8760"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                  <p class="mt-1 text-xs text-black">
                    {{ t('proxyPage.currentDays', { days: Math.round(strategy.reuse_interval_hours / 24) }) }}
                  </p>
                </div>

                <!-- 次数限制设置 -->
                <div v-if="strategy.ip_reuse_policy === 'count_based'">
                  <label class="block text-sm font-medium text-black mb-2">
                    {{ t('proxyPage.maxReuseCount') }}
                  </label>
                  <input
                    v-model.number="strategy.max_reuse_count"
                    type="number"
                    min="1"
                    max="100"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                </div>

                <!-- 质量要求 -->
                <div>
                  <label class="block text-sm font-medium text-black mb-2">
                    {{ t('proxyPage.minSuccessRate') }}
                  </label>
                  <input
                    v-model.number="strategy.min_success_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                </div>

                <!-- 并发限制 -->
                <div>
                  <label class="block text-sm font-medium text-black mb-2">
                    {{ t('proxyPage.concurrentLimit') }}
                  </label>
                  <input
                    v-model.number="strategy.concurrent_limit"
                    type="number"
                    min="1"
                    max="20"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                </div>

                <!-- 每日限制 -->
                <div>
                  <label class="block text-sm font-medium text-black mb-2">
                    {{ t('proxyPage.dailyLimit') }}
                  </label>
                  <input
                    v-model.number="strategy.daily_limit"
                    type="number"
                    min="1"
                    max="10000"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                </div>

                <!-- 保存按钮 -->
                <div class="pt-4">
                  <button
                    type="submit"
                    :disabled="updating"
                    class="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {{ updating ? t('proxyPage.saving') : t('proxyPage.save') }}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/PageHeader/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import { proxyApi } from '@/api/proxy'
import { showMessage } from '@/utils/message'
const { t } = useI18n()

// 响应式数据
const loading = ref(false)
const updating = ref(false)
const stats = ref({})
const proxyPools = ref([])
const strategy = ref({
  strategy_name: 'default',
  ip_reuse_policy: 'time_based',
  reuse_interval_hours: 72,
  max_reuse_count: 10,
  min_success_rate: 80.0,
  concurrent_limit: 3,
  daily_limit: 1000
})

// 重用策略选项
const reuseOptions = computed(() => [
  { label: t('proxyPage.noReuse'), value: 'no_reuse' },
  { label: t('proxyPage.timeBased'), value: 'time_based' },
  { label: t('proxyPage.countBased'), value: 'count_based' },
  { label: t('proxyPage.customStrategy'), value: 'custom' }
])

// 方法
const fetchStats = async () => {
  try {
    const response = await proxyApi.getProxyStats()
    stats.value = response.data || {}
  } catch (error) {
    console.error('获取代理统计失败:', error)
  }
}

const fetchProxyPools = async () => {
  try {
    loading.value = true
    const response = await proxyApi.getProxyPools()
    proxyPools.value = response.data?.pools || []
  } catch (error) {
    console.error('获取代理池失败:', error)
    showMessage(t('proxyPage.loadPoolsFailed'), 'error')
  } finally {
    loading.value = false
  }
}

const fetchStrategy = async () => {
  try {
    const response = await proxyApi.getUserProxyStrategy()
    if (response.data) {
      strategy.value = { ...strategy.value, ...response.data }
    }
  } catch (error) {
    console.error('获取代理策略失败:', error)
  }
}

const updateStrategy = async () => {
  try {
    updating.value = true
    await proxyApi.updateUserProxyStrategy(strategy.value)
    showMessage(t('proxyPage.updateSuccess'), 'success')
  } catch (error) {
    console.error('更新代理策略失败:', error)
    showMessage(t('proxyPage.updateFailed'), 'error')
  } finally {
    updating.value = false
  }
}

// 生命周期
onMounted(() => {
  fetchStats()
  fetchProxyPools()
  fetchStrategy()
})
</script>
