<template>
  <div class="flex flex-col h-full">
    <!-- 主要内容 -->
    <div class="flex-1 overflow-y-auto space-y-6">
      
      <!-- 爬虫监控组件 -->
      <CrawlerMonitor ref="crawlerMonitorRef" />

      <!-- 概览卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- 今日收到邮件 -->
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-black">今日收到邮件</p>
              <p class="text-2xl font-bold text-black">{{ overview.today_stats?.received_emails || 0 }}</p>
              <p class="text-xs" :class="getGrowthClass(overview.growth_rates?.received_emails)">
                {{ formatGrowthRate(overview.growth_rates?.received_emails) }}
              </p>
            </div>
            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
              </svg>
            </div>
          </div>
        </div>

        <!-- 用户注册数 -->
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-black">今日用户注册数</p>
              <p class="text-2xl font-bold text-black">{{ overview.today_stats?.new_users || 0 }}</p>
              <p class="text-xs" :class="getGrowthClass(overview.growth_rates?.new_users)">
                {{ formatGrowthRate(overview.growth_rates?.new_users) }}
              </p>
            </div>
            <div class="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
              </svg>
            </div>
          </div>
        </div>
       
        <!-- 总用户数 -->
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-black">总用户数</p>
              <p class="text-2xl font-bold text-black">{{ formatNumber(overview.totals?.total_users) }}</p>
              <p class="text-xs text-black">累计注册</p>
            </div>
            <div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
          </div>
        </div>

        <!-- 平均申请数 -->
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-black">平均申请数</p>
              <p class="text-2xl font-bold text-black">{{ formatNumber(userStats.today_user_apply_stats?.avg_mailboxes_per_person) }}</p>
              <p class="text-xs text-black">个/人</p>
            </div>
            <div class="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-black">业务监控</h3>
          <CustomSelect
            v-model="businessStatsDays"
            :options="[
              { value: '7', label: '最近7天' },
              { value: '14', label: '最近14天' },
              { value: '30', label: '最近30天' }
            ]"
            @update:modelValue="loadBusinessStats"
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div class="rounded-lg bg-orange-50 border border-orange-100 p-4">
            <p class="text-sm text-black">当前在线人数</p>
            <p class="mt-2 text-2xl font-bold text-black">{{ businessStats.summary?.online_users_now || 0 }}</p>
            <p class="mt-1 text-xs text-black">
              桌面端 {{ businessStats.summary?.desktop_online_users_now || 0 }} / Web {{ businessStats.summary?.web_online_users_now || 0 }}
            </p>
          </div>

          <div class="rounded-lg bg-blue-50 border border-blue-100 p-4">
            <p class="text-sm text-black">桌面端今日使用人数</p>
            <p class="mt-2 text-2xl font-bold text-black">{{ businessStats.summary?.desktop_active_users_today || 0 }}</p>
            <p class="mt-1 text-xs text-black">按日去重</p>
          </div>

          <div class="rounded-lg bg-emerald-50 border border-emerald-100 p-4">
            <p class="text-sm text-black">域名邮箱使用人数</p>
            <p class="mt-2 text-2xl font-bold text-black">{{ businessStats.summary?.hosted_enabled_users || 0 }}</p>
            <p class="mt-1 text-xs text-black">已启用邮箱用户</p>
          </div>

          <div class="rounded-lg bg-violet-50 border border-violet-100 p-4">
            <p class="text-sm text-black">API 今日使用人数</p>
            <p class="mt-2 text-2xl font-bold text-black">{{ businessStats.summary?.api_active_users_today || 0 }}</p>
            <p class="mt-1 text-xs text-black">调用量 {{ businessStats.summary?.api_calls_today || 0 }}</p>
          </div>

          <div class="rounded-lg bg-cyan-50 border border-cyan-100 p-4">
            <p class="text-sm text-black">域名邮箱今日收件</p>
            <p class="mt-2 text-2xl font-bold text-black">{{ businessStats.summary?.hosted_received_today || 0 }}</p>
            <p class="mt-1 text-xs text-black">用户数 {{ businessStats.summary?.hosted_enabled_users || 0 }}</p>
          </div>

          <div class="rounded-lg bg-fuchsia-50 border border-fuchsia-100 p-4">
            <p class="text-sm text-black">第三方邮箱今日收件</p>
            <p class="mt-2 text-2xl font-bold text-black">{{ businessStats.summary?.external_received_today || 0 }}</p>
            <p class="mt-1 text-xs text-black">使用人数 {{ businessStats.summary?.external_enabled_users || 0 }}</p>
          </div>

          <div class="rounded-lg bg-amber-50 border border-amber-100 p-4">
            <p class="text-sm text-black">临时邮箱今日收件</p>
            <p class="mt-2 text-2xl font-bold text-black">{{ businessStats.summary?.system_received_today || 0 }}</p>
            <p class="mt-1 text-xs text-black">使用人数 {{ businessStats.summary?.system_enabled_users || 0 }}</p>
          </div>

          <div class="rounded-lg bg-slate-50 border border-slate-100 p-4">
            <p class="text-sm text-black">API 已启用用户</p>
            <p class="mt-2 text-2xl font-bold text-black">{{ businessStats.summary?.api_enabled_users || 0 }}</p>
            <p class="mt-1 text-xs text-black">今日活跃 Key {{ businessStats.summary?.api_active_keys_today || 0 }}</p>
          </div>
        </div>

        <div v-if="businessStats.trend?.length" class="mt-6 overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-black">日期</th>
                <th class="px-4 py-3 text-left font-medium text-black">桌面端人数</th>
                <th class="px-4 py-3 text-left font-medium text-black">域名收件</th>
                <th class="px-4 py-3 text-left font-medium text-black">第三方收件</th>
                <th class="px-4 py-3 text-left font-medium text-black">临时收件</th>
                <th class="px-4 py-3 text-left font-medium text-black">API 调用</th>
                <th class="px-4 py-3 text-left font-medium text-black">API 用户</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 bg-white">
              <tr v-for="item in businessStats.trend || []" :key="item.date">
                <td class="px-4 py-3 text-black">{{ item.date }}</td>
                <td class="px-4 py-3 text-black">{{ item.desktop_active_users || 0 }}</td>
                <td class="px-4 py-3 text-black">{{ item.hosted_received || 0 }}</td>
                <td class="px-4 py-3 text-black">{{ item.external_received || 0 }}</td>
                <td class="px-4 py-3 text-black">{{ item.system_received || 0 }}</td>
                <td class="px-4 py-3 text-black">{{ item.api_calls || 0 }}</td>
                <td class="px-4 py-3 text-black">{{ item.api_active_users || 0 }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-else
          class="mt-6 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500"
        >
          最近 {{ businessStatsDays }} 天暂无业务趋势数据
        </div>
      </div>

      <!-- 图表区域 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- 用户趋势图 -->
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-black">用户注册趋势</h3>
            <CustomSelect
              v-model="userStatsDays"
              :options="[
                { value: '7', label: '最近7天' },
                { value: '14', label: '最近14天' },
                { value: '30', label: '最近30天' }
              ]"
              @update:modelValue="loadUserStats"
            />
          </div>
          <div v-if="userStats.daily_new_users?.length" class="h-64 w-full">
            <div ref="userTrendChart" class="w-full h-full"></div>
          </div>
          <div v-else class="h-64 flex items-center justify-center text-black">
            暂无数据
          </div>
        </div>

        <!-- 邮箱申请趋势图 -->
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-black">邮箱申请趋势</h3>
            <CustomSelect
              v-model="userStatsDays"
              :options="[
                { value: '7', label: '最近7天' },
                { value: '14', label: '最近14天' },
                { value: '30', label: '最近30天' }
              ]"
              @update:modelValue="loadUserStats"
            />
          </div>
          <div v-if="userStats.daily_mailbox_stats?.length" class="h-64 w-full">
            <div ref="mailboxTrendChart" class="w-full h-full"></div>
          </div>
          <div v-else class="h-64 flex items-center justify-center text-black">
            暂无数据
          </div>
        </div>

        <!-- PV/UV趋势图 -->
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-black">访问量趋势</h3>
            <CustomSelect
              v-model="pageAnalyticsDays"
              :options="[
                { value: '7', label: '最近7天' },
                { value: '14', label: '最近14天' },
                { value: '30', label: '最近30天' }
              ]"
              @update:modelValue="loadPageAnalytics"
            />
          </div>
          <div v-if="pageAnalytics.daily_stats?.length" class="h-64 w-full">
            <div ref="pvUvTrendChart" class="w-full h-full"></div>
          </div>
          <div v-else class="h-64 flex items-center justify-center text-black">
            暂无数据
          </div>
        </div>

      </div>



      <!-- 用户地理分布 -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-black">用户地理分布</h3>
          <div class="flex space-x-2">
            <button
              @click="setGeoMode('china')"
              :class="[
                'px-3 py-1 text-sm rounded-md transition-colors',
                geoMode === 'china' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-200 text-black hover:bg-gray-300'
              ]"
            >
              中国
            </button>
            <button
              @click="setGeoMode('global')"
              :class="[
                'px-3 py-1 text-sm rounded-md transition-colors',
                geoMode === 'global' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-200 text-black hover:bg-gray-300'
              ]"
            >
              全球
            </button>
          </div>
        </div>
        
        <!-- 地图和数据布局 -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- 左侧地图 -->
          <div class="col-span-1 lg:col-span-2">
            <div ref="worldMapChart" class="w-full h-96 bg-gray-50 rounded-lg" style="min-width: 300px;"></div>
          </div>

          <!-- 右侧数据 -->
          <div class="lg:col-span-1">
            <div v-if="geoDistribution?.distribution?.length" class="h-96 overflow-y-auto">
              <h4 class="text-sm font-medium text-black mb-3">{{ geoMode === 'china' ? '省份' : '国家' }}排行</h4>
              <div class="space-y-2">
                <div
                  v-for="(item, index) in geoDistribution?.distribution?.slice(0, 20)"
                  :key="item.name"
                  class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div class="flex items-center space-x-3">
                    <span class="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 text-xs font-medium rounded-full flex items-center justify-center">
                      {{ index + 1 }}
                    </span>
                    <span class="text-sm font-medium text-black">{{ item.name }}</span>
                  </div>
                  <div class="text-right">
                    <div class="text-sm font-medium text-black">{{ item.visit_count || 0 }}访问</div>
                    <div class="text-xs text-black">{{ item.total_users || 0 }} 用户</div>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="h-96 flex items-center justify-center text-black">
              <div class="text-center">
                <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7"></path>
                </svg>
                <p class="text-sm">暂无地理分布数据</p>
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="!geoDistribution?.distribution?.length" class="text-center text-black py-8">
          暂无地理分布数据
        </div>
      </div>

    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
      <div class="flex items-center space-x-2 text-black">
        <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>加载中...</span>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted } from 'vue'
