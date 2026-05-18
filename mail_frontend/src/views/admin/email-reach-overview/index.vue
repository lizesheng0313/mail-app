<template>
  <div class="space-y-6">
    <div v-if="warnings.length" class="grid gap-3">
      <div
        v-for="(item, index) in warnings"
        :key="`${item.level}-${index}`"
        :class="item.level === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'"
        class="rounded-lg border px-4 py-3 text-sm"
      >
        {{ item.text }}
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div v-for="card in statCards" :key="card.label" class="rounded-lg border bg-white p-5 shadow-sm">
        <div class="text-sm text-gray-500">{{ card.label }}</div>
        <div class="mt-3 text-3xl font-semibold text-gray-900">{{ card.value }}</div>
        <div class="mt-2 text-xs text-gray-400">{{ card.desc }}</div>
      </div>
    </div>

    <div class="grid gap-4 xl:grid-cols-2">
      <div class="rounded-lg border bg-white p-6 shadow-sm">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-gray-900">发送趋势</h2>
          <p class="mt-1 text-sm text-gray-500">看最近一周成功和失败的发送变化。</p>
        </div>
        <div v-if="trendRows.length" class="h-80 w-full">
          <div ref="sendTrendChartRef" class="h-full w-full" />
        </div>
        <div v-else class="flex h-80 items-center justify-center text-sm text-gray-500">
          暂无趋势数据
        </div>
      </div>

      <div class="rounded-lg border bg-white p-6 shadow-sm">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-gray-900">累计趋势</h2>
          <p class="mt-1 text-sm text-gray-500">看最近一周累计发送和累计失败增长。</p>
        </div>
        <div v-if="trendRows.length" class="h-80 w-full">
          <div ref="cumulativeTrendChartRef" class="h-full w-full" />
        </div>
        <div v-else class="flex h-80 items-center justify-center text-sm text-gray-500">
          暂无趋势数据
        </div>
      </div>
    </div>

    <div class="grid gap-4 xl:grid-cols-2">
      <div class="rounded-lg border bg-white p-6 shadow-sm">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-gray-900">风险概览</h2>
          <p class="mt-1 text-sm text-gray-500">只看当前风险地址和退订量。</p>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <div class="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div class="text-sm text-gray-500">投诉地址</div>
            <div class="mt-2 text-2xl font-semibold text-gray-900">{{ formatNumber(overview.complaint_count) }}</div>
          </div>
          <div class="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div class="text-sm text-gray-500">黑名单地址</div>
            <div class="mt-2 text-2xl font-semibold text-gray-900">{{ formatNumber(overview.blacklist_count) }}</div>
          </div>
          <div class="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div class="text-sm text-gray-500">无效地址</div>
            <div class="mt-2 text-2xl font-semibold text-gray-900">{{ formatNumber(overview.invalid_count) }}</div>
          </div>
          <div class="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div class="text-sm text-gray-500">退订数量</div>
            <div class="mt-2 text-2xl font-semibold text-gray-900">{{ formatNumber(overview.unsubscribe_count) }}</div>
          </div>
        </div>
      </div>

      <div class="rounded-lg border bg-white p-6 shadow-sm">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-gray-900">整体情况</h2>
          <p class="mt-1 text-sm text-gray-500">只看管理员关心的整体量级。</p>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <div class="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div class="text-sm text-gray-500">今日发送量</div>
            <div class="mt-2 text-2xl font-semibold text-gray-900">{{ formatNumber(overview.today_sent) }}</div>
            <div class="mt-1 text-xs text-gray-400">今日失败 {{ formatNumber(overview.today_failed) }}</div>
          </div>
          <div class="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div class="text-sm text-gray-500">累计发送量</div>
            <div class="mt-2 text-2xl font-semibold text-gray-900">{{ formatNumber(overview.total_sent) }}</div>
            <div class="mt-1 text-xs text-gray-400">累计失败 {{ formatNumber(overview.total_failed) }}</div>
          </div>
          <div class="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div class="text-sm text-gray-500">使用账户数</div>
            <div class="mt-2 text-2xl font-semibold text-gray-900">{{ formatNumber(overview.approved_count) }}</div>
            <div class="mt-1 text-xs text-gray-400">总客户 {{ formatNumber(overview.customer_count) }}</div>
          </div>
          <div class="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div class="text-sm text-gray-500">模板总数</div>
            <div class="mt-2 text-2xl font-semibold text-gray-900">{{ formatNumber(overview.template_count) }}</div>
            <div class="mt-1 text-xs text-gray-400">已使用账户 {{ formatNumber(overview.active_sender_count) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import * as echarts from 'echarts'
import emailReachApi from '@/api/emailReach'
import { showMessage } from '@/utils/message'

const overview = ref({})
const sendTrendChartRef = ref(null)
const cumulativeTrendChartRef = ref(null)
let sendTrendChart = null
let cumulativeTrendChart = null

const formatNumber = (value) => Number(value || 0).toLocaleString()

const statCards = computed(() => [
  { label: '使用账户数', value: formatNumber(overview.value.approved_count), desc: `总客户 ${formatNumber(overview.value.customer_count)}` },
  { label: '模板总数', value: formatNumber(overview.value.template_count), desc: `已使用账户 ${formatNumber(overview.value.active_sender_count)}` },
  { label: '今日发送量', value: formatNumber(overview.value.today_sent), desc: `今日失败 ${formatNumber(overview.value.today_failed)}` },
  { label: '累计发送量', value: formatNumber(overview.value.total_sent), desc: `累计失败 ${formatNumber(overview.value.total_failed)}` }
])

const warnings = computed(() => overview.value.warnings || [])
const trendRows = computed(() => overview.value.trend || [])

const buildBaseChartOption = (labels, series) => ({
  tooltip: {
    trigger: 'axis'
  },
  legend: {
    top: 0,
    textStyle: {
      color: '#374151'
    }
  },
  grid: {
    left: 24,
    right: 24,
    top: 48,
    bottom: 24,
    containLabel: true
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: labels,
    axisLine: {
      lineStyle: {
        color: '#D1D5DB'
      }
    },
    axisLabel: {
      color: '#6B7280'
    }
  },
  yAxis: {
    type: 'value',
    splitLine: {
      lineStyle: {
        color: '#E5E7EB'
      }
    },
    axisLabel: {
      color: '#6B7280'
    }
  },
  series
})

const updateCharts = () => {
  if (!trendRows.value.length) return

  const labels = trendRows.value.map((item) => item.day || '')
  const sentData = trendRows.value.map((item) => Number(item.sent_count || 0))
  const failedData = trendRows.value.map((item) => Number(item.failed_count || 0))

  let sentRunning = 0
  let failedRunning = 0
  const sentCumulative = sentData.map((item) => {
    sentRunning += item
    return sentRunning
  })
  const failedCumulative = failedData.map((item) => {
    failedRunning += item
    return failedRunning
  })

  if (sendTrendChartRef.value) {
    sendTrendChart = echarts.init(sendTrendChartRef.value)
    sendTrendChart.setOption(
      buildBaseChartOption(labels, [
        {
          name: '成功发送',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          data: sentData,
          lineStyle: { color: '#22C55E', width: 3 },
          itemStyle: { color: '#22C55E' },
          areaStyle: { color: 'rgba(34,197,94,0.12)' }
        },
        {
          name: '发送失败',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          data: failedData,
          lineStyle: { color: '#F97316', width: 3 },
          itemStyle: { color: '#F97316' },
          areaStyle: { color: 'rgba(249,115,22,0.10)' }
        }
      ])
    )
  }

  if (cumulativeTrendChartRef.value) {
    cumulativeTrendChart = echarts.init(cumulativeTrendChartRef.value)
    cumulativeTrendChart.setOption(
      buildBaseChartOption(labels, [
        {
          name: '累计发送',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          data: sentCumulative,
          lineStyle: { color: '#3B82F6', width: 3 },
          itemStyle: { color: '#3B82F6' },
          areaStyle: { color: 'rgba(59,130,246,0.12)' }
        },
        {
          name: '累计失败',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          data: failedCumulative,
          lineStyle: { color: '#A855F7', width: 3 },
          itemStyle: { color: '#A855F7' },
          areaStyle: { color: 'rgba(168,85,247,0.10)' }
        }
      ])
    )
  }
}

const disposeCharts = () => {
  if (sendTrendChart) {
    sendTrendChart.dispose()
    sendTrendChart = null
  }
  if (cumulativeTrendChart) {
    cumulativeTrendChart.dispose()
    cumulativeTrendChart = null
  }
}

const handleResize = () => {
  if (sendTrendChart) sendTrendChart.resize()
  if (cumulativeTrendChart) cumulativeTrendChart.resize()
}

const loadPageData = async () => {
  try {
    const overviewRes = await emailReachApi.getAdminOverview()
    overview.value = overviewRes.data || {}
    await nextTick()
    disposeCharts()
    updateCharts()
  } catch (error) {
    showMessage(error?.message || '获取邮件触达看板失败', 'error')
  }
}

onMounted(async () => {
  await loadPageData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  disposeCharts()
})
</script>
