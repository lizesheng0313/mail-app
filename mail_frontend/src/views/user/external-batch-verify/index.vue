<template>
  <div class="flex h-full min-h-0 flex-col gap-4 pb-4">
    <section class="flex-shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-4">
          <label class="inline-flex cursor-pointer items-center gap-3 text-sm text-slate-700">
            <input v-model="verifySmtp" type="checkbox" class="mailbox-checkbox h-4 w-4 flex-shrink-0 cursor-pointer" />
            同时验证 SMTP
          </label>
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-slate-700">代理</span>
            <div class="w-[220px]">
              <CustomSelect
                v-model="selectedProxyId"
                :options="proxySelectOptions"
                placeholder="不使用代理"
              />
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="inline-flex items-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
            :disabled="failedRows.length === 0 || verifying"
            @click="retryFailedItems"
          >
            重试失败项{{ failedRows.length > 0 ? `(${failedRows.length})` : '' }}
          </button>
          <button
            type="button"
            class="inline-flex items-center rounded-xl border border-primary-200 bg-white px-4 py-2.5 text-sm font-medium text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
            :disabled="promotableRows.length === 0 || promoting"
            @click="importSuccessAccounts"
          >
            {{ promoting ? '导入中...' : `导入成功账号${successRows.length > 0 ? `(${promotableRows.length})` : ''}` }}
          </button>
          <button
            type="button"
            class="inline-flex items-center rounded-xl border border-primary-200 bg-white px-4 py-2.5 text-sm font-medium text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
            :disabled="filteredExportRows.length === 0"
            @click="exportExcel()"
          >
            导出结果
          </button>
          <button
            type="button"
            class="inline-flex items-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-600 disabled:opacity-50"
            :disabled="verifying"
            @click="startVerify"
          >
            <svg v-if="verifying" class="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.35" stroke-width="2.5" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
            </svg>
            {{ verifying ? '验号中...' : '开始验号' }}
          </button>
        </div>
      </div>
    </section>

    <div
      class="grid min-h-0 flex-1 gap-4"
      :class="showSidePanel ? 'xl:grid-cols-2' : 'grid-cols-1'"
    >
      <section class="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <h2 class="text-base font-semibold text-slate-900">账号导入</h2>
          <p class="mt-1 text-sm text-slate-500">支持一行一个账号，兼容现有批量添加格式</p>
        </div>
          <button
            type="button"
            class="flex-shrink-0 whitespace-nowrap text-sm font-medium text-slate-500 transition hover:text-slate-700"
            @click="clearAll"
          >
            清空
          </button>
        </div>

        <textarea
          v-model="rawText"
          class="mt-4 min-h-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100"
          placeholder="demo1@gmail.com,app_password_1,auto&#10;demo2@outlook.com----password_2----imap&#10;demo3@qq.com,password_3,pop3"
        />
      </section>

      <section
        v-if="showSidePanel"
        class="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div class="flex-shrink-0">
          <template v-if="showLivePanel">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-base font-semibold text-slate-900">验号结果</h2>
              </div>
              <span class="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                {{ liveSummaryText }}
              </span>
            </div>
            <div class="mt-4 grid grid-cols-3 gap-2">
              <div class="rounded-xl bg-slate-50 px-3 py-2">
                <p class="text-xs text-slate-500">总数</p>
                <p class="mt-1 text-sm font-semibold text-slate-900">{{ liveProgress.total }}</p>
              </div>
              <div class="rounded-xl bg-primary-50 px-3 py-2">
                <p class="text-xs text-primary-700">通过</p>
                <p class="mt-1 text-sm font-semibold text-primary-700">{{ liveProgress.success }}</p>
              </div>
              <div class="rounded-xl bg-red-50 px-3 py-2">
                <p class="text-xs text-red-700">失败</p>
                <p class="mt-1 text-sm font-semibold text-red-700">{{ liveProgress.failed }}</p>
              </div>
            </div>
            <div class="mt-4 flex flex-wrap items-center gap-2">
              <div class="w-[120px]">
                <CustomSelect
                  v-model="resultFilter"
                  :options="resultFilterOptions"
                  placeholder="全部结果"
                />
              </div>
              <div
                v-if="availableFailureReasons.length > 0 && resultFilter !== 'success'"
                class="w-[180px]"
              >
                <CustomSelect
                  v-model="failureReasonFilter"
                  :options="failureReasonOptions"
                  placeholder="全部原因"
                />
              </div>
            </div>
            <div class="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                class="h-full rounded-full bg-primary-600 transition-all duration-300"
                :style="{ width: `${progressPercent}%` }"
              ></div>
            </div>
          </template>
          <template v-else>
            <h2 class="text-base font-semibold text-slate-900">异常账号</h2>
            <p class="mt-1 text-sm text-slate-500">这些账号当前不能进入验号</p>
          </template>
        </div>

        <div class="mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2">
          <div
            v-if="sidePanelItems.length === 0"
            class="flex h-full items-center justify-center text-sm text-slate-400"
          >
            {{ showLivePanel ? '等待验号结果' : '暂无异常账号' }}
          </div>
          <div v-else class="h-full space-y-1 overflow-y-auto pr-1">
          <div
            v-for="item in sidePanelItems"
            :key="item.id"
            class="group flex items-center gap-2 rounded-xl px-2 py-1.5 transition"
            :class="resolvePanelRowClass(item)"
          >
            <span
              class="flex w-4 flex-shrink-0 items-center justify-center text-sm font-semibold"
              :class="resolvePanelIconClass(item)"
            >
              {{ resolvePanelIconText(item) }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate font-mono text-sm text-slate-900">
                {{ item.email || '未识别邮箱' }}
              </p>
            </div>
            <div
              v-if="showLivePanel && item.status === 'success'"
              class="flex flex-shrink-0 items-center gap-1.5"
            >
              <span
                class="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium"
                :class="resolveProtocolBadgeClass(item)"
              >
                {{ resolveProtocolBadge(item) }}
              </span>
              <span
                v-if="resolveSmtpBadge(item)"
                class="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium"
                :class="item.smtp_verified ? 'border-primary-200 bg-primary-50 text-primary-700' : 'border-red-200 bg-red-50 text-red-700'"
              >
                {{ resolveSmtpBadge(item) }}
              </span>
            </div>
            <div
              v-if="!(showLivePanel && item.status === 'success')"
              class="relative max-w-[160px] flex-shrink-0 text-right"
            >
              <p
                class="truncate text-xs"
                :class="showLivePanel && item.status === 'error' ? 'text-red-600' : 'text-slate-500'"
              >
                {{ resolvePanelShortMessage(item) }}
              </p>
              <div
                v-if="resolvePanelTooltip(item)"
                class="invisible absolute right-0 top-full z-10 mt-1 max-w-[220px] rounded-lg bg-slate-800 px-2 py-1 text-left text-xs text-white shadow-lg group-hover:visible"
              >
                {{ resolvePanelTooltip(item) }}
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import * as XLSX from 'xlsx'
import externalVerifyPoolAPI from '@/api/externalVerifyPool'
import mailboxProxyApi from '@/api/mailboxProxy'
import { isTauri } from '@/services/api'
import { showMessage } from '@/utils/message'
import CustomSelect from '@/components/CustomSelect/index.vue'

const SUPPORTED_PROTOCOLS = ['auto', 'imap', 'pop3']
const rawText = ref('')
const verifying = ref(false)
const promoting = ref(false)
const verifySmtp = ref(true)
const selectedProxyId = ref<number | ''>('')
const proxyOptions = ref<any[]>([])
const exportRows = ref<any[]>([])
const currentBatchNo = ref('')
const resultFilter = ref<'all' | 'success' | 'failed'>('all')
const failureReasonFilter = ref('')
const liveResults = ref<any[]>([])
const liveProgress = ref({
  total: 0,
  completed: 0,
  success: 0,
  failed: 0,
  currentEmail: ''
})
const GOOGLE_OAUTH_TOKEN_DOMAIN_SUFFIXES = ['gmail.com', 'googlemail.com']
const MICROSOFT_OAUTH_TOKEN_DOMAIN_SUFFIXES = ['outlook.', 'hotmail.', 'live.', 'msn.', 'live.cn']

const getTauriInvoke = async () => {
  if (!isTauri()) return null
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke
  } catch {
    return null
  }
}