import { monitoringAPI } from '@/api/monitoring'
import { workflowApi } from '@/api/workflow'
import * as echarts from 'echarts'

import CustomSelect from '@/components/CustomSelect/index.vue'
import CrawlerMonitor from '@/components/monitoring/CrawlerMonitor.vue'
import { showMessage } from '@/utils/message'
import { updateUserChart as updateUserTrendChart } from './utils/userTrendChart'
import { updateMailboxChart as updateMailboxTrendChart } from './utils/mailboxTrendChart'
import { updatePvUvChart as updatePvUvTrendChart } from './utils/pvUvTrendChart'
import { updateWorldMap as updateWorldMapChart, preloadWorldMap as preloadWorldMapData } from './utils/worldMapChart'

// 声明全局函数类型
declare global {
  interface Window {
    initChinaMap: (echarts: any) => void
    initWorldMap: (echarts: any) => void
    chinaJson: any
  }
}



// 响应式数据
const loading = ref(false)
const crawlerMonitorRef = ref()

// 统计数据
const overview = ref<any>({})
const userStats = ref<any>({})
const emailActivity = ref<any>({})
const pageAnalytics = ref<any>({})
const geoDistribution = ref<any>({})  // 新增地理分布数据
const businessStats = ref<any>({ summary: {}, trend: [] })

