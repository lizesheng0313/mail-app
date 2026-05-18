<template>
  <div class="space-y-6">
    <div
      v-if="accessLoaded && access.status !== 'approved' && access.status !== 'trial'"
      class="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900"
    >
      <div class="font-medium">当前账号还没开通邮件触达</div>
      <div class="mt-2">{{ access.reason }}</div>
    </div>

    <template v-if="canOperate">
      <div class="flex justify-end">
        <button
          type="button"
          class="rounded-md bg-primary-600 px-5 py-2 text-sm text-white shadow-sm hover:bg-primary-700"
          @click="goToPayment"
        >
          购买邮件
        </button>
      </div>

      <div class="grid gap-4 xl:grid-cols-3 md:grid-cols-2">
        <div class="rounded-2xl bg-gradient-to-br from-white to-primary-50 p-5 shadow-sm ring-1 ring-primary-100">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="text-sm text-gray-500">剩余邮件量</div>
              <div class="mt-3 text-3xl font-semibold text-black">{{ formatNumber(quotaSummary.remaining_quota) }}</div>
            </div>
            <div class="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-8 ring-primary-100">
              <span class="text-xl font-semibold text-primary-600">余</span>
            </div>
          </div>
        </div>
        <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="text-sm text-gray-500">累计已发</div>
              <div class="mt-3 text-3xl font-semibold text-black">{{ formatNumber(quotaSummary.used_total) }}</div>
            </div>
            <div class="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 shadow-sm ring-8 ring-emerald-100">
              <span class="text-xl font-semibold text-emerald-600">发</span>
            </div>
          </div>
        </div>
        <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="text-sm text-gray-500">今日已发</div>
              <div class="mt-3 text-3xl font-semibold text-black">{{ formatNumber(quotaSummary.used_today) }}</div>
            </div>
            <div class="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 shadow-sm ring-8 ring-amber-100">
              <span class="text-xl font-semibold text-amber-600">今</span>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div class="rounded-lg border bg-white p-6 shadow-sm">
          <div class="mb-4 flex items-center justify-between gap-4">
            <div>
              <div class="text-base font-semibold text-black">近7天发送量</div>
              <div class="mt-1 text-sm text-gray-500">看最近一周邮件发送趋势</div>
            </div>
          </div>
          <div class="h-44 w-full">
            <div ref="sendTrendRef" class="h-full w-full"></div>
          </div>
        </div>

        <div class="rounded-lg border bg-white p-6 shadow-sm">
          <div class="mb-4 flex items-center justify-between gap-4">
            <div>
              <div class="text-base font-semibold text-black">近7天退订数</div>
              <div class="mt-1 text-sm text-gray-500">看最近一周退订变化</div>
            </div>
          </div>
          <div class="h-44 w-full">
            <div ref="unsubscribeTrendRef" class="h-full w-full"></div>
          </div>
        </div>

        <div class="rounded-lg border bg-white p-6 shadow-sm">
          <div class="mb-4 flex items-center justify-between gap-4">
            <div>
              <div class="text-base font-semibold text-black">近7天失败量</div>
              <div class="mt-1 text-sm text-gray-500">看最近一周发送失败变化</div>
            </div>
          </div>
          <div class="h-44 w-full">
            <div ref="failedTrendRef" class="h-full w-full"></div>
          </div>
        </div>

        <div class="rounded-lg border bg-white p-6 shadow-sm">
          <div class="mb-4 flex items-center justify-between gap-4">
            <div>
              <div class="text-base font-semibold text-black">近7天拦截量</div>
              <div class="mt-1 text-sm text-gray-500">看最近一周被系统拦截的数量</div>
            </div>
          </div>
          <div class="h-44 w-full">
            <div ref="blockedTrendRef" class="h-full w-full"></div>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup>
import * as echarts from 'echarts'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import emailReachApi from '@/api/emailReach'

const accessLoaded = ref(false)
const access = ref({
  status: 'pending',
  reason: ''
})
const quotaSummary = ref({
  remaining_quota: 0,
  total_quota: 0,
  base_quota: 0,
  extra_quota: 0,
  used_total: 0,
  used_today: 0,
  next_expire_at: null,
  price_per_10000: 0,
  daily_quota: 0,
  hourly_quota: 0,
  single_batch_limit: 0
})
const sendTrendRef = ref(null)
const unsubscribeTrendRef = ref(null)
const failedTrendRef = ref(null)
const blockedTrendRef = ref(null)
let sendTrendChart = null
let unsubscribeTrendChart = null
let failedTrendChart = null
let blockedTrendChart = null
const sevenDaySentTotal = ref(0)
const sevenDayUnsubscribeTotal = ref(0)
const sevenDayFailedTotal = ref(0)
const sevenDayBlockedTotal = ref(0)

const canOperate = computed(() => access.value.status === 'approved' || access.value.status === 'trial')

const formatNumber = (value) => Number(value || 0).toLocaleString()