const proxySelectOptions = computed(() => {
  const options = (proxyOptions.value || []).map((item: any) => ({
    label: item.endpoint ? `${item.name} (${item.endpoint})` : item.name,
    value: item.id
  }))
  return [{ label: '不使用代理', value: '' }, ...options]
})

const loadProxyOptions = async () => {
  try {
    const response: any = await mailboxProxyApi.getOptions()
    if (response.code !== 0) return
    proxyOptions.value = Array.isArray(response?.data?.proxies) ? response.data.proxies : []
  } catch {
    proxyOptions.value = []
  }
}

const loadSelectedRuntimeProxy = async () => {
  if (!selectedProxyId.value) return null
  const response: any = await mailboxProxyApi.previewRuntimeProxy({
    proxy_id: Number(selectedProxyId.value)
  })
  if (response.code !== 0) return null
  return response?.data?.runtime_proxy || null
}

const isOAuthTokenDomain = (domain: string) => {
  const normalizedDomain = String(domain || '').toLowerCase().trim()
  if (!normalizedDomain) return false

  if (
    GOOGLE_OAUTH_TOKEN_DOMAIN_SUFFIXES.some(
      (suffix) => normalizedDomain === suffix || normalizedDomain.endsWith(`.${suffix}`)
    )
  ) {
    return true
  }

  return MICROSOFT_OAUTH_TOKEN_DOMAIN_SUFFIXES.some(
    (suffix) =>
      normalizedDomain === suffix ||
      normalizedDomain.startsWith(suffix) ||
      normalizedDomain.endsWith(`.${suffix}`)
  )
}