// 图表参数
const userStatsDays = ref('7')
const emailStatsDays = ref('7')
const pageAnalyticsDays = ref('7')
const geoMode = ref('china')  // 默认显示中国地图
const businessStatsDays = ref('7')

// 图表实例
const userTrendChart = ref<HTMLDivElement>()
const mailboxTrendChart = ref<HTMLDivElement>()
const pvUvTrendChart = ref<HTMLDivElement>()
const worldMapChart = ref<HTMLDivElement>()
let userChart: echarts.ECharts | null = null
let mailboxChart: echarts.ECharts | null = null
let pvUvChart: echarts.ECharts | null = null
let mapChart: echarts.ECharts | null = null
let onlineRefreshTimer: number | null = null





// 格式化增长率
const formatGrowthRate = (rate: number | undefined) => {
  if (rate === undefined || rate === null) return '--'
  const sign = rate >= 0 ? '+' : ''
  return `${sign}${rate.toFixed(1)}%`
}

// 获取增长率颜色类
const getGrowthClass = (rate: number | undefined) => {
  if (rate === undefined || rate === null) return 'text-black'
  return rate >= 0 ? 'text-primary-600' : 'text-red-600'
}

// 格式化数字
const formatNumber = (num: number | string | undefined | null) => {
  if (num === undefined || num === null) return '0'
  const numValue = typeof num === 'string' ? parseFloat(num) : num
  if (isNaN(numValue)) return '0'
  return Math.round(numValue).toString() // 返回整数，不要小数
}

