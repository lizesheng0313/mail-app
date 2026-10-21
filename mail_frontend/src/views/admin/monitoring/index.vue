<template>
  <div class="monitoring-page">
    <div class="monitoring-content">
      <template v-if="monitoringSection === 'overview'">
        <section class="monitoring-panel">
          <div class="monitoring-panel-header">
            <div class="monitoring-panel-heading">
              <h2 class="monitoring-panel-title">用户与访问概览</h2>
            </div>
          </div>
          <div class="monitoring-metrics">
            <MetricCard v-for="metric in overviewMetrics" :key="metric.label" v-bind="metric" />
          </div>
        </section>

        <div class="monitoring-charts">
          <section class="monitoring-panel">
            <div class="monitoring-panel-header">
              <h3 class="monitoring-panel-title">用户注册趋势</h3>
              <CustomSelect
                v-model="userStatsDays"
                class="monitoring-period"
                size="sm"
                :options="periodOptions"
                @update:modelValue="loadUserStats"
              />
            </div>
            <DailyTrendChart
              :rows="userStats.daily_new_users || []"
              :series="registrationSeries"
              label="用户注册趋势"
            />
          </section>
          <section class="monitoring-panel">
            <div class="monitoring-panel-header">
              <h3 class="monitoring-panel-title">访问量趋势</h3>
              <CustomSelect
                v-model="pageAnalyticsDays"
                class="monitoring-period"
                size="sm"
                :options="periodOptions"
                @update:modelValue="loadPageAnalytics"
              />
            </div>
            <DailyTrendChart
              :rows="pageAnalytics.daily_stats || []"
              :series="trafficSeries"
              label="访问量趋势"
            />
          </section>
        </div>

        <CrawlerMonitor />
        <section class="monitoring-panel">
          <div class="monitoring-panel-header">
            <h3 class="monitoring-panel-title">用户地理分布</h3>
            <div class="flex shrink-0 gap-2">
              <button
                v-for="mode in geoModes"
                :key="mode.value"
                type="button"
                class="rounded-md px-3 py-1.5 text-sm font-medium"
                :class="
                  geoMode === mode.value
                    ? 'bg-primary-50 text-primary-700'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                "
                @click="setGeoMode(mode.value)"
              >
                {{ mode.label }}
              </button>
            </div>
          </div>
          <div class="monitoring-geo">
            <div ref="worldMapChart" class="h-96 min-w-0 w-full rounded-lg bg-gray-50"></div>
            <div class="h-96 min-w-0 overflow-y-auto">
              <h4 class="mb-3 text-sm font-medium text-gray-700">
                {{ geoMode === 'china' ? '省份' : '国家' }}排行
              </h4>
              <div v-if="geoDistribution?.distribution?.length" class="space-y-2">
                <div
                  v-for="(item, index) in geoDistribution.distribution.slice(0, 20)"
                  :key="item.name"
                  class="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2.5"
                >
                  <div class="flex min-w-0 items-center gap-2">
                    <span
                      class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs text-gray-500"
                      >{{ index + 1 }}</span
                    >
                    <span class="truncate text-sm text-gray-700" :title="item.name">{{
                      item.name
                    }}</span>
                  </div>
                  <div class="shrink-0 text-right tabular-nums">
                    <p class="text-sm font-medium text-gray-900">
                      {{ item.visit_count || 0 }} 访问
                    </p>
                    <p class="text-xs text-gray-500">{{ item.total_users || 0 }} 用户</p>
                  </div>
                </div>
              </div>
              <p v-else class="py-16 text-center text-sm text-gray-400">暂无地理分布数据</p>
            </div>
          </div>
        </section>
      </template>

      <template v-if="monitoringSection === 'business'">
        <div class="monitoring-panel-header mb-0">
          <div class="monitoring-panel-heading">
            <h2 class="monitoring-panel-title">业务监控</h2>
          </div>
          <CustomSelect
            v-model="businessStatsDays"
            class="monitoring-period"
            size="sm"
            :options="periodOptions"
            @update:modelValue="loadBusinessStats"
          />
        </div>

        <section class="monitoring-panel">
          <div class="monitoring-panel-header">
            <h3 class="monitoring-panel-title">在线与桌面端使用</h3>
          </div>
          <div class="monitoring-metrics monitoring-metrics-compact">
            <MetricCard v-for="metric in audienceMetrics" :key="metric.label" v-bind="metric" />
          </div>

          <div class="monitoring-subsection">
            <h4 class="mb-3 text-sm font-semibold text-gray-900">桌面端每日使用人数</h4>
            <DailyTrendChart
              :rows="businessStats.trend || []"
              :series="desktopSeries"
              label="桌面端每日使用人数"
            />
          </div>
        </section>

        <section class="monitoring-panel" data-testid="wechat-usage">
          <div class="monitoring-panel-header">
            <h3 class="monitoring-panel-title">微信端使用</h3>
          </div>
          <div class="monitoring-metrics monitoring-metrics-single-row">
            <MetricCard v-for="metric in wechatMetrics" :key="metric.label" v-bind="metric" />
          </div>
          <div class="monitoring-charts monitoring-charts-three monitoring-subsection">
            <article
              v-for="chart in wechatCharts"
              :key="chart.label"
              class="monitoring-trend-panel"
            >
              <h4 class="mb-4 text-sm font-semibold text-gray-900">{{ chart.label }}</h4>
              <DailyTrendChart
                :rows="businessStats.wechat_trend || []"
                :series="chart.series"
                :label="chart.label"
              />
            </article>
          </div>
        </section>

        <section class="monitoring-panel">
          <div class="monitoring-panel-header">
            <h3 class="monitoring-panel-title">邮箱监控</h3>
          </div>
          <div class="monitoring-metrics monitoring-mailbox-users">
            <MetricCard
              v-for="kind in mailboxReceiptKinds"
              :key="kind.key"
              :label="`${kind.label}当前使用人数`"
              :value="formatNumber(businessStats.summary?.[`${kind.key}_enabled_users`])"
            />
          </div>
          <div
            class="monitoring-charts monitoring-charts-three monitoring-subsection"
            data-testid="business-trend"
          >
            <article
              v-for="chart in mailboxCharts"
              :key="chart.label"
              class="monitoring-trend-panel"
            >
              <h4 class="mb-4 text-sm font-semibold text-gray-900">{{ chart.label }}</h4>
              <DailyTrendChart
                :rows="businessStats.trend || []"
                :series="chart.series"
                :label="chart.label"
              />
            </article>
          </div>
        </section>

        <section class="monitoring-panel">
          <div class="monitoring-panel-header">
            <h3 class="monitoring-panel-title">API 请求监控</h3>
          </div>
          <div class="monitoring-metrics">
            <MetricCard v-for="metric in apiMetrics" :key="metric.label" v-bind="metric" />
          </div>
          <div class="monitoring-subsection" data-testid="api-breakdown">
            <div class="monitoring-panel-header">
              <h4 class="text-sm font-semibold text-gray-900">每日请求结果</h4>
              <CustomSelect
                v-model="apiAuthMode"
                class="monitoring-auth-filter"
                size="sm"
                :options="apiAuthOptions"
              />
            </div>
            <div class="monitoring-charts monitoring-charts-three">
              <article
                v-for="chart in apiResultCharts"
                :key="chart.label"
                class="monitoring-trend-panel"
              >
                <h4 class="mb-4 text-sm font-semibold text-gray-900">{{ chart.label }}</h4>
                <DailyTrendChart :rows="chart.rows" :series="chart.series" :label="chart.label" />
              </article>
              <article class="monitoring-trend-panel">
                <h4 class="mb-4 text-sm font-semibold text-gray-900">每日使用 API 人数</h4>
                <DailyTrendChart
                  :rows="businessStats.trend || []"
                  :series="apiUserSeries"
                  label="每日使用 API 人数"
                />
              </article>
            </div>
          </div>
        </section>

        <section class="monitoring-panel">
          <div class="monitoring-panel-header">
            <h3 class="monitoring-panel-title">邮箱分享</h3>
          </div>
          <div class="monitoring-metrics monitoring-metrics-single-row">
            <MetricCard v-for="metric in shareMetrics" :key="metric.label" v-bind="metric" />
          </div>
          <div class="monitoring-charts monitoring-charts-three monitoring-subsection">
            <div class="monitoring-chart-group" data-testid="share-trend">
              <article
                v-for="chart in shareCharts"
                :key="chart.label"
                class="monitoring-trend-panel"
              >
                <div class="monitoring-share-chart-header">
                  <h4>{{ chart.label }}</h4>
                  <p>
                    <span>今日</span
                    ><strong>{{ formatNumber(businessStats.summary?.[chart.summaryKey]) }}</strong
                    ><span>{{ chart.unit }}</span>
                  </p>
                </div>
                <DailyTrendChart
                  :rows="businessStats.trend || []"
                  :series="chart.series"
                  :label="chart.label"
                  :height="260"
                  show-values
                />
              </article>
            </div>
            <div
              v-if="hasShareChannelTrend"
              class="monitoring-chart-group"
              data-testid="share-channels"
            >
              <article
                v-for="chart in shareChannelCharts"
                :key="chart.label"
                class="monitoring-trend-panel"
              >
                <div class="monitoring-share-chart-header">
                  <h4>{{ chart.label }}</h4>
                  <p>
                    <span>近 {{ businessStatsDays }} 天</span
                    ><strong>{{ formatNumber(chart.total) }}</strong
                    ><span>{{ chart.unit }}</span>
                  </p>
                </div>
                <DailyTrendChart
                  :rows="chart.rows"
                  :series="chart.series"
                  :label="chart.label"
                  :height="260"
                  show-values
                />
              </article>
            </div>
          </div>
        </section>

        <section class="monitoring-panel">
          <div class="monitoring-panel-header">
            <div class="monitoring-panel-heading">
              <h3 class="monitoring-panel-title">游客邮箱转化漏斗</h3>
              <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-gray-500">
                <span
                  >自动创建失败 {{ guestConversionFunnel.mailbox_create_failures || 0 }} 次</span
                >
                <span v-for="signal in guestConversionFunnel.signals || []" :key="signal.event_name"
                  >{{ signal.label }} {{ signal.visitors || 0 }} 人</span
                >
              </div>
            </div>
            <CustomSelect
              v-model="guestFunnelDays"
              class="monitoring-period"
              size="sm"
              :options="periodOptions"
              @update:modelValue="loadGuestConversionFunnel"
            />
          </div>
          <div v-if="guestConversionFunnel.stages?.length" class="monitoring-funnel-scroll">
            <ol class="monitoring-funnel">
              <li
                v-for="(stage, index) in guestConversionFunnel.stages"
                :key="stage.event_name"
                class="monitoring-funnel-stage"
              >
                <p class="mb-2 text-xs font-medium tabular-nums text-primary-600">
                  {{ String(index + 1).padStart(2, '0') }}
                </p>
                <p class="text-xs leading-5 text-gray-600">{{ stage.label }}</p>
                <p class="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
                  {{ stage.visitors || 0 }}
                </p>
                <p class="mt-1 text-xs leading-5 text-gray-500">
                  {{ index === 0 ? '起始访客' : `上一步 ${stage.conversion_rate || 0}%` }}
                </p>
              </li>
            </ol>
          </div>
          <p v-else class="rounded-lg bg-gray-50 py-8 text-center text-sm text-gray-400">
            暂无游客转化数据
          </p>
        </section>
      </template>
    </div>

    <div v-if="loading" class="fixed inset-0 z-50 flex items-center justify-center bg-white/75">
      <div class="flex items-center gap-2 text-sm text-gray-700" role="status">
        <svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <span>加载中...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { subscribeRealtime } from '@/services/realtimeClient'