const parseVerifyLines = (text: string) =>
  String(text || '')
    .split('\n')
    .map((line, index) => {
      const rawLine = line.trim()
      if (!rawLine) return null

      const parts = rawLine.split(/[\s]+|[-]{2,}|[—–]+|[,，]/).filter((part) => part.trim())

      const email = String(parts[0] || '').trim()
      const domain = (email.split('@')[1] || '').toLowerCase()
      const isOAuthToken = parts.length >= 4 && isOAuthTokenDomain(domain)
      const password = String(parts.length >= 3 && !isOAuthToken ? parts[2] : parts[1] || '').trim()
      const oauthClientId = String(parts[2] || '').trim()
      const oauthRefreshToken = String(parts[3] || '').trim()
      const protocol = 'auto'
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

      if (!validEmail) {
        return {
          id: `${index}-invalid-email`,
          email,
          protocol,
          valid: false,
          reason: '邮箱格式不对'
        }
      }

      if (!password) {
        return {
          id: `${index}-invalid-password`,
          email,
          protocol,
          valid: false,
          reason: '缺少密码或授权码'
        }
      }

      if (isOAuthToken && (!oauthClientId || !oauthRefreshToken)) {
        return {
          id: `${index}-${email}`,
          email,
          password,
          protocol,
          valid: false,
          reason: 'OAuth Token 缺少 client_id 或 refresh_token'
        }
      }

      return {
        id: `${index}-${email}`,
        email,
        password,
        auth_type: isOAuthToken ? 'oauth2' : 'password',
        oauth_provider: isOAuthToken ? (domain.includes('gmail') || domain.includes('googlemail') ? 'google' : 'microsoft') : null,
        oauth_client_id: isOAuthToken ? oauthClientId : null,
        oauth_refresh_token: isOAuthToken ? oauthRefreshToken : null,
        protocol,
        valid: true,
        reason: ''
      }
    })
    .filter(Boolean)

const parsedItems = computed(() => parseVerifyLines(rawText.value))
const validItems = computed(() => parsedItems.value.filter((item: any) => item.valid))
const invalidItems = computed(() => parsedItems.value.filter((item: any) => !item.valid))
const successRows = computed(() => exportRows.value.filter((item: any) => item.verify_status === 'success'))
const failedRows = computed(() => exportRows.value.filter((item: any) => item.verify_status === 'failed'))
const promotableRows = computed(() => successRows.value.filter((item: any) => item.import_status !== 'imported'))
const showLivePanel = computed(() => verifying.value || liveResults.value.length > 0)
const showSidePanel = computed(() => showLivePanel.value || invalidItems.value.length > 0)
const filteredLiveResults = computed(() => {
  let rows = [...liveResults.value]
  if (resultFilter.value === 'success') {
    rows = rows.filter((item: any) => item.status === 'success')
  } else if (resultFilter.value === 'failed') {
    rows = rows.filter((item: any) => item.status === 'error')
  }
  if (failureReasonFilter.value) {
    rows = rows.filter((item: any) => simplifyErrorMessage(item.message || '') === failureReasonFilter.value)
  }
  return rows
})
const availableFailureReasons = computed(() => {
  const reasons = liveResults.value
    .filter((item: any) => item.status === 'error')
    .map((item: any) => simplifyErrorMessage(item.message || ''))
    .filter(Boolean)
  return Array.from(new Set(reasons))
})
const resultFilterOptions = [
  { label: '全部结果', value: 'all' },
  { label: '只看成功', value: 'success' },
  { label: '只看失败', value: 'failed' }
]
const failureReasonOptions = computed(() => [
  { label: '全部原因', value: '' },
  ...availableFailureReasons.value.map((reason) => ({
    label: reason,
    value: reason
  }))
])
const filteredExportRows = computed(() => {
  let rows = [...exportRows.value]
  if (resultFilter.value === 'success') {
    rows = rows.filter((item: any) => item.verify_status === 'success')
  } else if (resultFilter.value === 'failed') {
    rows = rows.filter((item: any) => item.verify_status === 'failed')
  }
  if (failureReasonFilter.value) {
    rows = rows.filter(
      (item: any) => simplifyErrorMessage(item.error_message || item.verify_message || '') === failureReasonFilter.value
    )
  }
  return rows
})
const sidePanelItems = computed(() => {
  if (showLivePanel.value) return filteredLiveResults.value
  return invalidItems.value.slice(0, 200)
})
const progressPercent = computed(() => {
  if (!liveProgress.value.total) return 0
  return Math.min(100, Math.round((liveProgress.value.completed / liveProgress.value.total) * 100))
})
const progressText = computed(() => {
  if (!liveProgress.value.total) return '等待开始验号'
  return `${liveProgress.value.completed}/${liveProgress.value.total} · 已完成`
})
const liveSummaryText = computed(() => `通过 ${liveProgress.value.success} · 失败 ${liveProgress.value.failed}`)

