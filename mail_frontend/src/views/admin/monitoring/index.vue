<template>
  <div class="monitoring-page">
    <div class="monitoring-content">
      <template v-if="monitoringSection === 'overview'">
        <section class="monitoring-panel" aria-label="今日概览">
          <div class="monitoring-panel-header">
            <div class="monitoring-panel-heading">
              <h2 class="monitoring-panel-title">今日概览</h2>
              <p class="monitoring-panel-description">用户增长、邮箱申请与收件情况</p>
            </div>
          </div>
          <div class="monitoring-metrics">
            <MetricCard v-for="metric in overviewMetrics" :key="metric.label" v-bind="metric" />
          </div>
          <p
            v-if="userStats.today_user_apply_stats?.unknown_applicant_mailboxes"
            class="monitoring-panel-description mt-3"
          >
            {{
              userStats.today_user_apply_stats.unknown_applicant_mailboxes
            }}
            个历史申请待补身份，未纳入平均申请数。
          </p>
        </section>

        <CrawlerMonitor ref="crawlerMonitorRef" />

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
            <div
              v-if="userStats.daily_new_users?.length"
              ref="userTrendChart"
              class="monitoring-chart"
            ></div>
            <div
              v-else
              class="monitoring-chart flex items-center justify-center text-sm text-gray-400"
            >
              暂无数据
            </div>
          </section>
          <section class="monitoring-panel">
            <div class="monitoring-panel-header">
              <h3 class="monitoring-panel-title">系统邮箱申请趋势</h3>
              <CustomSelect
                v-model="userStatsDays"
                class="monitoring-period"
                size="sm"
                :options="periodOptions"
                @update:modelValue="loadUserStats"
              />
            </div>
            <div
              v-if="userStats.daily_mailbox_stats?.length"
              ref="mailboxTrendChart"
              class="monitoring-chart"
            ></div>
            <div
              v-else
              class="monitoring-chart flex items-center justify-center text-sm text-gray-400"
            >
              暂无数据
            </div>
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
            <div
              v-if="pageAnalytics.daily_stats?.length"
              ref="pvUvTrendChart"
              class="monitoring-chart"
            ></div>
            <div
              v-else
              class="monitoring-chart flex items-center justify-center text-sm text-gray-400"
            >
              暂无数据
            </div>
          </section>
        </div>

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
        <section class="monitoring-panel">
          <div class="monitoring-panel-header">
            <div class="monitoring-panel-heading">
              <h3 class="monitoring-panel-title">用户与使用情况</h3>
              <p class="monitoring-panel-description">今日活跃与当前在线，按账号去重</p>
            </div>
            <CustomSelect
              v-model="businessStatsDays"
              class="monitoring-period"
              size="sm"
              :options="periodOptions"
              @update:modelValue="loadBusinessStats"
            />
          </div>
          <div class="monitoring-metrics">
            <MetricCard v-for="metric in audienceMetrics" :key="metric.label" v-bind="metric" />
          </div>
          <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500">
            <span class="font-medium text-gray-700">在线平台分布</span>
            <span
              >桌面端
              <strong class="ml-1 font-semibold text-gray-900">{{
                businessStats.summary?.desktop_online_users_now || 0
              }}</strong></span
            >
            <span
              >Web
              <strong class="ml-1 font-semibold text-gray-900">{{
                businessStats.summary?.web_online_users_now || 0
              }}</strong></span
            >
            <span
              >小程序
              <strong class="ml-1 font-semibold text-gray-900">{{
                businessStats.summary?.miniapp_online_users_now || 0
              }}</strong></span
            >
            <span>同一用户可同时计入多个平台</span>
          </div>
        </section>

        <section class="monitoring-panel">
          <div class="monitoring-panel-header">
            <div class="monitoring-panel-heading">
              <h3 class="monitoring-panel-title">邮箱申请与收件</h3>
              <p class="monitoring-panel-description">
                三种邮箱分别统计；第三方邮箱通过接入使用，不计申请数。
              </p>
            </div>
            <span class="text-xs leading-6 text-gray-500">今日</span>
          </div>
          <div class="monitoring-table-scroll" data-testid="mailbox-summary">
            <table class="monitoring-table">
              <thead>
                <tr>
                  <th>邮箱类型</th>
                  <th class="monitoring-number">申请数量</th>
                  <th class="monitoring-number">申请人数</th>
                  <th class="monitoring-number">收件数量</th>
                  <th class="monitoring-number">使用人数</th>
                  <th class="monitoring-number">小程序收件</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="kind in mailboxReceiptKinds" :key="kind.key">
                  <td>{{ kind.label }}</td>
                  <td class="monitoring-number">
                    {{
                      kind.key === 'external'
                        ? '—'
                        : businessStats.summary?.[`${kind.key}_created_today`] || 0
                    }}
                  </td>
                  <td class="monitoring-number">
                    {{
                      kind.key === 'external'
                        ? '—'
                        : businessStats.summary?.[`${kind.key}_created_users_today`] || 0
                    }}
                  </td>
                  <td class="monitoring-number">
                    {{ businessStats.summary?.[`${kind.key}_received_today`] || 0 }}
                  </td>
                  <td class="monitoring-number">
                    {{ businessStats.summary?.[`${kind.key}_enabled_users`] || 0 }}
                  </td>
                  <td class="monitoring-number">
                    {{ businessStats.summary?.[`miniapp_${kind.key}_received_today`] || 0 }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="monitoring-panel-description">
            小程序账号归属邮箱今日收件：包含微信账号及其绑定账号名下的邮箱，是对应类型收件的子项。
          </p>
          <div v-if="businessStats.trend?.length" class="monitoring-subsection">
            <h4 class="mb-3 text-sm font-semibold text-gray-900">每日业务趋势</h4>
            <div class="monitoring-table-scroll" data-testid="business-trend">
              <table class="monitoring-table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th
                      v-for="column in businessTrendColumns"
                      :key="column.key"
                      class="monitoring-number"
                    >
                      {{ column.label }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in businessStats.trend" :key="item.date">
                    <td>{{ item.date }}</td>
                    <td
                      v-for="column in businessTrendColumns"
                      :key="column.key"
                      class="monitoring-number"
                    >
                      {{ item[column.key] || 0 }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p v-else class="mt-5 rounded-lg bg-gray-50 py-8 text-center text-sm text-gray-400">
            最近 {{ businessStatsDays }} 天暂无业务趋势数据
          </p>
        </section>

        <section class="monitoring-panel">
          <div class="monitoring-panel-header">
            <div class="monitoring-panel-heading">
              <h3 class="monitoring-panel-title">API 调用情况</h3>
              <p class="monitoring-panel-description">
                文档、元信息和日志查询接口均计入；成功为 HTTP 状态小于 400 且业务码为 0。
              </p>
            </div>
            <span class="text-xs leading-6 text-gray-500">最近 {{ businessStatsDays }} 天</span>
          </div>
          <dl class="mb-5 flex flex-wrap gap-x-12 gap-y-4">
            <div>
              <dt class="text-sm text-gray-600">开放平台 API 今日使用人数</dt>
              <dd class="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
                {{ businessStats.summary?.api_active_users_today || 0 }}
                <span class="ml-2 text-xs font-normal text-gray-500"
                  >调用量 {{ businessStats.summary?.api_calls_today || 0 }}</span
                >
              </dd>
            </div>
            <div>
              <dt class="text-sm text-gray-600">普通业务 API 今日调用量</dt>
              <dd class="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
                {{ businessStats.summary?.business_api_calls_today || 0 }}
                <span class="ml-2 text-xs font-normal text-gray-500"
                  >已登录站内用户
                  {{ businessStats.summary?.business_api_active_users_today || 0 }}</span
                >
              </dd>
            </div>
          </dl>
          <h4 class="mb-3 text-sm font-semibold text-gray-900">API 鉴权与调用结果</h4>
          <div class="monitoring-table-scroll" data-testid="api-breakdown">
            <table class="monitoring-table">
              <thead>
                <tr>
                  <th>接口类别</th>
                  <th>鉴权方式</th>
                  <th class="monitoring-number">今日成功</th>
                  <th class="monitoring-number">今日失败</th>
                  <th class="monitoring-number">区间成功</th>
                  <th class="monitoring-number">区间失败</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in businessStats.api_breakdown || []"
                  :key="`${item.api_scope}:${item.auth_mode}`"
                >
                  <td>{{ item.api_scope === 'open' ? '开放平台' : '普通业务' }}</td>
                  <td>{{ apiAuthLabels[item.auth_mode] || '其他' }}</td>
                  <td class="monitoring-number">{{ item.success_calls_today }}</td>
                  <td class="monitoring-number">{{ item.failed_calls_today }}</td>
                  <td class="monitoring-number">{{ item.success_calls }}</td>
                  <td class="monitoring-number">{{ item.failed_calls }}</td>
                </tr>
                <tr v-if="!businessStats.api_breakdown?.length">
                  <td colspan="6" class="text-center text-gray-400">暂无 API 请求记录</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="monitoring-panel">
          <div class="monitoring-panel-header">
            <h3 class="monitoring-panel-title">邮箱分享监控</h3>
            <span class="text-xs leading-6 text-gray-500"
              >最近 {{ businessStatsDays }} 天（含今天）</span
            >
          </div>
          <div class="monitoring-metrics">
            <MetricCard v-for="metric in shareMetrics" :key="metric.label" v-bind="metric" />
          </div>
          <div class="monitoring-subsection" data-testid="share-channels">
            <h4 class="mb-3 text-sm font-semibold text-gray-900">分享来源</h4>
            <div class="monitoring-table-scroll">
              <table class="monitoring-table">
                <thead>
                  <tr>
                    <th>来源</th>
                    <th class="monitoring-number">今日创建</th>
                    <th class="monitoring-number">今日访问请求</th>
                    <th class="monitoring-number">区间创建</th>
                    <th class="monitoring-number">区间访问请求</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in businessStats.share_channels || []" :key="item.source_channel">
                    <td>{{ shareSourceLabels[item.source_channel] || '未知' }}</td>
                    <td class="monitoring-number">{{ item.created_today }}</td>
                    <td class="monitoring-number">{{ item.visits_today }}</td>
                    <td class="monitoring-number">{{ item.created }}</td>
                    <td class="monitoring-number">{{ item.visits }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="monitoring-panel-description">
              创建来源与访问来源分别统计；旧记录未保存来源时列为未知。撤销分享后历史计数保留。
            </p>
          </div>
          <div v-if="businessStats.trend?.length" class="monitoring-subsection">
            <h4 class="mb-3 text-sm font-semibold text-gray-900">每日分享趋势</h4>
            <div class="monitoring-table-scroll">
              <table class="monitoring-table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th
                      v-for="column in shareTrendColumns"
                      :key="column.key"
                      class="monitoring-number"
                    >
                      {{ column.label }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in businessStats.trend" :key="item.date">
                    <td>{{ item.date }}</td>
                    <td
                      v-for="column in shareTrendColumns"
                      :key="column.key"
                      class="monitoring-number"
                    >
                      {{ item[column.key] || 0 }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="monitoring-panel-description">
              区间首次：所选时间段内第一次创建分享；区间再次：此前某天已创建过分享。每天的创建用户 =
              区间首次 + 区间再次，撤销分享后仍计入。
            </p>
            <p class="monitoring-panel-description">
              访问请求包含获取分享信息、读取邮件和成功拉取邮件，包括自动刷新。
            </p>
          </div>
        </section>

        <section class="monitoring-panel">
          <div class="monitoring-panel-header">
            <div class="monitoring-panel-heading">
              <h3 class="monitoring-panel-title">游客邮箱转化漏斗</h3>
              <div class="monitoring-panel-description flex flex-wrap gap-x-4 gap-y-1">
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
import { computed, ref, onMounted, nextTick, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { monitoringAPI } from '@/api/monitoring'
import * as echarts from 'echarts'

import CustomSelect from '@/components/CustomSelect/index.vue'
import CrawlerMonitor from '@/components/Monitoring/CrawlerMonitor.vue'
import MetricCard from '@/components/Monitoring/MetricCard.vue'
import './monitoring.css'
import { showMessage } from '@/utils/message'
import { updateUserChart as updateUserTrendChart } from './utils/userTrendChart'
import { updateMailboxChart as updateMailboxTrendChart } from './utils/mailboxTrendChart'
import { updatePvUvChart as updatePvUvTrendChart } from './utils/pvUvTrendChart'
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
const crawlerMonitorRef = ref()

// 统计数据
const overview = ref<any>({})
const userStats = ref<any>({})
const emailActivity = ref<any>({})
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
  bearer_token: 'Bearer',
  miniapp: '小程序',
  public: '匿名',
  other: '其他'
}
const shareSourceLabels: Record<string, string> = {
  api: 'API',
  web: '网页',
  miniapp: '小程序',
  unknown: '未知'
}
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
    value: formatNumber(overview.value.today_stats?.new_users),
    detail: `较昨日 ${formatGrowthRate(overview.value.growth_rates?.new_users)}`
  },
  {
    label: '总用户数',
    value: formatNumber(overview.value.totals?.total_users),
    detail: '累计注册用户'
  },
  {
    label: '系统邮箱今日申请',
    value: formatNumber(overview.value.today_stats?.system_created_today),
    detail: '今日新建邮箱'
  },
  {
    label: '域名邮箱今日申请',
    value: formatNumber(overview.value.today_stats?.hosted_created_today),
    detail: '今日新建邮箱'
  },
  {
    label: '系统邮箱今日收件',
    value: formatNumber(overview.value.today_stats?.system_received_today),
    detail: '今日收到邮件'
  },
  {
    label: '域名邮箱今日收件',
    value: formatNumber(overview.value.today_stats?.hosted_received_today),
    detail: '今日收到邮件'
  },
  {
    label: '第三方邮箱今日收件',
    value: formatNumber(overview.value.today_stats?.external_received_today),
    detail: '今日收到邮件'
  },
  {
    label: '系统邮箱平均申请数',
    value: formatNumber(userStats.value.today_user_apply_stats?.avg_mailboxes_per_person),
    detail: '个/人，按今日申请人数计算'
  }
])
const audienceMetrics = computed(() => [
  {
    label: '当前在线用户（去重）',
    value: formatNumber(businessStats.value.summary?.online_users_now),
    detail: '当前连接中的用户'
  },
  {
    label: '桌面端今日使用人数',
    value: formatNumber(businessStats.value.summary?.desktop_active_users_today),
    detail: '按日去重'
  },
  {
    label: '域名邮箱使用人数',
    value: formatNumber(businessStats.value.summary?.hosted_enabled_users),
    detail: '已启用邮箱用户'
  },
  {
    label: '开放平台 API 已启用用户',
    value: formatNumber(businessStats.value.summary?.api_enabled_users),
    detail: `今日活跃 Key ${businessStats.value.summary?.api_active_keys_today || 0}`
  }
])
const shareMetrics = computed(() =>
  [
    {
      label: '历史分享创建人数',
      key: 'share_users_total',
      detail: '按账号或游客 UUID 去重，含已撤销分享'
    },
    {
      label: `最近 ${businessStatsDays.value} 天使用用户`,
      key: 'share_users_period',
      detail: '整个区间按账号去重'
    },
    {
      label: '其中跨天重复使用',
      key: 'share_repeat_users_period',
      detail: '区间内至少 2 天创建过分享'
    },
    { label: '今日创建分享的用户', key: 'share_users_today', detail: '按用户去重' },
    { label: '今日创建链接', key: 'share_links_created_today', detail: '生成的链接总数' },
    { label: '今日打开过的链接', key: 'share_links_opened_today', detail: '按链接去重' },
    { label: '今日分享访问请求', key: 'share_visits_today', detail: '信息、读信和成功拉取请求' },
    { label: '今日分享访客', key: 'share_visitors_today', detail: '按浏览器匿名标识去重' }
  ].map(({ key, ...metric }) => ({
    ...metric,
    value: formatNumber(businessStats.value.summary?.[key])
  }))
)
const businessTrendColumns = [
  { key: 'desktop_active_users', label: '桌面端人数' },
  { key: 'system_created', label: '系统申请' },
  { key: 'hosted_created', label: '域名申请' },
  { key: 'hosted_received', label: '域名收件' },
  { key: 'external_received', label: '第三方收件' },
  { key: 'system_received', label: '系统收件' },
  { key: 'miniapp_system_received', label: '小程序系统收件' },
  { key: 'miniapp_hosted_received', label: '小程序域名收件' },
  { key: 'miniapp_external_received', label: '小程序第三方收件' },
  { key: 'api_calls', label: '开放平台 API 调用' },
  { key: 'api_active_users', label: '开放平台 API 用户' },
  { key: 'business_api_calls', label: '普通业务 API 调用' },
  { key: 'business_api_active_users', label: '普通业务 API 站内用户' }
]
const shareTrendColumns = [
  { key: 'share_users', label: '创建用户' },
  { key: 'share_first_users_in_period', label: '区间首次' },
  { key: 'share_returning_users_in_period', label: '区间再次' },
  { key: 'share_links_created', label: '创建链接' },
  { key: 'share_links_opened', label: '打开链接' },
  { key: 'share_visits', label: '访问请求' },
  { key: 'share_visitors', label: '分享访客' }
]

// 图表参数
const userStatsDays = ref('7')
const emailStatsDays = ref('7')
const pageAnalyticsDays = ref('7')
const geoMode = ref('china') // 默认显示中国地图
const businessStatsDays = ref('7')
const guestFunnelDays = ref('7')

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
          web_online_users_now: onlineData.web_online_users || 0,
          miniapp_online_users_now: onlineData.miniapp_online_users || 0
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

const stopOnlineRefresh = () => {
  if (onlineRefreshTimer) {
    window.clearInterval(onlineRefreshTimer)
    onlineRefreshTimer = null
  }
}

const configureOnlineRefresh = () => {
  stopOnlineRefresh()
  if (monitoringSection.value === 'business') {
    onlineRefreshTimer = window.setInterval(refreshOnlineCount, 15000)
  }
}

const disposeTrafficCharts = () => {
  userChart?.dispose()
  mailboxChart?.dispose()
  pvUvChart?.dispose()
  mapChart?.dispose()
  userChart = null
  mailboxChart = null
  pvUvChart = null
  mapChart = null
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
  await loadCurrentSectionData()
  configureOnlineRefresh()
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
})

watch(monitoringSection, async (_section, previousSection) => {
  if (previousSection === 'overview') {
    disposeTrafficCharts()
  }
  await nextTick()
  await loadCurrentSectionData()
  configureOnlineRefresh()
})

// 页面卸载时清理
onUnmounted(() => {
  // 移除窗口大小变化监听器
  window.removeEventListener('resize', handleResize)

  disposeTrafficCharts()
  stopOnlineRefresh()
})
</script>