// 加载监控概览
const loadOverview = async () => {
  try {
    const response: any = await monitoringAPI.getOverview()
    if (response.code === 0) {
      overview.value = response.data
    } else {
      showMessage(response.message || '获取概览数据失败', 'error')
    }
  } catch (error: any) {
    showMessage('获取概览数据失败', 'error')
    console.error('加载概览数据失败:', error)
  }
}

// 加载用户统计
const loadUserStats = async () => {
  try {
    const response: any = await monitoringAPI.getUserStats(parseInt(userStatsDays.value))
    if (response.code === 0) {
      userStats.value = response.data
      await nextTick()
      updateUserChart()
      updateMailboxChart() // 确保邮箱图表也更新
    } else {
      showMessage(response.message || '获取用户统计失败', 'error')
    }
  } catch (error: any) {
    showMessage('获取用户统计失败', 'error')
    console.error('加载用户统计失败:', error)
  }
}

// 加载邮件活动统计
const loadEmailActivity = async () => {
  try {
    const response: any = await monitoringAPI.getEmailActivity(parseInt(emailStatsDays.value))
    if (response.code === 0) {
      emailActivity.value = response.data
      await nextTick()
      updateMailboxChart()
    } else {
      showMessage(response.message || '获取邮件活动统计失败', 'error')
    }
  } catch (error: any) {
    showMessage('获取邮件活动统计失败', 'error')
    console.error('加载邮件活动统计失败:', error)
  }
}

// 加载页面访问统计
const loadPageAnalytics = async () => {
  try {
    const response: any = await monitoringAPI.getPageAnalytics(parseInt(pageAnalyticsDays.value))
    if (response.code === 0) {
      // 转换数据结构以匹配前端期望的格式
      const transformedData = {
        daily_stats: response.data.daily_analytics?.map((item: any) => ({
          date: item.date,
          pv: item.page_views,
          uv: item.unique_visitors
        })) || [],
        totals: response.data.totals,
        page_rankings: response.data.page_rankings
      }

      pageAnalytics.value = transformedData
      await nextTick()
      updatePvUvChart()
    } else {
      showMessage(response.message || '获取页面访问统计失败', 'error')
    }
  } catch (error: any) {
    showMessage('获取页面访问统计失败', 'error')
  }
}

const loadBusinessStats = async () => {
  try {
    const response: any = await monitoringAPI.getBusinessStats(parseInt(businessStatsDays.value))
    if (response.code === 0) {
      businessStats.value = response.data
    } else {
      showMessage(response.message || '获取业务监控失败', 'error')
    }
  } catch (error) {
    console.error('加载业务监控失败:', error)
  }
}

