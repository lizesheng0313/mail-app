<template>
  <div class="monitoring-page monitoring-content">
    <div class="monitoring-panel">
      <div class="monitoring-panel-header mb-0">
        <div class="monitoring-panel-heading">
          <h2 class="monitoring-panel-title">第三方邮箱成功接入统计</h2>
        </div>
        <div class="flex shrink-0 items-center gap-3">
          <CustomSelect
            v-model="days"
            class="monitoring-period"
            size="sm"
            :options="[
              { value: '7', label: '最近7天' },
              { value: '14', label: '最近14天' },
              { value: '30', label: '最近30天' },
              { value: '90', label: '最近90天' }
            ]"
            @update:modelValue="loadStats"
          />
          <button
            type="button"
            class="h-10 shrink-0 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
            @click="loadStats"
          >
            {{ loading ? '刷新中...' : '刷新' }}
          </button>
        </div>
      </div>
    </div>

    <div class="monitoring-metrics">
      <MetricCard label="今日成功接入" :value="formatNumber(summary.today_connected_mailboxes)" />
      <MetricCard label="所选周期接入" :value="formatNumber(summary.connected_mailboxes)" />
      <MetricCard label="所选周期接入用户" :value="formatNumber(summary.unique_owners)" />
      <MetricCard label="周期内接入且正常" :value="formatNumber(summary.active_mailboxes)" />
    </div>

    <section class="monitoring-panel">
      <div class="monitoring-panel-header">
        <div>
          <h3 class="monitoring-panel-title">邮箱公司分布</h3>
          <p class="mt-1 text-sm text-gray-500">{{ formatNumber(summary.provider_count) }} 家</p>
        </div>
        <span class="text-sm text-gray-500">
          {{ stats.period?.start_date || '--' }} 至 {{ stats.period?.end_date || '--' }}
        </span>
      </div>

      <div v-if="providers.length" class="monitoring-providers">
        <article
          v-for="(provider, index) in providers"
          :key="provider.key"
          class="rounded-lg border border-gray-200 p-4"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span
                  class="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                  :class="providerBadgeClass(index)"
                >
                  {{ index + 1 }}
                </span>
                <h4 class="truncate font-semibold text-gray-900">{{ provider.name }}</h4>
              </div>
              <p v-if="provider.domains?.length" class="mt-3 truncate text-xs text-gray-500">
                {{ provider.domains.slice(0, 3).join('、') }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-2xl font-bold text-gray-900">
                {{ formatNumber(provider.connected_mailboxes) }}
              </p>
              <p class="text-xs text-gray-500">{{ provider.share_percent || 0 }}%</p>
            </div>
          </div>
          <div
            class="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-center text-xs"
          >
            <div>
              <p class="font-semibold text-gray-900">{{ formatNumber(provider.unique_owners) }}</p>
              <p class="text-gray-500">用户</p>
            </div>
            <div>
              <p class="font-semibold text-gray-900">
                {{ formatNumber(provider.oauth_mailboxes) }}
              </p>
              <p class="text-gray-500">OAuth</p>
            </div>
            <div>
              <p class="font-semibold text-gray-900">
                {{ formatNumber(provider.password_mailboxes) }}
              </p>
              <p class="text-gray-500">密码</p>
            </div>
          </div>
        </article>
      </div>
      <div
        v-else
        class="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-12 text-center text-sm text-gray-500"
      >
        所选周期暂无第三方邮箱接入数据
      </div>
    </section>

    <div class="monitoring-charts">
      <section class="monitoring-panel">
        <div class="monitoring-panel-header">
          <div class="monitoring-panel-heading">
            <h3 class="monitoring-panel-title">每日成功接入邮箱</h3>
          </div>
          <div class="flex shrink-0 gap-1">
            <button
              v-for="mode in dailyModes"
              :key="mode.value"
              type="button"
              class="rounded-md px-3 py-1.5 text-xs font-medium"
              :class="
                dailyMode === mode.value
                  ? 'bg-primary-50 text-primary-700'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              "
              :aria-pressed="dailyMode === mode.value"
              @click="dailyMode = mode.value"
            >
              {{ mode.label }}
            </button>
          </div>
        </div>
        <DailyTrendChart :rows="dailyRows" :series="dailySeries" label="每日成功接入邮箱" />
      </section>
      <section class="monitoring-panel">
        <div class="monitoring-panel-header">
          <div class="monitoring-panel-heading">
            <h3 class="monitoring-panel-title">每日成功接入用户</h3>
          </div>
        </div>
        <DailyTrendChart :rows="stats.daily || []" :series="ownerSeries" label="每日成功接入用户" />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { monitoringAPI } from '@/api/monitoring'
import CustomSelect from '@/components/CustomSelect/index.vue'
import MetricCard from '@/components/Monitoring/MetricCard.vue'
import DailyTrendChart from '@/components/Monitoring/DailyTrendChart.vue'
import type { TrendSeries } from '@/components/Monitoring/dailyTrendOptions'
import './monitoring.css'
import { showMessage } from '@/utils/message'

const days = ref('30')
const loading = ref(false)
const dailyMode = ref('auth')
const dailyModes = [
  { value: 'auth', label: '按接入方式' },
  { value: 'provider', label: '按邮箱公司' }
]
const ownerSeries: TrendSeries[] = [{ key: 'unique_owners', label: '接入用户', unit: '人' }]
const stats = ref<any>({ summary: {}, providers: [], daily: [], period: {} })

const summary = computed(() => stats.value.summary || {})
const providers = computed(() => stats.value.providers || [])
const dailyRows = computed(() =>
  (stats.value.daily || []).map((day: any) => ({
    ...day,
    ...Object.fromEntries(
      (day.provider_breakdown || []).map((provider: any) => [
        `provider_${provider.key}`,
        provider.count
      ])
    )
  }))
)
const dailySeries = computed<TrendSeries[]>(() =>
  dailyMode.value === 'provider'
    ? providers.value.map((provider: any) => ({
        key: `provider_${provider.key}`,
        label: provider.name,
        type: 'bar',
        stack: 'mailboxes',
        unit: '个'
      }))
    : [
        { key: 'oauth_mailboxes', label: 'OAuth', type: 'bar', stack: 'mailboxes', unit: '个' },
        {
          key: 'password_mailboxes',
          label: '密码 / 授权码',
          type: 'bar',
          stack: 'mailboxes',
          unit: '个'
        }
      ]
)

const formatNumber = (value: number | string | undefined | null) => {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number.toLocaleString('zh-CN') : '0'
}

const providerBadgeClass = (index: number) => {
  const classes = [
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-violet-100 text-violet-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700'
  ]
  return classes[index % classes.length]
}

const loadStats = async () => {
  loading.value = true
  try {
    const response: any = await monitoringAPI.getExternalMailboxLogins(parseInt(days.value))
    if (response.code === 0) {
      stats.value = response.data || { summary: {}, providers: [], daily: [], period: {} }
    } else {
      showMessage(response.message || '获取第三方邮箱接入统计失败', 'error')
    }
  } catch (error) {
    console.error('加载第三方邮箱接入统计失败:', error)
    showMessage('获取第三方邮箱接入统计失败', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(loadStats)
</script>