const formatProtocol = (protocol: string) => {
  if (protocol === 'auto') return '自动识别'
  return String(protocol || '').toUpperCase()
}

const clearAll = () => {
  rawText.value = ''
  exportRows.value = []
  currentBatchNo.value = ''
  resultFilter.value = 'all'
  failureReasonFilter.value = ''
  liveResults.value = []
  liveProgress.value = {
    total: 0,
    completed: 0,
    success: 0,
    failed: 0,
    currentEmail: ''
  }
}

const resolvePanelRowClass = (item: any) => {
  if (showLivePanel.value) {
    if (item.status === 'success') return 'bg-primary-50'
    if (item.status === 'error') return 'bg-red-50'
    if (item.status === 'running') return 'bg-primary-50'
    return 'bg-white'
  }
  return 'bg-red-50'
}

const resolvePanelIconClass = (item: any) => {
  if (showLivePanel.value) {
    if (item.status === 'success') return 'text-primary-600'
    if (item.status === 'error') return 'text-red-600'
    if (item.status === 'running') return 'text-primary-600'
    return 'text-slate-400'
  }
  return 'text-red-600'
}

const resolvePanelIconText = (item: any) => {
  if (showLivePanel.value) {
    if (item.status === 'success') return '✓'
    if (item.status === 'error') return '✗'
    if (item.status === 'running') return '●'
    return '⋯'
  }
  return '!'
}

const simplifyErrorMessage = (message: string) => {
  const text = String(message || '').trim()
  if (!text) return '验证失败'

  if (text.includes('邮箱或授权码错误') || text.includes('邮箱或密码错误')) return '账号或授权码错误'
  if (text.includes('IMAP 和 POP3 均登录失败')) return 'IMAP/POP3 登录失败'
  if (text.includes('IMAP') && text.includes('登录失败')) return 'IMAP 登录失败'
  if (text.includes('POP3') && text.includes('登录失败')) return 'POP3 登录失败'
  if (text.includes('SMTP') && text.includes('不可发')) return 'SMTP 不可发'
  if (text.includes('SMTP') && text.includes('失败')) return 'SMTP 连接失败'
  if (text.includes('超时') || text.toLowerCase().includes('timed out')) return '连接超时'
  if (text.includes('proxy') || text.includes('代理')) return '代理连接失败'
  if (text.includes('SSL') || text.includes('证书')) return 'SSL 连接失败'

  return text.split(/[：:，。,；;\n]/)[0]?.trim() || '验证失败'
}

const compactDetailMessage = (message: string) => {
  const text = String(message || '').trim()
  if (!text) return '验证失败'

  if (text.includes('IMAP 和 POP3 均登录失败')) {
    if (text.includes('邮箱或授权码错误') || text.includes('邮箱或密码错误')) {
      return 'IMAP/POP3 均失败，账号或授权码错误'
    }
    return 'IMAP/POP3 均失败'
  }

  if (text.includes('IMAP') && text.includes('邮箱或授权码错误')) return 'IMAP 失败，账号或授权码错误'
  if (text.includes('POP3') && text.includes('邮箱或授权码错误')) return 'POP3 失败，账号或授权码错误'
  if (text.includes('SMTP') && text.includes('不可发')) return 'SMTP 不可发'
  if (text.includes('SMTP') && text.includes('失败')) return 'SMTP 连接失败'
  if (text.includes('超时') || text.toLowerCase().includes('timed out')) return '连接超时'
  if (text.includes('proxy') || text.includes('代理')) return '代理连接失败'
  if (text.includes('SSL') || text.includes('证书')) return 'SSL 连接失败'

  return simplifyErrorMessage(text)
}

