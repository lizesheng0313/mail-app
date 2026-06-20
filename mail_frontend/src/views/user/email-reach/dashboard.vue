<template>
  <div class="space-y-6">
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-sm text-slate-500">邮件额度</p>
          <p class="mt-1 text-lg font-semibold text-slate-900">剩余和使用情况</p>
        </div>
        <button
          type="button"
          class="rounded-xl bg-primary-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700"
          @click="goToPayment"
        >
          购买邮件
        </button>
      </div>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div class="rounded-2xl bg-gradient-to-br from-white to-primary-50 p-5 shadow-sm ring-1 ring-primary-100">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="text-sm text-gray-500">剩余邮件量</div>
              <div class="mt-3 text-3xl font-semibold text-black">{{ formatNumber(quotaSummary.remaining_quota) }} 封</div>
              <div class="mt-2 text-xs text-gray-500">总额度 {{ formatNumber(quotaSummary.total_quota) }} 封</div>
            </div>
            <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-8 ring-primary-100">
              <span class="text-xl font-semibold text-primary-600">余</span>
            </div>
          </div>
        </div>
        <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="text-sm text-gray-500">累计已发</div>
              <div class="mt-3 text-3xl font-semibold text-black">{{ formatNumber(quotaSummary.used_total) }} 封</div>
              <div class="mt-2 text-xs text-gray-500">累计发送邮件</div>
            </div>
            <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-50 shadow-sm ring-8 ring-emerald-100">
              <span class="text-xl font-semibold text-emerald-600">发</span>
            </div>
          </div>
        </div>
        <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="text-sm text-gray-500">今日已发</div>
              <div class="mt-3 text-3xl font-semibold text-black">{{ formatNumber(quotaSummary.used_today) }} 封</div>
              <div class="mt-2 text-xs text-gray-500">今日已发送邮件</div>
            </div>
            <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-amber-50 shadow-sm ring-8 ring-amber-100">
              <span class="text-xl font-semibold text-amber-600">今</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div>
        <p class="text-sm text-slate-500">回信邮箱</p>
        <p class="mt-1 break-all text-base font-semibold text-slate-900">
          {{ replyTargetEmail || '暂未生成' }}
        </p>
        <p class="mt-1 text-sm text-slate-500">在首页「临时邮箱」中查看客户回复</p>
        <p v-if="replyTargetMessage" class="mt-2 text-sm text-amber-600">
          {{ replyTargetMessage }}
        </p>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div v-for="card in summaryCards" :key="card.label" class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-slate-500">{{ card.label }}</p>
        <p class="mt-3 text-2xl font-semibold text-slate-900">{{ card.value }}</p>
        <p class="mt-2 text-xs text-slate-500">{{ card.desc }}</p>
      </div>
    </div>

    <div v-if="replyNotice.total > 0" class="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-amber-950">有客户回复</p>
          <p class="mt-1 text-sm text-amber-800">{{ replyNoticeText }}</p>
          <p class="mt-1 text-sm text-amber-800">请在首页「临时邮箱」中打开上方回信邮箱查看原始邮件。</p>
        </div>
      </div>
    </div>

    <div class="grid gap-5 xl:grid-cols-2">
      <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="mb-4">
          <p class="text-lg font-semibold text-slate-900">近7天每天发送量</p>
        </div>
        <div v-if="trendRows.length" class="h-72 w-full">
          <div ref="sendTrendChartRef" class="h-full w-full"></div>
        </div>
        <div v-else class="flex h-72 items-center justify-center text-sm text-slate-500">暂无数据</div>
      </div>

      <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="mb-4">
          <p class="text-lg font-semibold text-slate-900">近7天每天退订量</p>
        </div>
        <div v-if="trendRows.length" class="h-72 w-full">
          <div ref="unsubscribeTrendChartRef" class="h-full w-full"></div>
        </div>
        <div v-else class="flex h-72 items-center justify-center text-sm text-slate-500">暂无数据</div>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-slate-500">已发送</p>
        <p class="mt-3 text-2xl font-semibold text-slate-900">{{ formatNumber(overview.sent_count) }}</p>
        <p class="mt-2 text-xs text-slate-500">送达率 {{ overview.delivery_rate || 0 }}%</p>
      </div>
      <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-slate-500">已打开邮件</p>
        <p class="mt-3 text-2xl font-semibold text-slate-900">{{ formatNumber(overview.opened_count) }}</p>
        <p class="mt-2 text-xs text-slate-500">打开率 {{ overview.open_rate || 0 }}%</p>
      </div>
      <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-slate-500">已点击链接</p>
        <p class="mt-3 text-2xl font-semibold text-slate-900">{{ formatNumber(overview.clicked_count) }}</p>
        <p class="mt-2 text-xs text-slate-500">正文链接被点击 {{ overview.click_rate || 0 }}%</p>
      </div>
      <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-slate-500">已回复</p>
        <p class="mt-3 text-2xl font-semibold text-slate-900">{{ formatNumber(overview.replied_count) }}</p>
        <p class="mt-2 text-xs text-slate-500">回复率 {{ overview.reply_rate || 0 }}%</p>
      </div>
    </div>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
      <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-sm text-slate-500">触达漏斗</p>
            <p class="mt-1 text-lg font-semibold text-slate-900">发送到回复</p>
          </div>
          <div class="text-sm text-slate-500">总记录 {{ formatNumber(overview.total_count) }}</div>
        </div>
        <div class="space-y-4">
          <div v-for="item in effectFunnelItems" :key="item.label" class="grid gap-3 sm:grid-cols-[88px,minmax(0,1fr),72px] sm:items-center">
            <div class="text-sm font-medium text-slate-700">{{ item.label }}</div>
            <div class="h-3 overflow-hidden rounded-full bg-slate-100">
              <div class="h-full rounded-full transition-all" :style="{ width: item.width, backgroundColor: item.color }"></div>
            </div>
            <div class="text-right text-sm font-semibold text-slate-900">{{ formatNumber(item.value) }}</div>
          </div>
        </div>
      </div>

      <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="mb-5">
          <p class="text-sm text-slate-500">互动率</p>
          <p class="mt-1 text-lg font-semibold text-slate-900">送达后的表现</p>
        </div>
        <div class="space-y-4">
          <div v-for="item in rateChartItems" :key="item.label">
            <div class="mb-2 flex items-center justify-between text-sm">
              <span class="font-medium text-slate-700">{{ item.label }}</span>
              <span class="font-semibold text-slate-900">{{ item.value }}%</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-slate-100">
              <div class="h-full rounded-full transition-all" :style="{ width: `${clampPercent(item.value)}%`, backgroundColor: item.color }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <AccessAgreementModal
      v-model:visible="protocolVisible"
      :accepted="access.agreement_accepted"
      :loading="agreeSubmitting"
      @confirm="handleAgreementAccept"
      @cancel="handleAgreementDecline"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import * as echarts from 'echarts'