import { computed, ref, onMounted, nextTick, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { monitoringAPI } from '@/api/monitoring'
import * as echarts from 'echarts'

import CustomSelect from '@/components/CustomSelect/index.vue'
import CrawlerMonitor from '@/components/Monitoring/CrawlerMonitor.vue'
import MetricCard from '@/components/Monitoring/MetricCard.vue'
import './monitoring.css'
import { showMessage } from '@/utils/message'
import DailyTrendChart from '@/components/Monitoring/DailyTrendChart.vue'
import type { TrendRow, TrendSeries } from '@/components/Monitoring/dailyTrendOptions'
import {
  updateWorldMap as updateWorldMapChart,
  preloadWorldMap as preloadWorldMapData
} from './utils/worldMapChart'

// 声明全局函数类型
declare global {
  interface Window {
    initChinaMap: (echarts: any) => void
    initWorldMap: (echarts: any) => void
    chinaJson: any
  }
}

// 响应式数据
const route = useRoute()
const monitoringSection = computed(() => String(route.meta.monitoringSection || 'overview'))
const loading = ref(false)

// 统计数据
const overview = ref<any>({})
const userStats = ref<any>({})
const pageAnalytics = ref<any>({})
const geoDistribution = ref<any>({}) // 新增地理分布数据
const businessStats = ref<any>({ summary: {}, trend: [] })
const guestConversionFunnel = ref<any>({ stages: [], signals: [], mailbox_create_failures: 0 })
const mailboxApplicationKinds = [
  { key: 'system', label: '系统邮箱' },
  { key: 'hosted', label: '域名邮箱' }
]
const mailboxReceiptKinds = [...mailboxApplicationKinds, { key: 'external', label: '第三方邮箱' }]
const apiAuthLabels: Record<string, string> = {
  api_key: 'API Key',
  bearer_token: '用户登录凭证',
  miniapp: '小程序登录凭证',
  public: '匿名 / 未携带凭证',
  other: '其他'
}
const apiAuthMode = ref('all')
const apiAuthOptions = [
  { value: 'all', label: '全部鉴权方式' },
  ...Object.entries(apiAuthLabels).map(([value, label]) => ({ value, label }))
]
const apiResultSeries: TrendSeries[] = [
  { key: 'success_calls', label: '成功请求', unit: '次', color: '#10b981' },
  { key: 'failed_calls', label: '失败请求', unit: '次', color: '#ef4444' }
]
const apiResultCharts = computed(() =>
  [
    { scope: 'business', label: '站内客户端每日请求结果' },
    { scope: 'open', label: '开放平台每日请求结果' }
  ].map(({ scope, label }) => {
    if (!Array.isArray(businessStats.value.api_breakdown_trend)) {
      return { label, rows: [], series: apiResultSeries }
    }
    const byDate = new Map<string, TrendRow>(
      (businessStats.value.trend || []).map((row: TrendRow) => [row.date, { date: row.date }])
    )
    for (const item of businessStats.value.api_breakdown_trend) {
      if (item.api_scope !== scope) continue
      if (apiAuthMode.value !== 'all' && item.auth_mode !== apiAuthMode.value) continue
      const day = byDate.get(item.date) || { date: item.date }
      for (const key of ['success_calls', 'failed_calls']) {
        const value = Number(item[key] || 0)
        day[key] = Number(day[key] || 0) + (Number.isFinite(value) ? value : 0)
      }
      byDate.set(item.date, day)
    }
    return { label, rows: [...byDate.values()], series: apiResultSeries }
  })
)
const shareSources = [
  { key: 'web', label: '网页', color: '#2563eb' },
  { key: 'desktop', label: '桌面端', color: '#8b5cf6' },
  { key: 'miniapp', label: '微信端', color: '#10b981' },
  { key: 'api', label: 'API 调用', color: '#f59e0b' },
  { key: 'unknown', label: '未标记来源', color: '#6b7280' }
]
const hasShareChannelTrend = computed(() => Array.isArray(businessStats.value.share_channel_trend))
const shareChannelRows = computed<TrendRow[]>(() => {
  const byDate = new Map<string, TrendRow>()
  for (const row of businessStats.value.trend || []) {
    byDate.set(row.date, { date: row.date })
  }
  for (const row of businessStats.value.share_channel_trend || []) {
    const day = byDate.get(row.date) || { date: row.date }
    day[`created_${row.source_channel}`] = Number(row.created || 0)
    day[`visits_${row.source_channel}`] = Number(row.visits || 0)
    byDate.set(row.date, day)
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
})
const shareChannelCharts = computed(() =>
  [
    { key: 'created', label: '每日链接创建来源', unit: '条' },
    { key: 'visits', label: '每日分享访问来源', unit: '次' }
  ].map((metric) => {
    const series: TrendSeries[] = shareSources
      .filter((source) =>
        shareChannelRows.value.some((row) => Number(row[`${metric.key}_${source.key}`]) > 0)
      )
      .map((source) => ({
        key: `${metric.key}_${source.key}`,
        label: source.label,
        color: source.color,
        unit: metric.unit
      }))
    const total = shareChannelRows.value.reduce(
      (sum, row) =>
        sum + series.reduce((dayTotal, item) => dayTotal + Number(row[item.key] || 0), 0),
      0
    )
    return {
      label: metric.label,
      unit: metric.unit,
      total,
      series,
      rows: series.length ? shareChannelRows.value : []
    }
  })
)
const periodOptions = [
  { value: '7', label: '最近7天' },
  { value: '14', label: '最近14天' },
  { value: '30', label: '最近30天' }
]
const geoModes = [
  { value: 'china', label: '中国' },
  { value: 'global', label: '全球' }
]
const overviewMetrics = computed(() => [
  {
    label: '今日用户注册数',
    value: formatNumber(overview.value.today_stats?.new_users)
  },
  {
    label: '总用户数',
    value: formatNumber(overview.value.totals?.total_users)
  },
  {
    label: `最近 ${pageAnalyticsDays.value} 天页面浏览量`,
    value: formatNumber(pageAnalytics.value.totals?.total_pv)
  },
  {
    label: `最近 ${pageAnalyticsDays.value} 天访客数`,
    value: formatNumber(pageAnalytics.value.totals?.total_uv)
  }
])
const audienceMetrics = computed(() => [
  {
    label: '当前在线用户',
    value: formatNumber(businessStats.value.summary?.online_users_now)
  },
  {
    label: '桌面端今日使用人数',
    value: formatNumber(businessStats.value.summary?.desktop_active_users_today)
  }
])
const hasWechatCollection = computed(
  () => Number(businessStats.value.wechat_collection_started_at_ms) > 0
)
const wechatMetrics = computed(() =>
  [
    { key: 'wechat_active_users', label: '微信今日使用人数' },
    { key: 'wechat_receive_users', label: '微信今日收件人数' },
    { key: 'wechat_send_users', label: '微信今日发件人数' },
    { key: 'wechat_share_users', label: '微信今日分享人数' },
    { key: 'wechat_share_visit_users', label: '微信今日分享访客' }
  ].map(({ key, label }) => ({
    label,
    value: hasWechatCollection.value
      ? formatNumber(businessStats.value.summary?.[`${key}_today`])
      : '—'
  }))
)
const apiMetrics = computed(() => [
  {
    label: '站内客户端今日请求',
    value: formatNumber(businessStats.value.summary?.business_api_calls_today)
  },
  {
    label: '开放平台今日请求',
    value: formatNumber(businessStats.value.summary?.api_calls_today)
  },
  {
    label: '开放平台已启用用户',
    value: formatNumber(businessStats.value.summary?.api_enabled_users)
  },
  {
    label: '今日活跃 API Key',
    value: formatNumber(businessStats.value.summary?.api_active_keys_today)
  }
])
const shareMetrics = computed(() => [
  {
    label: '累计创建分享人数',
    value: `${formatNumber(businessStats.value.summary?.share_users_total)} 人`
  },
  {
    label: `近 ${businessStatsDays.value} 天创建分享人数`,
    value: `${formatNumber(businessStats.value.summary?.share_users_period)} 人`
  },
  {
    label: '今日新建分享链接',
    value: `${formatNumber(businessStats.value.summary?.share_links_created_today)} 条`
  },
  {
    label: '今日被访问链接',
    value: `${formatNumber(businessStats.value.summary?.share_links_opened_today)} 条`
  },
  {
    label: '今日访问分享人数',
    value: `${formatNumber(businessStats.value.summary?.share_visitors_today)} 人`
  }
])

interface TrendPanel {
  label: string
  series: TrendSeries[]
}
const registrationSeries: TrendSeries[] = [{ key: 'new_users', label: '新注册用户', unit: '人' }]
const trafficSeries: TrendSeries[] = [
  { key: 'pv', label: '页面浏览量 PV', unit: '次' },
  { key: 'uv', label: '每日访客 UV', unit: '人' }
]
const desktopSeries: TrendSeries[] = [
  { key: 'desktop_active_users', label: '桌面端使用人数', unit: '人' }
]
const wechatCharts: TrendPanel[] = [
  {
    label: '微信端每日使用人数',
    series: [
      { key: 'wechat_active_users', label: '使用人数', unit: '人' },
      { key: 'wechat_receive_users', label: '收件人数', unit: '人' },
      { key: 'wechat_send_users', label: '发件人数', unit: '人' },
      { key: 'wechat_share_users', label: '分享创建人数', unit: '人' },
      { key: 'wechat_share_visit_users', label: '分享访客', unit: '人' }
    ]
  },
  {
    label: '微信端每日收件与分享操作',
    series: [
      { key: 'wechat_receive_actions', label: '收件操作', unit: '次' },
      { key: 'wechat_share_creates', label: '分享创建', unit: '次' },
      { key: 'wechat_share_visits', label: '分享打开', unit: '次' }
    ]
  },
  {
    label: '微信端每日成功发件',
    series: [{ key: 'wechat_send_count', label: '成功发件记录', unit: '封' }]
  }
]
const mailboxCharts: TrendPanel[] = [
  {
    label: '每日邮箱申请',
    series: [
      { key: 'system_created', label: '系统邮箱', unit: '个' },
      { key: 'hosted_created', label: '域名邮箱', unit: '个' }
    ]
  },
  {
    label: '每日邮箱申请人数',
    series: mailboxApplicationKinds.map((kind) => ({
      key: `${kind.key}_created_users`,
      label: kind.label,
      unit: '人'
    }))
  },
  {
    label: '每日邮箱收件',
    series: mailboxReceiptKinds.map((kind) => ({
      key: `${kind.key}_received`,
      label: kind.label,
      unit: '封'
    }))
  }
]
const apiUserSeries: TrendSeries[] = [
  { key: 'business_api_active_users', label: '站内 API 使用人数', unit: '人' },
  { key: 'api_active_users', label: '开放平台 API 使用人数', unit: '人' }
]
const shareCharts: (TrendPanel & { summaryKey: string; unit: string })[] = [
  {
    label: '每日创建分享人数',
    summaryKey: 'share_users_today',
    unit: '人',
    series: [
      { key: 'share_users', label: '创建分享人数', type: 'bar', unit: '人', color: '#2563eb' }
    ]
  },
  {
    label: '每日新建分享链接',
    summaryKey: 'share_links_created_today',
    unit: '条',
    series: [
      {
        key: 'share_links_created',
        label: '新建分享链接',
        type: 'bar',
        unit: '条',
        color: '#2563eb'
      }
    ]
  },
  {
    label: '每日访问分享人数',
    summaryKey: 'share_visitors_today',
    unit: '人',
    series: [
      { key: 'share_visitors', label: '访问分享人数', type: 'bar', unit: '人', color: '#10b981' }
    ]
  },
  {
    label: '每日访问分享次数',
    summaryKey: 'share_visits_today',
    unit: '次',
    series: [{ key: 'share_visits', label: '访问分享次数', unit: '次', color: '#10b981' }]
  }
]

// 图表参数
const userStatsDays = ref('7')
const pageAnalyticsDays = ref('7')
const geoMode = ref('china') // 默认显示中国地图
const businessStatsDays = ref('7')
const guestFunnelDays = ref('7')

const worldMapChart = ref<HTMLDivElement>()
let mapChart: echarts.ECharts | null = null
let unsubscribeOnlineState: (() => void) | undefined

// 格式化数字
const formatNumber = (num: number | string | undefined | null) => {
  if (num === undefined || num === null) return '0'
  const numValue = typeof num === 'string' ? parseFloat(num) : num
  if (isNaN(numValue)) return '0'
  return Math.round(numValue).toLocaleString('zh-CN')
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
    } else {
      showMessage(response.message || '获取用户统计失败', 'error')
    }
  } catch (error: any) {
    showMessage('获取用户统计失败', 'error')
    console.error('加载用户统计失败:', error)
  }
}