const refreshOnlineCount = async () => {
  try {
    const response: any = await monitoringAPI.getOnlineCount()
    if (response.code === 0) {
      const onlineData = response.data || {}
      businessStats.value = {
        ...businessStats.value,
        summary: {
          ...(businessStats.value.summary || {}),
          online_users_now: onlineData.online_users || 0,
          desktop_online_users_now: onlineData.desktop_online_users || 0,
          web_online_users_now: onlineData.web_online_users || 0
        }
      }
    }
  } catch (error) {
    console.error('刷新在线人数失败:', error)
  }
}

// 加载地理分布数据
const loadGeoDistribution = async () => {
  try {
    const response: any = await monitoringAPI.getGeoDistribution(geoMode.value, 30)
    if (response.code === 0) {
      geoDistribution.value = response.data
    } else {
      console.error('❌ 获取地理分布数据失败:', response.message)
      showMessage(response.message || '获取地理分布数据失败', 'error')
    }

    // 延迟更新地图，确保DOM完全渲染
    setTimeout(async () => {
      if (worldMapChart.value) {
        mapChart = await updateWorldMapChart(worldMapChart.value, geoMode.value, geoDistribution.value, mapChart)
      }
    }, 200)
  } catch (error: any) {
    console.error('❌ 加载地理分布数据失败:', error)
    showMessage('获取地理分布数据失败', 'error')
  }
}

// 切换地理模式
const setGeoMode = async (mode: string) => {
  console.log('🔄 切换地理模式:', mode)
  geoMode.value = mode

  // 如果切换到全球模式且世界地图未加载，先预加载
  if (mode === 'global') {
    console.log('🌍 预加载世界地图数据...')
    await preloadWorldMapData()
  }

  console.log('📊 开始加载地理分布数据')
  await loadGeoDistribution()
  console.log('✅ 地理分布数据加载完成')
}

// 更新用户趋势图表
const updateUserChart = () => {
  if (!userTrendChart.value || !userStats.value.daily_new_users) return

  userChart = updateUserTrendChart(userTrendChart.value, userStats.value, userChart)
}











const updateMailboxChart = () => {
  if (!mailboxTrendChart.value || !userStats.value.daily_mailbox_stats) return

  mailboxChart = updateMailboxTrendChart(mailboxTrendChart.value, userStats.value, mailboxChart)
}

// 更新PV/UV趋势图
const updatePvUvChart = () => {
  if (!pvUvTrendChart.value || !pageAnalytics.value.daily_stats) return

  pvUvChart = updatePvUvTrendChart(pvUvTrendChart.value, pageAnalytics.value, pvUvChart)
}

// 加载所有数据
const loadAllData = async () => {
  loading.value = true
  try {
    await Promise.all([
      loadOverview(),
      loadUserStats(),
      loadEmailActivity(),
      loadPageAnalytics(),
      loadBusinessStats(),
      loadGeoDistribution(),
      preloadWorldMapData() // 预加载世界地图数据，提高切换速度
    ])
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}



// 窗口大小变化时重新调整图表大小
const handleResize = () => {
  setTimeout(() => {
    if (userChart) {
      userChart.resize()
    }
    if (mailboxChart) {
      mailboxChart.resize()
    }
    if (pvUvChart) {
      pvUvChart.resize()
    }
    if (mapChart) {
      mapChart.resize()
    }
  }, 100)
}

// 页面加载时
onMounted(async () => {
  // 等待DOM完全渲染
  await nextTick()
  await loadAllData()
  onlineRefreshTimer = window.setInterval(() => {
    refreshOnlineCount()
  }, 15000)
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
})

// 页面卸载时清理
onUnmounted(() => {
  // 移除窗口大小变化监听器
  window.removeEventListener('resize', handleResize)

  if (userChart) {
    userChart.dispose()
  }
  if (mailboxChart) {
    mailboxChart.dispose()
  }
  if (pvUvChart) {
    pvUvChart.dispose()
  }
  if (mapChart) {
    mapChart.dispose()
  }
  if (onlineRefreshTimer) {
    window.clearInterval(onlineRefreshTimer)
    onlineRefreshTimer = null
  }
})
</script>