import emailReachApi from '@/api/emailReach'
import { showMessage } from '@/utils/message'
import AccessAgreementModal from './components/AccessAgreementModal.vue'
import { formatDateTime, formatNumber } from './ui'

const access = ref({
  status: 'pending',
  reason: '加载中...',
  email: '',
  enabled: false,
  plan_name: '',
  monthly_fee: 0,
  included_quota: 0,
  overage_price_per_10000: 0,
  billing_currency: 'milk_coin',
  supports_credit_topup: true,
  package_configured: false,
  agreement_accepted: false,
  agreement_accepted_at: null,
  agreement_version: ''
})
const overview = ref({
  total_count: 0,
  sent_count: 0,
  delivered_count: 0,
  opened_count: 0,
  clicked_count: 0,
  replied_count: 0,
  failed_count: 0,
  today_sent: 0,
  today_failed: 0,
  total_sent: 0,
  total_failed: 0,
  complaint_count: 0,
  unsubscribe_count: 0,
  delivery_rate: 0,
  open_rate: 0,
  click_rate: 0,
  reply_rate: 0,
  complaint_rate: 0,
  unsubscribe_rate: 0,
  trend: []
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
  hourly_quota: 0
})
const replyNotice = ref({
  total: 0,
  latest: null
})
const sendTrendChartRef = ref(null)
const unsubscribeTrendChartRef = ref(null)
const protocolVisible = ref(false)
const agreeSubmitting = ref(false)
let sendTrendChart = null
let unsubscribeTrendChart = null