// 加载页面访问统计
const loadPageAnalytics = async () => {
  try {
    const response: any = await monitoringAPI.getPageAnalytics(parseInt(pageAnalyticsDays.value))
    if (response.code === 0) {
      // 转换数据结构以匹配前端期望的格式
      const transformedData = {
        daily_stats:
          response.data.daily_analytics?.map((item: any) => ({
            date: item.date,
            pv: item.page_views,
            uv: item.unique_visitors
          })) || [],
        totals: response.data.totals,
        page_rankings: response.data.page_rankings
      }

      pageAnalytics.value = transformedData
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

const loadGuestConversionFunnel = async () => {
  try {
    const response: any = await monitoringAPI.getGuestConversionFunnel(
      parseInt(guestFunnelDays.value)
    )
    if (response.code === 0) {
      guestConversionFunnel.value = response.data
    } else {
      showMessage(response.message || '获取游客转化漏斗失败', 'error')
    }
  } catch (error) {
    console.error('加载游客转化漏斗失败:', error)
  }
}

const applyOnlineCount = (onlineData: any) => {
      businessStats.value = {
        ...businessStats.value,
        summary: {
          ...(businessStats.value.summary || {}),
          online_users_now: onlineData.online_users || 0,
          desktop_online_users_now: onlineData.desktop_online_users || 0,
          web_online_users_now: onlineData.web_online_users || 0,
          miniapp_online_users_now: onlineData.miniapp_online_users || 0
        }
      }
}

const refreshOnlineCount = async () => {
  try {
    const response: any = await monitoringAPI.getOnlineCount()
    if (response.code !== 0) return false
    if (response.code === 0) {
      const onlineData = response.data || {}
      applyOnlineCount(onlineData)
    }
  } catch (error) {
    console.error('刷新在线人数失败:', error)
    return false
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
        mapChart = await updateWorldMapChart(
          worldMapChart.value,
          geoMode.value,
          geoDistribution.value,
          mapChart
        )
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

// 按子页面加载数据；运行概览同时包含访问趋势和地理分布。
const loadCurrentSectionData = async () => {
  loading.value = true
  try {
    if (monitoringSection.value === 'business') {
      await Promise.all([loadBusinessStats(), loadGuestConversionFunnel()])
    } else {
      await Promise.all([
        loadOverview(),
        loadUserStats(),
        loadPageAnalytics(),
        loadGeoDistribution(),
        preloadWorldMapData()
      ])
    }
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

const disposeTrafficCharts = () => {
  mapChart?.dispose()
  mapChart = null
}

const handleResize = () => {
  mapChart?.resize()
}

// 页面加载时
onMounted(async () => {
  unsubscribeOnlineState = subscribeRealtime(['presence_changed'], (payload, event) => {
    if (monitoringSection.value !== 'business') return
    if (event === 'realtime_reset') return refreshOnlineCount()
    applyOnlineCount(payload || {})
  })
  // 等待DOM完全渲染
  await nextTick()
  await loadCurrentSectionData()
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
})

watch(monitoringSection, async (_section, previousSection) => {
  if (previousSection === 'overview') {
    disposeTrafficCharts()
  }
  await nextTick()
  await loadCurrentSectionData()
})

// 页面卸载时清理
onUnmounted(() => {
  // 移除窗口大小变化监听器
  window.removeEventListener('resize', handleResize)

  disposeTrafficCharts()
  unsubscribeOnlineState?.()
})
</script>
