<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 rounded-lg border border-blue-100 bg-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-base font-semibold text-gray-900">第三方邮箱成功接入统计</h2>
        <p class="mt-1 text-sm text-gray-600">
          按当前仍保留的第三方邮箱首次成功保存时间统计，不把后台自动收信和重复同步计算为登录。
        </p>
      </div>
      <div class="flex items-center gap-3">
        <CustomSelect
          v-model="days"
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
          class="rounded-md border border-primary-200 bg-white px-3 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="loading"
          @click="loadStats"
        >
          {{ loading ? '刷新中...' : '刷新' }}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-lg border border-emerald-100 bg-emerald-50 p-5">
        <p class="text-sm text-gray-600">今日成功接入</p>
        <p class="mt-2 text-3xl font-bold text-gray-900">{{ formatNumber(summary.today_connected_mailboxes) }}</p>
        <p class="mt-1 text-xs text-gray-500">涉及 {{ formatNumber(summary.today_unique_owners) }} 位用户</p>
      </div>
      <div class="rounded-lg border border-blue-100 bg-blue-50 p-5">
        <p class="text-sm text-gray-600">所选周期接入</p>
        <p class="mt-2 text-3xl font-bold text-gray-900">{{ formatNumber(summary.connected_mailboxes) }}</p>
        <p class="mt-1 text-xs text-gray-500">涉及 {{ formatNumber(summary.unique_owners) }} 位用户</p>
      </div>
      <div class="rounded-lg border border-violet-100 bg-violet-50 p-5">
        <p class="text-sm text-gray-600">OAuth 登录</p>
        <p class="mt-2 text-3xl font-bold text-gray-900">{{ formatNumber(summary.oauth_mailboxes) }}</p>
        <p class="mt-1 text-xs text-gray-500">密码/授权码 {{ formatNumber(summary.password_mailboxes) }}</p>
      </div>
      <div class="rounded-lg border border-amber-100 bg-amber-50 p-5">
        <p class="text-sm text-gray-600">邮箱公司</p>
        <p class="mt-2 text-3xl font-bold text-gray-900">{{ formatNumber(summary.provider_count) }}</p>
        <p class="mt-1 text-xs text-gray-500">当前正常 {{ formatNumber(summary.active_mailboxes) }} 个</p>
      </div>
    </div>

    <section class="rounded-lg border bg-white p-6 shadow-sm">
      <div class="mb-5 flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">邮箱公司分布</h3>
          <p class="mt-1 text-sm text-gray-500">按成功接入账号数排序</p>
        </div>
        <span class="text-sm text-gray-500">
          {{ stats.period?.start_date || '--' }} 至 {{ stats.period?.end_date || '--' }}
        </span>
      </div>

      <div v-if="providers.length" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
              <p class="text-2xl font-bold text-gray-900">{{ formatNumber(provider.connected_mailboxes) }}</p>
              <p class="text-xs text-gray-500">{{ provider.share_percent || 0 }}%</p>
            </div>
          </div>
          <div class="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-center text-xs">
            <div>
              <p class="font-semibold text-gray-900">{{ formatNumber(provider.unique_owners) }}</p>
              <p class="text-gray-500">用户</p>
            </div>
            <div>
              <p class="font-semibold text-gray-900">{{ formatNumber(provider.oauth_mailboxes) }}</p>
              <p class="text-gray-500">OAuth</p>
            </div>
            <div>
              <p class="font-semibold text-gray-900">{{ formatNumber(provider.password_mailboxes) }}</p>
              <p class="text-gray-500">密码</p>
            </div>
          </div>
        </article>
      </div>
      <div v-else class="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-12 text-center text-sm text-gray-500">
        所选周期暂无第三方邮箱接入数据
      </div>
    </section>

    <section class="rounded-lg border bg-white p-6 shadow-sm">
      <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">每日成功接入</h3>
          <p class="mt-1 text-sm text-gray-500">
            默认隐藏没有接入记录的日期，减少无效信息
          </p>
        </div>
        <button
          v-if="hiddenEmptyDayCount"
          type="button"
          class="self-start rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 sm:self-auto"
          @click="showEmptyDays = !showEmptyDays"
        >
          {{ showEmptyDays ? '隐藏无接入日期' : `显示全部日期（含 ${hiddenEmptyDayCount} 天无接入）` }}
        </button>
      </div>

      <div v-if="displayedDaily.length" class="space-y-3">
        <article
          v-for="item in displayedDaily"
          :key="item.date"
          class="rounded-xl border p-5 transition-colors"
          :class="item.connected_mailboxes ? 'border-gray-200 bg-white hover:border-primary-200' : 'border-gray-100 bg-gray-50'"
        >
          <div class="grid gap-5 lg:grid-cols-[140px_180px_220px_minmax(0,1fr)] lg:items-center">
            <div class="border-b border-gray-100 pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-5">
              <p class="text-lg font-semibold text-gray-900">{{ formatMonthDay(item.date) }}</p>
              <p class="mt-1 text-xs text-gray-500">{{ formatWeekday(item.date) }} · {{ item.date.slice(0, 4) }}年</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-gray-500">接入邮箱</p>
                <p class="mt-1 text-2xl font-bold" :class="item.connected_mailboxes ? 'text-gray-900' : 'text-gray-400'">
                  {{ formatNumber(item.connected_mailboxes) }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-500">用户数</p>
                <p class="mt-1 text-2xl font-bold" :class="item.unique_owners ? 'text-gray-900' : 'text-gray-400'">
                  {{ formatNumber(item.unique_owners) }}
                </p>
              </div>
            </div>

            <div>
              <p class="text-xs text-gray-500">登录方式</p>
              <div v-if="item.oauth_mailboxes || item.password_mailboxes" class="mt-2 space-y-2 text-sm">
                <div v-if="item.oauth_mailboxes" class="flex items-center justify-between gap-4">
                  <span class="flex items-center gap-2 text-gray-700">
                    <span class="h-2 w-2 rounded-full bg-violet-500"></span>
                    OAuth
                  </span>
                  <span class="font-semibold text-gray-900">{{ formatNumber(item.oauth_mailboxes) }} 个</span>
                </div>
                <div v-if="item.password_mailboxes" class="flex items-center justify-between gap-4">
                  <span class="flex items-center gap-2 text-gray-700">
                    <span class="h-2 w-2 rounded-full bg-blue-500"></span>
                    密码/授权码
                  </span>
                  <span class="font-semibold text-gray-900">{{ formatNumber(item.password_mailboxes) }} 个</span>
                </div>
              </div>
              <p v-else class="mt-2 text-sm text-gray-400">当天无接入</p>
            </div>

            <div class="min-w-0 rounded-lg bg-gray-50 px-4 py-3">
              <p class="text-xs text-gray-500">邮箱公司</p>
              <div v-if="item.provider_breakdown?.length" class="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                <div
                  v-for="(provider, index) in item.provider_breakdown"
                  :key="provider.key"
                  class="flex min-w-0 items-center justify-between gap-3 text-sm"
                >
                  <span class="flex min-w-0 items-center gap-2 text-gray-700">
                    <span class="h-2 w-2 flex-shrink-0 rounded-full" :class="providerDotClass(index)"></span>
                    <span class="truncate">{{ provider.name }}</span>
                  </span>
                  <span class="flex-shrink-0 font-semibold text-gray-900">{{ provider.count }} 个</span>
                </div>
              </div>
              <p v-else class="mt-2 text-sm text-gray-400">—</p>
            </div>
          </div>
        </article>
      </div>
      <div v-else class="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
        所选周期暂无第三方邮箱接入记录
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { monitoringAPI } from '@/api/monitoring'
import CustomSelect from '@/components/CustomSelect/index.vue'
import { showMessage } from '@/utils/message'

const days = ref('30')
const loading = ref(false)
const showEmptyDays = ref(false)
const stats = ref<any>({ summary: {}, providers: [], daily: [], period: {} })

const summary = computed(() => stats.value.summary || {})
const providers = computed(() => stats.value.providers || [])
const reversedDaily = computed(() => [...(stats.value.daily || [])].reverse())
const activeDaily = computed(() =>
  reversedDaily.value.filter((item: any) => Number(item.connected_mailboxes || 0) > 0)
)
const hiddenEmptyDayCount = computed(() => reversedDaily.value.length - activeDaily.value.length)
const displayedDaily = computed(() => showEmptyDays.value ? reversedDaily.value : activeDaily.value)

const formatNumber = (value: number | string | undefined | null) => {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number.toLocaleString('zh-CN') : '0'
}

const parseDailyDate = (value: string) => new Date(`${value}T00:00:00`)

const formatMonthDay = (value: string) => {
  const date = parseDailyDate(value)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

const formatWeekday = (value: string) => {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return weekdays[parseDailyDate(value).getDay()]
}

const providerDotClass = (index: number) => {
  const classes = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500']
  return classes[index % classes.length]
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