const clampPercent = (value) => Math.max(0, Math.min(100, Number(value || 0)))
const trendRows = computed(() => overview.value.trend || [])
const weeklySent = computed(() => trendRows.value.reduce((sum, item) => sum + Number(item.sent_count || 0), 0))
const weeklyFailed = computed(() => trendRows.value.reduce((sum, item) => sum + Number(item.failed_count || 0), 0))
const replyTargetEmail = computed(() => String(access.value.reply_target?.email_address || '').trim())
const replyTargetMessage = computed(() => String(access.value.reply_target?.message || '').trim())
const replyNoticeText = computed(() => {
  const latest = replyNotice.value.latest || {}
  const sender = String(latest.from_email || '').trim()
  const receivedAt = formatDateTime(latest.received_at)
  const parts = [`共 ${formatNumber(replyNotice.value.total)} 条回复`]
  if (sender) parts.push(`最近来自 ${sender}`)
  if (receivedAt !== '-') parts.push(receivedAt)
  return parts.join('，')
})

const summaryCards = computed(() => [
  {
    label: '今日发送量',
    value: formatNumber(overview.value.today_sent),
    desc: `今日失败 ${formatNumber(overview.value.today_failed)}`
  },
  {
    label: '近7天发送量',
    value: formatNumber(weeklySent.value),
    desc: `近7天失败 ${formatNumber(weeklyFailed.value)}`
  },
  {
    label: '退订量',
    value: formatNumber(overview.value.unsubscribe_count),
    desc: `退订率 ${overview.value.unsubscribe_rate || 0}%`
  },
  {
    label: '举报量',
    value: formatNumber(overview.value.complaint_count),
    desc: `举报率 ${overview.value.complaint_rate || 0}%`
  }
])

const goToPayment = () => {
  window.location.href = '/payment?type=email-package'
}

const handleAgreementAccept = async () => {
  agreeSubmitting.value = true
  try {
    const res = await emailReachApi.acceptAccessAgreement()
    if (res.code === 0) {
      access.value = {
        ...access.value,
        agreement_accepted: true,
        agreement_accepted_at: res.data.agreement_accepted_at,
        agreement_version: res.data.agreement_version || ''
      }
      protocolVisible.value = false
      showMessage('已同意协议', 'success')
    }
  } finally {
    agreeSubmitting.value = false
  }
}

const handleAgreementDecline = () => {
  protocolVisible.value = false
}

const chartMaxCount = computed(() =>
  Math.max(
    Number(overview.value.sent_count || 0),
    Number(overview.value.delivered_count || 0),
    Number(overview.value.opened_count || 0),
    Number(overview.value.clicked_count || 0),
    Number(overview.value.replied_count || 0),
    1
  )
)

const countWidth = (value) => `${clampPercent((Number(value || 0) / chartMaxCount.value) * 100)}%`

const effectFunnelItems = computed(() => [
  { label: '发送', value: overview.value.sent_count, width: countWidth(overview.value.sent_count), color: '#16a34a' },
  { label: '送达', value: overview.value.delivered_count, width: countWidth(overview.value.delivered_count), color: '#0ea5e9' },
  { label: '打开邮件', value: overview.value.opened_count, width: countWidth(overview.value.opened_count), color: '#6366f1' },
  { label: '点击链接', value: overview.value.clicked_count, width: countWidth(overview.value.clicked_count), color: '#f59e0b' },
  { label: '回复', value: overview.value.replied_count, width: countWidth(overview.value.replied_count), color: '#14b8a6' }
])

const rateChartItems = computed(() => [
  { label: '送达率', value: overview.value.delivery_rate || 0, color: '#16a34a' },
  { label: '打开率', value: overview.value.open_rate || 0, color: '#6366f1' },
  { label: '链接点击率', value: overview.value.click_rate || 0, color: '#f59e0b' },
  { label: '回复率', value: overview.value.reply_rate || 0, color: '#14b8a6' }
])