const formatDayLabel = (date) => {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${month}-${day}`
}

const buildLast7DayBuckets = (rows, timeKey) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const labels = []
  const counts = []
  const bucketMap = new Map()

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const key = formatDayLabel(date)
    labels.push(key)
    counts.push(0)
    bucketMap.set(key, labels.length - 1)
  }

  ;(rows || []).forEach((row) => {
    const rawTime = Number(row?.[timeKey] || row?.updated_at || 0)
    if (!rawTime) return
    const current = new Date(rawTime)
    current.setHours(0, 0, 0, 0)
    const key = formatDayLabel(current)
    const index = bucketMap.get(key)
    if (index === undefined) return
    counts[index] += 1
  })

  return { labels, counts }
}

const renderTrendChart = (container, chartInstance, options) => {
  if (!container) return chartInstance
  if (chartInstance) {
    chartInstance.dispose()
  }
  const chart = echarts.init(container)
  chart.setOption(options)
  setTimeout(() => {
    chart.resize()
  }, 100)
  return chart
}

const createTrendOption = ({ labels, counts, color }) => ({
  grid: { left: '10%', right: '5%', top: '14%', bottom: '14%' },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: labels,
    axisLine: { lineStyle: { color: '#e5e7eb' } },
    axisTick: { show: false },
    axisLabel: { color: '#6b7280' }
  },
  yAxis: {
    type: 'value',
    minInterval: 1,
    axisLine: { lineStyle: { color: '#e5e7eb' } },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: '#f1f5f9' } },
    axisLabel: { color: '#9ca3af' }
  },
  series: [
    {
      data: counts,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      showSymbol: true,
      lineStyle: { width: 3, color },
      itemStyle: { color },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: `${color}33` },
          { offset: 1, color: `${color}08` }
        ])
      }
    }
  ]
})

const updateTrendCharts = async (records = [], unsubscribes = []) => {
  await nextTick()

  const sentRecords = records.filter((item) => item?.status === 'sent')
  const failedRecords = records.filter((item) => item?.status === 'failed')
  const blockedRecords = records.filter((item) => item?.status === 'blocked')
  const sendTrend = buildLast7DayBuckets(sentRecords, 'sent_at')
  const unsubscribeTrend = buildLast7DayBuckets(unsubscribes, 'created_at')
  const failedTrend = buildLast7DayBuckets(failedRecords, 'updated_at')
  const blockedTrend = buildLast7DayBuckets(blockedRecords, 'updated_at')

  sevenDaySentTotal.value = sendTrend.counts.reduce((sum, item) => sum + item, 0)
  sevenDayUnsubscribeTotal.value = unsubscribeTrend.counts.reduce((sum, item) => sum + item, 0)
  sevenDayFailedTotal.value = failedTrend.counts.reduce((sum, item) => sum + item, 0)
  sevenDayBlockedTotal.value = blockedTrend.counts.reduce((sum, item) => sum + item, 0)

  setTimeout(() => {
    sendTrendChart = renderTrendChart(sendTrendRef.value, sendTrendChart, createTrendOption({
      labels: sendTrend.labels,
      counts: sendTrend.counts,
      color: '#16a34a'
    }))

    unsubscribeTrendChart = renderTrendChart(unsubscribeTrendRef.value, unsubscribeTrendChart, createTrendOption({
      labels: unsubscribeTrend.labels,
      counts: unsubscribeTrend.counts,
      color: '#f97316'
    }))

    failedTrendChart = renderTrendChart(failedTrendRef.value, failedTrendChart, createTrendOption({
      labels: failedTrend.labels,
      counts: failedTrend.counts,
      color: '#f59e0b'
    }))

    blockedTrendChart = renderTrendChart(blockedTrendRef.value, blockedTrendChart, createTrendOption({
      labels: blockedTrend.labels,
      counts: blockedTrend.counts,
      color: '#64748b'
    }))
  }, 100)
}

const loadPageData = async () => {
  const [accessRes, quotaRes, recordRes, unsubscribeRes] = await Promise.all([
    emailReachApi.getAccessSummary(),
    emailReachApi.getQuotaSummary(),
    emailReachApi.getSendRecords(),
    emailReachApi.getUnsubscribes()
  ])
  accessLoaded.value = true
  if (accessRes.code === 0) {
    access.value = accessRes.data || access.value
  }
  if (quotaRes.code === 0) {
    quotaSummary.value = quotaRes.data || quotaSummary.value
  }
  if (recordRes.code === 0 || unsubscribeRes.code === 0) {
    const recordItems = Array.isArray(recordRes.data)
      ? recordRes.data
      : Array.isArray(recordRes.data?.items)
        ? recordRes.data.items
        : []
    const unsubscribeItems = Array.isArray(unsubscribeRes.data)
      ? unsubscribeRes.data
      : Array.isArray(unsubscribeRes.data?.items)
        ? unsubscribeRes.data.items
        : []
    await updateTrendCharts(recordItems, unsubscribeItems)
  }
}

const goToPayment = () => {
  window.location.href = '/payment?type=email-package'
}

onMounted(async () => {
  await loadPageData()
  window.addEventListener('resize', handleResize)
})

const handleResize = () => {
  sendTrendChart?.resize()
  unsubscribeTrendChart?.resize()
  failedTrendChart?.resize()
  blockedTrendChart?.resize()
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  sendTrendChart?.dispose()
  unsubscribeTrendChart?.dispose()
  failedTrendChart?.dispose()
  blockedTrendChart?.dispose()
  sendTrendChart = null
  unsubscribeTrendChart = null
  failedTrendChart = null
  blockedTrendChart = null
})
</script>
