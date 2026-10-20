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
      <div class="monitoring-metrics monitoring-subsection">
        <MetricCard label="今日成功接入" :value="formatNumber(summary.today_connected_mailboxes)" />
        <MetricCard label="所选周期接入" :value="formatNumber(summary.connected_mailboxes)" />
        <MetricCard label="所选周期接入用户" :value="formatNumber(summary.unique_owners)" />
        <MetricCard label="周期内接入且正常" :value="formatNumber(summary.active_mailboxes)" />
      </div>
    </div>

    <div class="monitoring-charts">
      <section class="monitoring-panel">
        <div class="monitoring-panel-header">
          <h3 class="monitoring-panel-title">每日接入邮箱 · 按邮箱公司</h3>
        </div>
        <DailyTrendChart
          :rows="dailyRows"
          :series="providerSeries"
          label="每日接入邮箱 · 按邮箱公司"
        />
      </section>
      <section class="monitoring-panel">
        <div class="monitoring-panel-header">
          <h3 class="monitoring-panel-title">每日接入邮箱 · 按接入方式</h3>
        </div>
        <DailyTrendChart
          :rows="stats.daily || []"
          :series="authSeries"
          label="每日接入邮箱 · 按接入方式"
        />
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
const authSeries: TrendSeries[] = [
  { key: 'oauth_mailboxes', label: 'OAuth', type: 'line', unit: '个' },
  { key: 'password_mailboxes', label: '密码 / 授权码', type: 'line', unit: '个' }
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
const providerSeries = computed<TrendSeries[]>(() =>
  providers.value.map((provider: any) => ({
    key: `provider_${provider.key}`,
    label: provider.name,
    type: 'line',
    unit: '个'
  }))
)

const formatNumber = (value: number | string | undefined | null) => {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number.toLocaleString('zh-CN') : '0'
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