const resolveProtocolBadge = (item: any) => {
  const protocol = item.resolved_protocol || item.protocol || item.input_protocol || ''
  return formatProtocol(protocol)
}

const resolveProtocolBadgeClass = (item: any) => {
  const protocol = String(item.resolved_protocol || item.protocol || item.input_protocol || '').toLowerCase()
  if (protocol === 'imap') return 'border-sky-200 bg-sky-50 text-sky-700'
  if (protocol === 'pop3') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-violet-200 bg-violet-50 text-violet-700'
}

const resolveSmtpBadge = (item: any) => {
  if (!verifySmtp.value) return ''
  if (item.smtp_verified === true) return 'SMTP 可发'
  if (item.smtp_verified === false) return 'SMTP 失败'
  if (String(item.message || '').includes('SMTP 可发')) return 'SMTP 可发'
  if (String(item.message || '').includes('SMTP 不可发')) return 'SMTP 失败'
  return ''
}

const resolvePanelTooltip = (item: any) => {
  if (showLivePanel.value) {
    if (item.status === 'success') return ''
    if (item.status === 'running' || item.status === 'pending') return ''
    if (item.status === 'error') return compactDetailMessage(item.message || '')
    return item.message || '等待验号'
  }
  return compactDetailMessage(item.reason || '')
}

const resolvePanelShortMessage = (item: any) => {
  if (showLivePanel.value) {
    if (item.status === 'running') return '验证中'
    if (item.status === 'pending') return '等待验证'
    if (item.status === 'error') return simplifyErrorMessage(item.message || '')
    return ''
  }
  return simplifyErrorMessage(item.reason || '')
}

const buildLiveResultItem = (item: any) => ({
  id: item.id,
  email: item.email,
  protocol: item.resolved_protocol || item.protocol || item.input_protocol || '',
  resolved_protocol: item.resolved_protocol || null,
  smtp_verified: Boolean(item.smtp_verified),
  status: item.verify_status === 'success' ? 'success' : item.verify_status === 'failed' ? 'error' : 'pending',
  message: item.verify_status === 'success'
    ? (item.smtp_verified
      ? '验号通过，SMTP 可发'
      : verifySmtp.value
        ? `验号通过，SMTP 不可发${item.smtp_error ? `：${item.smtp_error}` : ''}`
        : '验号通过')
    : (item.error_message || item.verify_message || '等待验号')
})

const loadBatchRows = async (batchNo: string) => {
  if (!batchNo) return
  const response: any = await externalVerifyPoolAPI.getBatchResults(batchNo)
  if (response.code !== 0) return
  const rows = Array.isArray(response?.data?.items) ? response.data.items : []
  exportRows.value = rows
  liveResults.value = rows.map((item: any) => buildLiveResultItem(item))
}

const formatServerValue = (host?: string, port?: number | string) => {
  const normalizedHost = String(host || '').trim()
  const normalizedPort = Number(port || 0)
  if (!normalizedHost) return ''
  return normalizedPort > 0 ? `${normalizedHost}:${normalizedPort}` : normalizedHost
}