const buildBaseChartOption = (labels, series) => ({
  tooltip: { trigger: 'axis' },
  legend: {
    top: 0,
    textStyle: { color: '#334155' }
  },
  grid: {
    left: 16,
    right: 20,
    top: 44,
    bottom: 12,
    containLabel: true
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: labels,
    axisLine: { lineStyle: { color: '#cbd5e1' } },
    axisLabel: { color: '#64748b' }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#e2e8f0' } },
    axisLabel: { color: '#64748b' }
  },
  series
})

const disposeCharts = () => {
  if (sendTrendChart) {
    sendTrendChart.dispose()
    sendTrendChart = null
  }
  if (unsubscribeTrendChart) {
    unsubscribeTrendChart.dispose()
    unsubscribeTrendChart = null
  }
}

const updateCharts = () => {
  if (!trendRows.value.length) return
  const labels = trendRows.value.map((item) => item.day || '')
  const sentData = trendRows.value.map((item) => Number(item.sent_count || 0))
  const failedData = trendRows.value.map((item) => Number(item.failed_count || 0))
  const unsubscribeData = trendRows.value.map((item) => Number(item.unsubscribe_count || 0))

  if (sendTrendChartRef.value) {
    sendTrendChart = echarts.init(sendTrendChartRef.value)
    sendTrendChart.setOption(
      buildBaseChartOption(labels, [
        {
          name: '成功发送',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 7,
          data: sentData,
          lineStyle: { color: '#16a34a', width: 3 },
          itemStyle: { color: '#16a34a' },
          areaStyle: { color: 'rgba(22,163,74,0.12)' }
        },
        {
          name: '发送失败',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 7,
          data: failedData,
          lineStyle: { color: '#f97316', width: 3 },
          itemStyle: { color: '#f97316' },
          areaStyle: { color: 'rgba(249,115,22,0.10)' }
        }
      ])
    )
  }

  if (unsubscribeTrendChartRef.value) {
    unsubscribeTrendChart = echarts.init(unsubscribeTrendChartRef.value)
    unsubscribeTrendChart.setOption(
      buildBaseChartOption(labels, [
        {
          name: '退订',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 7,
          data: unsubscribeData,
          lineStyle: { color: '#dc2626', width: 3 },
          itemStyle: { color: '#dc2626' },
          areaStyle: { color: 'rgba(220,38,38,0.10)' }
        }
      ])
    )
  }
}

const handleResize = () => {
  if (sendTrendChart) sendTrendChart.resize()
  if (unsubscribeTrendChart) unsubscribeTrendChart.resize()
}

const loadOverview = async () => {
  const res = await emailReachApi.getTrackingOverview()
  if (res.code === 0) {
    overview.value = {
      ...overview.value,
      ...(res.data || {})
    }
    await nextTick()
    disposeCharts()
    updateCharts()
  }
}

const loadQuotaSummary = async () => {
  const res = await emailReachApi.getQuotaSummary()
  if (res.code === 0) {
    quotaSummary.value = {
      ...quotaSummary.value,
      ...(res.data || {})
    }
  }
}

const loadReplyNotice = async () => {
  try {
    const res = await emailReachApi.getReplyEvents(
      { page: 1, limit: 1 },
      { suppressErrorMessage: true }
    )
    if (res.code === 0) {
      replyNotice.value = {
        total: Number(res.data?.total || 0),
        latest: res.data?.items?.[0] || null
      }
    }
  } catch (error) {
    replyNotice.value = { total: 0, latest: null }
  }
}

onMounted(async () => {
  const res = await emailReachApi.getAccessSummary()
  if (res.code === 0) {
    access.value = res.data
    if (access.value.enabled && !access.value.agreement_accepted) {
      protocolVisible.value = true
    }
    await Promise.all([loadOverview(), loadQuotaSummary(), loadReplyNotice()])
    window.addEventListener('resize', handleResize)
  } else {
    showMessage(res.message || '加载失败', 'error')
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  disposeCharts()
})
</script>