const formatExportTimestamp = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}_${hours}${minutes}${seconds}`
}

const exportExcel = async () => {
  const targetRows = filteredExportRows.value

  if (targetRows.length === 0) {
    showMessage('当前筛选下没有可导出的结果', 'warning')
    return
  }

  const rows = targetRows.map((item: any) => ({
    邮箱: item.email || '',
    密码: item.password || '',
    IMAP: formatServerValue(item.imap_host, item.imap_port),
    POP3: formatServerValue(item.pop3_host, item.pop3_port),
    SMTP: formatServerValue(item.smtp_host, item.smtp_port),
    验号状态: item.verify_status === 'success' ? '成功' : item.verify_status === 'failed' ? '失败' : '待验',
    失败原因: item.verify_status === 'failed' ? simplifyErrorMessage(item.error_message || item.verify_message || '') : ''
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [
    { wch: 30 }, { wch: 22 }, { wch: 28 }, { wch: 28 }, { wch: 28 }, { wch: 12 }, { wch: 24 }
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '批量验号结果')
  const timestamp = formatExportTimestamp()
  const resultSuffix = resultFilter.value === 'success' ? '成功' : resultFilter.value === 'failed' ? '失败' : '全部'
  const reasonSuffix = failureReasonFilter.value ? `_${failureReasonFilter.value}` : ''
  const defaultFileName = `批量验号${resultSuffix}结果${reasonSuffix}_${timestamp}.xlsx`

  try {
    if (isTauri()) {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeFile } = await import('@tauri-apps/plugin-fs')
      const savePath = await save({
        defaultPath: defaultFileName,
        filters: [{ name: 'Excel', extensions: ['xlsx'] }]
      })
      if (!savePath) return
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      await writeFile(savePath, new Uint8Array(buffer))
      showMessage('导出成功', 'success')
      return
    }

    XLSX.writeFile(wb, defaultFileName)
    showMessage('导出成功', 'success')
  } catch (error) {
    console.error('导出验号结果失败', error)
    showMessage('导出失败，请重试', 'error')
  }
}

const importSuccessAccounts = async () => {
  if (promotableRows.value.length === 0) {
    showMessage('当前没有可导入的成功账号', 'warning')
    return
  }

  promoting.value = true
  try {
    const response: any = await externalVerifyPoolAPI.promoteCandidates({
      ids: promotableRows.value.map((item: any) => item.id),
      proxy_id: selectedProxyId.value ? Number(selectedProxyId.value) : null
    })
    if (response.code !== 0) return

    const importedCount = Number(response?.data?.imported_count || 0)
    const skippedCount = Number(response?.data?.skipped_count || 0)
    const promoteItems = Array.isArray(response?.data?.items) ? response.data.items : []
    const duplicateSkippedCount = promoteItems.filter((item: any) => item.status === 'skipped' && String(item.message || '').includes('已存在同名账号')).length
    const otherSkippedCount = Math.max(0, skippedCount - duplicateSkippedCount)
    if (currentBatchNo.value) {
      await loadBatchRows(currentBatchNo.value)
    }
    const summary = [`导入完成：成功 ${importedCount}`]
    if (duplicateSkippedCount > 0) summary.push(`重复跳过 ${duplicateSkippedCount}`)
    if (otherSkippedCount > 0) summary.push(`其它跳过 ${otherSkippedCount}`)
    showMessage(summary.join('，'), importedCount > 0 ? 'success' : 'warning')
  } finally {
    promoting.value = false
  }
}

const runImportedVerification = async (importedItems: any[], batchNo: string, preserveExisting = false, selectedRuntimeProxy: any = null) => {
  if (!importedItems.length) return
  resultFilter.value = 'all'
  failureReasonFilter.value = ''
  if (preserveExisting && liveResults.value.length > 0) {
    const retryIds = new Set(importedItems.map((item: any) => item.id))
    const retryRows = importedItems.map((item: any) => ({
      id: item.id,
      email: item.email,
      protocol: item.input_protocol || item.protocol || '',
      resolved_protocol: null,
      smtp_verified: false,
      status: 'pending',
      message: '等待验号'
    }))
    const keepRows = liveResults.value.filter((item: any) => !retryIds.has(item.id))
    liveResults.value = [...retryRows, ...keepRows]
  } else {
    liveResults.value = importedItems.map((item: any) => ({
      id: item.id,
      email: item.email,
      protocol: item.input_protocol || item.protocol || '',
      resolved_protocol: null,
      smtp_verified: false,
      status: 'pending',
      message: '等待验号'
    }))
  }
  liveProgress.value = {
    total: importedItems.length,
    completed: 0,
    success: 0,
    failed: 0,
    currentEmail: ''
  }

  verifying.value = true
  try {
    const verifyResults = []
    const passwordItems = importedItems.filter((item: any) => String(item?.auth_type || 'password') !== 'oauth2')
    const oauthItems = importedItems.filter((item: any) => String(item?.auth_type || '') === 'oauth2')
    const tauriInvoke = passwordItems.length > 0 ? await getTauriInvoke() : null

    if (passwordItems.length > 0 && !tauriInvoke) {
      showMessage('账号密码类批量验号需要在桌面端客户端里操作', 'warning')
      return
    }

    for (const item of passwordItems) {
      liveProgress.value.currentEmail = item.email
      const currentLiveItem = liveResults.value.find((entry: any) => entry.id === item.id)
      if (currentLiveItem) {
        currentLiveItem.status = 'running'
        currentLiveItem.message = '正在连接邮箱'
      }
      const protocol = String(item?.input_protocol || 'auto').toLowerCase() || 'auto'
      const host = protocol === 'imap' ? item?.imap_host : protocol === 'pop3' ? item?.pop3_host : null
      const port = protocol === 'imap' ? item?.imap_port : protocol === 'pop3' ? item?.pop3_port : null

      try {
        const result: any = await tauriInvoke('add_external_mailbox', {
          email: item.email,
          password: item.password,
          protocol,
          host: host || null,
          port: port || null,
          verifySmtp: verifySmtp.value,
          proxy: selectedRuntimeProxy || item.runtime_proxy || null
        })

        if (result?.success) {
          if (currentLiveItem) {
            currentLiveItem.status = 'success'
            currentLiveItem.protocol = String(result?.protocol || protocol || 'auto').toLowerCase()
            currentLiveItem.resolved_protocol = String(result?.protocol || protocol || 'auto').toLowerCase()
            currentLiveItem.smtp_verified = Boolean(result?.smtp_verified)
            currentLiveItem.message = result?.smtp_verified
              ? '验号通过，SMTP 可发'
              : verifySmtp.value
                ? `验号通过，SMTP 不可发${result?.smtp_error ? `：${result.smtp_error}` : ''}`
                : '验号通过'
          }
          verifyResults.push({
            candidate_id: item.id,
            success: true,
            protocol: String(result?.protocol || protocol || 'auto').toLowerCase(),
            host: result?.host || null,
            port: Number(result?.port || 0) || null,
            smtp_verified: Boolean(result?.smtp_verified),
            smtp_host: result?.smtp_host || null,
            smtp_port: Number(result?.smtp_port || 0) || null,
            smtp_error: result?.smtp_error || null,
            verify_message: result?.message || '验号成功'
          })
        } else {
          if (currentLiveItem) {
            currentLiveItem.status = 'error'
            currentLiveItem.protocol = protocol
            currentLiveItem.resolved_protocol = null
            currentLiveItem.smtp_verified = false
            currentLiveItem.message = result?.message || '验号失败'
          }
          verifyResults.push({
            candidate_id: item.id,
            success: false,
            protocol,
            error_message: result?.message || '验号失败'
          })
        }
      } catch (error: any) {
        if (currentLiveItem) {
          currentLiveItem.status = 'error'
          currentLiveItem.protocol = protocol
          currentLiveItem.resolved_protocol = null
          currentLiveItem.smtp_verified = false
          currentLiveItem.message = String(error?.message || error || '验号失败')
        }
        verifyResults.push({
          candidate_id: item.id,
          success: false,
          protocol,
          error_message: String(error?.message || error || '验号失败')
        })
      }
      liveProgress.value.completed += 1
      liveProgress.value.success = liveResults.value.filter((entry: any) => entry.status === 'success').length
      liveProgress.value.failed = liveResults.value.filter((entry: any) => entry.status === 'error').length
    }

    if (oauthItems.length > 0) {
      for (const item of oauthItems) {
        liveProgress.value.currentEmail = item.email
        const currentLiveItem = liveResults.value.find((entry: any) => entry.id === item.id)
        if (currentLiveItem) {
          currentLiveItem.status = 'running'
          currentLiveItem.message = '正在验证 OAuth Token'
        }

        const oauthVerifyResponse: any = await externalVerifyPoolAPI.verifyOAuthCandidates({
          ids: [item.id],
          verify_smtp: verifySmtp.value
        })
        if (oauthVerifyResponse.code !== 0) return

        const result = Array.isArray(oauthVerifyResponse?.data?.items) ? oauthVerifyResponse.data.items[0] : null
        if (result) {
          verifyResults.push(result)
          if (currentLiveItem) {
            currentLiveItem.status = result.success ? 'success' : 'error'
            currentLiveItem.protocol = String(result?.protocol || item?.input_protocol || 'auto').toLowerCase()
            currentLiveItem.resolved_protocol = result.success
              ? String(result?.protocol || item?.input_protocol || 'auto').toLowerCase()
              : null
            currentLiveItem.smtp_verified = Boolean(result?.smtp_verified)
            currentLiveItem.message = result.success
              ? (result.smtp_verified ? 'OAuth 验号通过，SMTP 可发' : verifySmtp.value ? `OAuth 验号通过，SMTP 不可发${result.smtp_error ? `：${result.smtp_error}` : ''}` : 'OAuth 验号通过')
              : (result.error_message || 'OAuth 验号失败')
          }
        } else if (currentLiveItem) {
          currentLiveItem.status = 'error'
          currentLiveItem.resolved_protocol = null
          currentLiveItem.smtp_verified = false
          currentLiveItem.message = 'OAuth 验号失败'
        }

        liveProgress.value.completed += 1
        liveProgress.value.success = liveResults.value.filter((entry: any) => entry.status === 'success').length
        liveProgress.value.failed = liveResults.value.filter((entry: any) => entry.status === 'error').length
      }
    }

    if (verifyResults.some((item: any) => Object.prototype.hasOwnProperty.call(item, 'candidate_id') && Object.prototype.hasOwnProperty.call(item, 'protocol'))) {
      const saveResponse: any = await externalVerifyPoolAPI.saveVerifyResults({
        items: verifyResults.filter((item: any) => Object.prototype.hasOwnProperty.call(item, 'protocol'))
      })
      if (saveResponse.code !== 0) return
    }

    currentBatchNo.value = String(batchNo || '').trim()
    if (currentBatchNo.value) {
      await loadBatchRows(currentBatchNo.value)
    }

    const successCount = verifyResults.filter((item) => item.success).length
    const failedCount = verifyResults.length - successCount
    const smtpCount = verifyResults.filter((item) => item.success && item.smtp_verified).length
    const smtpMessage = verifySmtp.value ? `，SMTP可发 ${smtpCount}` : ''
    showMessage(`验号完成：成功 ${successCount}，失败 ${failedCount}${smtpMessage}`, successCount > 0 ? 'success' : 'warning')
  } finally {
    liveProgress.value.currentEmail = ''
    verifying.value = false
  }
}

const startVerify = async () => {
  if (validItems.value.length === 0) {
    showMessage('先导入可验账号', 'warning')
    return
  }

  const importResponse: any = await externalVerifyPoolAPI.importCandidates({
    accounts: validItems.value.map((item: any) => ({
      email: item.email,
      password: item.password,
      protocol: item.protocol,
      auth_type: item.auth_type || 'password',
      oauth_provider: item.oauth_provider || null,
      oauth_client_id: item.oauth_client_id || null,
      oauth_refresh_token: item.oauth_refresh_token || null
    }))
  })

  if (importResponse.code !== 0) return

  const importedItems = Array.isArray(importResponse?.data?.items) ? importResponse.data.items : []
  if (!importedItems.length) {
    showMessage('没有可进入验号的账号', 'warning')
    return
  }

  const batchNo = String(importResponse?.data?.batch_no || '').trim()
  const selectedRuntimeProxy = await loadSelectedRuntimeProxy()
  if (selectedProxyId.value && !selectedRuntimeProxy) {
    showMessage('所选代理当前不可用，请更换后重试', 'warning')
    return
  }
  await runImportedVerification(importedItems, batchNo, false, selectedRuntimeProxy)
}

const retryFailedItems = async () => {
  if (failedRows.value.length === 0) {
    showMessage('当前没有可重试的失败项', 'warning')
    return
  }

  const importResponse: any = await externalVerifyPoolAPI.importCandidates({
    batch_no: currentBatchNo.value || undefined,
    accounts: failedRows.value.map((item: any) => ({
      email: item.email,
      password: item.password,
      protocol: item.input_protocol || item.resolved_protocol || item.protocol || 'auto',
      auth_type: item.auth_type || 'password',
      oauth_provider: item.oauth_provider || null,
      oauth_client_id: item.oauth_client_id || null,
      oauth_refresh_token: item.oauth_refresh_token || null,
      pop3_host: item.pop3_host || null,
      pop3_port: item.pop3_port || null,
      imap_host: item.imap_host || null,
      imap_port: item.imap_port || null
    }))
  })

  if (importResponse.code !== 0) return

  const importedItems = Array.isArray(importResponse?.data?.items) ? importResponse.data.items : []
  if (!importedItems.length) {
    showMessage('没有可重试的失败项', 'warning')
    return
  }

  const batchNo = String(importResponse?.data?.batch_no || currentBatchNo.value || '').trim()
  const selectedRuntimeProxy = await loadSelectedRuntimeProxy()
  if (selectedProxyId.value && !selectedRuntimeProxy) {
    showMessage('所选代理当前不可用，请更换后重试', 'warning')
    return
  }
  await runImportedVerification(importedItems, batchNo, true, selectedRuntimeProxy)
}

onMounted(async () => {
  await loadProxyOptions()
})
</script>

<style scoped>
.mailbox-checkbox {
  appearance: none;
  -webkit-appearance: none;
  border: 2px solid #d1d5db;
  border-radius: 3px;
  background-color: white;
  position: relative;
}

.mailbox-checkbox:checked {
  background-color: rgb(var(--color-primary-500));
  border-color: rgb(var(--color-primary-500));
}

.mailbox-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
</style>
