<template>
  <Teleport to="body">
    <div v-if="props.visible" class="fixed inset-0 z-[1200] bg-black/20 p-4 sm:p-6">
      <div class="mx-auto flex h-full w-full max-w-5xl items-center justify-center">
        <div class="flex max-h-[88vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
          <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h3 class="text-lg font-semibold text-slate-900">{{ t('batchAdd.title') }}</h3>
            <button @click="handleClose" class="text-slate-400 transition hover:text-slate-600">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-5">
            <div class="grid min-h-0 flex-1 gap-4" :class="showSidePanel ? 'grid-cols-[minmax(0,1.2fr)_360px]' : 'grid-cols-1'">
              <section class="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white">
                <div class="border-b border-slate-100 px-5 py-4">
                  <div class="flex items-start justify-between gap-4">
                    <div class="min-w-0">
                      <h2 class="text-base font-semibold text-slate-900">{{ t('batchAdd.inputLabel') }}</h2>
                      <p class="mt-1 text-sm text-slate-500">支持一行一个账号，兼容现有批量添加格式</p>
                    </div>
                    <button
                      type="button"
                      class="flex-shrink-0 whitespace-nowrap text-sm font-medium text-slate-500 transition hover:text-slate-700"
                      @click="accountsText = ''"
                    >
                      清空
                    </button>
                  </div>

                </div>

                <div class="min-h-0 flex-1 p-5">
                  <textarea
                    v-model="accountsText"
                    :placeholder="t('batchAdd.inputPlaceholder')"
                    class="h-full min-h-[360px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm leading-6 text-slate-900 outline-none transition focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100"
                  ></textarea>
                </div>
              </section>

              <section
                v-if="showSidePanel"
                class="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white"
              >
                <div class="border-b border-slate-100 px-5 py-4">
                  <div class="flex items-center justify-between gap-3">
                    <h2 class="text-base font-semibold text-slate-900">
                      {{ showLivePanel ? t('batchAdd.resultLabel') : '格式异常' }}
                    </h2>
                    <span
                      v-if="showLivePanel"
                      class="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700"
                    >
                      {{ progressSummaryText }}
                    </span>
                  </div>

                  <div v-if="showLivePanel" class="mt-4 grid grid-cols-3 gap-2">
                    <div class="rounded-xl bg-slate-50 px-3 py-2">
                      <p class="text-xs text-slate-500">总数</p>
                      <p class="mt-1 text-sm font-semibold text-slate-900">{{ totalCount }}</p>
                    </div>
                    <div class="rounded-xl bg-primary-50 px-3 py-2">
                      <p class="text-xs text-primary-700">成功</p>
                      <p class="mt-1 text-sm font-semibold text-primary-700">{{ successCount }}</p>
                    </div>
                    <div class="rounded-xl bg-red-50 px-3 py-2">
                      <p class="text-xs text-red-700">失败</p>
                      <p class="mt-1 text-sm font-semibold text-red-700">{{ errorCount }}</p>
                    </div>
                  </div>

                  <div v-if="showLivePanel" class="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div class="h-full rounded-full bg-primary-600 transition-all duration-300" :style="{ width: `${progressPercent}%` }"></div>
                  </div>
                </div>

                <div class="min-h-0 flex-1 p-3">
                  <div class="h-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2">
                    <div v-if="sidePanelRows.length === 0" class="flex h-full items-center justify-center text-sm text-slate-400">
                      {{ showLivePanel ? t('batchAdd.resultEmpty') : '暂无格式异常账号' }}
                    </div>
                    <div v-else class="h-full space-y-1 overflow-y-auto pr-1">
                      <div
                        v-for="(result, idx) in sidePanelRows"
                        :key="`${result.email}-${idx}`"
                        class="group flex items-center gap-2 rounded-xl px-2 py-2 transition"
                        :class="result.status === 'error' ? 'bg-red-50' : result.status === 'success' ? 'bg-primary-50' : result.status === 'skipped' ? 'bg-amber-50' : ''"
                      >
                        <span
                          class="flex w-4 flex-shrink-0 items-center justify-center text-sm font-semibold"
                          :class="result.status === 'success' ? 'text-primary-700' : result.status === 'error' ? 'text-red-600' : result.status === 'skipped' ? 'text-amber-600' : 'text-slate-400'"
                        >
                          {{ result.status === 'success' ? '✓' : result.status === 'error' ? '✗' : result.status === 'skipped' ? '－' : '⋯' }}
                        </span>
                        <div class="min-w-0 flex-1">
                          <p class="truncate font-mono text-sm text-slate-900">{{ result.email }}</p>
                        </div>
                        <div class="relative max-w-[180px] flex-shrink-0 text-right">
                          <p class="truncate text-xs" :class="result.status === 'error' ? 'text-red-600' : result.status === 'skipped' ? 'text-amber-700' : 'text-slate-500'">
                            {{ result.message || resolveResultStatusText(result.status) }}
                          </p>
                          <div
                            v-if="result.message && showLivePanel"
                            class="invisible absolute right-0 top-full z-10 mt-1 max-w-[220px] rounded-lg bg-slate-800 px-2 py-1 text-left text-xs text-white shadow-lg group-hover:visible"
                          >
                            {{ result.message }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <template v-if="oauthAccounts.length > 0">
              <section class="flex-shrink-0 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h4 class="text-sm font-semibold text-amber-900">OAuth 授权</h4>
                    <p class="mt-1 text-sm text-amber-700">{{ t('batchAdd.oauthNotice') }}</p>
                  </div>
                  <button
                    type="button"
                    class="inline-flex items-center rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-600 disabled:opacity-50"
                    :disabled="isOAuthAuthorizing || !hasOAuthPending"
                    @click="startOAuthAuthorization"
                  >
                    {{ oauthPrimaryButtonText }}
                  </button>
                </div>

                <div class="mt-4 max-h-44 overflow-y-auto rounded-2xl border border-amber-200 bg-white p-2">
                  <div
                    v-for="(item, idx) in oauthAccounts"
                    :key="item.email"
                    class="flex items-center gap-3 rounded-xl px-3 py-2"
                    :class="getOAuthRowClass(item.status)"
                  >
                    <span class="w-5 flex-shrink-0 text-center text-xs text-slate-400">{{ idx + 1 }}</span>
                    <span class="flex w-4 flex-shrink-0 items-center justify-center text-sm font-semibold"
                      :class="item.status === 'success' ? 'text-primary-700' : item.status === 'error' ? 'text-red-600' : item.status === 'authorizing' ? 'text-primary-600' : 'text-slate-400'">
                      {{ item.status === 'success' ? '✓' : item.status === 'error' ? '✗' : item.status === 'authorizing' ? '⋯' : '○' }}
                    </span>
                    <span class="min-w-0 flex-1 truncate font-mono text-sm text-slate-900">{{ item.email }}</span>
                    <span class="rounded-md px-2 py-0.5 text-xs" :class="item.provider === 'google' ? 'bg-red-100 text-red-600' : 'bg-primary-100 text-primary-700'">
                      {{ item.provider === 'google' ? 'Gmail' : 'Outlook' }}
                    </span>
                    <span class="text-xs text-slate-500">{{ getOAuthStatusText(item.status) }}</span>
                  </div>
                </div>

                <div v-if="isOAuthAuthorizing" class="mt-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700">
                  <div class="flex items-center gap-2">
                    <span class="inline-flex h-2.5 w-2.5 rounded-full bg-primary-500 animate-pulse"></span>
                    <span>{{ oauthProgressText }}</span>
                  </div>
                  <p class="mt-1 text-xs text-primary-600">{{ oauthProgressHint }}</p>
                </div>

                <div v-if="oauthErrorMessage" class="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {{ oauthErrorMessage }}
                </div>
              </section>
            </template>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <div class="flex flex-wrap items-center gap-x-5 gap-y-3">
              <div class="flex items-center gap-3">
                <span class="text-sm font-medium text-slate-700">{{ t('batchAdd.loginProtocol') }}</span>
                <label class="inline-flex items-center text-sm text-slate-700">
                  <input v-model="loginMode" type="radio" value="auto" class="mailbox-checkbox h-4 w-4" />
                  <span class="ml-2">{{ t('batchAdd.autoMode') }}</span>
                </label>
                <label class="inline-flex items-center text-sm text-slate-700">
                  <input v-model="loginMode" type="radio" value="custom" class="mailbox-checkbox h-4 w-4" />
                  <span class="ml-2">{{ t('batchAdd.customMode') }}</span>
                </label>
              </div>

              <label class="inline-flex items-center text-sm text-slate-700">
                <input v-model="enableSmtp" type="checkbox" class="mailbox-checkbox h-4 w-4" />
                <span class="ml-2 inline-flex items-center">
                  <span>{{ t('batchAdd.enableSmtp') }}</span>
                  <span class="group relative ml-1 inline-flex items-center">
                    <span class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-50 text-[11px] font-bold text-amber-700">
                      !
                    </span>
                    <span class="pointer-events-none invisible absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-2 py-1 text-xs text-white shadow-lg group-hover:visible">
                      发邮件用
                    </span>
                  </span>
                </span>
              </label>

              <div class="flex items-center gap-3">
                <span class="text-sm font-medium text-slate-700">代理</span>
                <div class="w-[220px]">
                  <CustomSelect
                    v-model="selectedProxyId"
                    :options="proxySelectOptions"
                    placeholder="不使用代理"
                    placement="top"
                  />
                </div>
              </div>

              <div v-if="loginMode === 'custom'" class="flex flex-wrap items-center gap-3">
                <input
                  v-model="customHost"
                  type="text"
                  :placeholder="t('batchAdd.serverPlaceholder')"
                  class="w-[240px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
                />
                <input
                  v-model.number="customPort"
                  type="number"
                  :placeholder="t('batchAdd.portPlaceholder')"
                  class="w-[96px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
                />
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                class="inline-flex items-center rounded-xl border border-primary-200 bg-white px-4 py-2.5 text-sm font-medium text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
                :disabled="exportRows.length === 0"
                @click="exportResults"
              >
                导出结果
              </button>
              <button
                v-if="hasOAuthPending"
                type="button"
                class="inline-flex items-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-600 disabled:opacity-50"
                :disabled="isOAuthAuthorizing"
                @click="startOAuthAuthorization"
              >
                {{ oauthPrimaryButtonText }}
              </button>
              <button
                v-else
                type="button"
                class="inline-flex items-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-600 disabled:opacity-50"
                :disabled="props.loading || !accountsText.trim() || isOAuthAuthorizing"
                @click="handleSubmit()"
              >
                <svg v-if="props.loading" class="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.35" stroke-width="2.5" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
                </svg>
                {{ props.loading ? t('batchAdd.adding') : t('batchAdd.startAdd') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import * as XLSX from 'xlsx'
import { useI18n } from 'vue-i18n'
import batchLoginAPI from '@/api/batchLogin'
import mailboxProxyApi from '@/api/mailboxProxy'
import CustomSelect from '@/components/CustomSelect/index.vue'
import { isTauri } from '@/services/api'
const { t } = useI18n()

// ===== Props & Emits =====
const props = defineProps<{ visible: boolean, loading?: boolean }>()
const emit = defineEmits(['close', 'submit', 'oauth-complete'])

// ===== 输入模式状态 =====
const accountsText = ref('')
const loginMode = ref<'auto' | 'custom'>('auto')
const enableSmtp = ref(true)
const customHost = ref('')
const customPort = ref(995)
const results = ref<Array<{ email: string, status: 'pending' | 'success' | 'error' | 'skipped', message?: string }>>([])
const selectedProxyId = ref<number | ''>('')
const proxyOptions = ref<any[]>([])

// ===== OAuth 状态 =====
interface OAuthAccount {
  email: string
  provider: 'google' | 'microsoft'
  status: 'pending' | 'authorizing' | 'success' | 'error'
}

interface OpenExternalResult {
  opened: boolean
  popup: Window | null
}

type AuthPhase = 'idle' | 'preparing' | 'waiting'

const oauthAccounts = ref<OAuthAccount[]>([])
const isOAuthAuthorizing = ref(false)
const oauthCurrentIndex = ref(-1)
const oauthStopRequested = ref(false)
const oauthAuthPhase = ref<AuthPhase>('idle')
const oauthErrorMessage = ref('')
let activePopupWindow: Window | null = null

// ===== 计算属性 =====
const oauthCurrentEmail = computed(() => {
  if (oauthCurrentIndex.value >= 0 && oauthCurrentIndex.value < oauthAccounts.value.length) {
    return oauthAccounts.value[oauthCurrentIndex.value].email
  }
  return ''
})

const oauthSuccessCount = computed(() => oauthAccounts.value.filter(a => a.status === 'success').length)
const oauthFailCount = computed(() => oauthAccounts.value.filter(a => a.status === 'error').length)
const previewInvalidRows = computed(() => {
  const lines = String(accountsText.value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return lines
    .map((line) => {
      const parts = line.split(/[\s]+|[-]{2,}|[—–]+|[,，]/).filter((part) => part.trim())
      const email = String(parts[0] || '').trim()
      const domain = (email.split('@')[1] || '').toLowerCase()
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      const isOAuthToken = parts.length >= 4 && isOAuthTokenDomain(domain)
      const password = String(parts.length >= 3 && !isOAuthToken ? parts[2] : parts[1] || '').trim()
      const oauthClientId = String(parts[2] || '').trim()
      const oauthRefreshToken = String(parts[3] || '').trim()

      if (!validEmail) {
        return { email: email || line, status: 'error' as const, message: '邮箱格式不对' }
      }
      if (!password) {
        return { email, status: 'error' as const, message: '缺少密码或授权码' }
      }
      if (isOAuthToken && (!oauthClientId || !oauthRefreshToken)) {
        return { email, status: 'error' as const, message: 'OAuth Token 缺少 client_id 或 refresh_token' }
      }
      return null
    })
    .filter(Boolean)
})
const totalCount = computed(() => results.value.length)
const successCount = computed(() => results.value.filter((item) => item.status === 'success').length)
const errorCount = computed(() => results.value.filter((item) => item.status === 'error').length)
const skippedCount = computed(() => results.value.filter((item) => item.status === 'skipped').length)
const finishedCount = computed(() => successCount.value + errorCount.value + skippedCount.value)
const progressPercent = computed(() => {
  if (!totalCount.value) return 0
  return Math.min(100, Math.round((finishedCount.value / totalCount.value) * 100))
})
const progressSummaryText = computed(() => {
  if (!showLivePanel.value) return `格式异常 ${previewInvalidRows.value.length}`
  if (!totalCount.value) return '等待开始'
  if (props.loading) return `添加中 ${finishedCount.value}/${totalCount.value}`
  return `完成 ${finishedCount.value}/${totalCount.value}`
})
const showLivePanel = computed(() => Boolean(props.loading) || results.value.length > 0 || oauthAccounts.value.length > 0)
const showSidePanel = computed(() => showLivePanel.value || previewInvalidRows.value.length > 0)
const sidePanelRows = computed(() => (showLivePanel.value ? results.value : previewInvalidRows.value))
const exportRows = computed(() => {
  const oauthMap = new Map(
    oauthAccounts.value.map((item) => [normalizeEmail(item.email), item])
  )

  return results.value.map((item) => {
    const oauthItem = oauthMap.get(normalizeEmail(item.email))
    return {
      email: item.email,
      status: resolveExportStatus(item.status, oauthItem?.status),
      message: item.message || '',
      auth_mode: oauthItem ? (oauthItem.provider === 'google' ? 'Gmail OAuth' : 'Outlook OAuth') : '密码登录'
    }
  })
})

// 是否有待授权的 OAuth 邮箱
const hasOAuthPending = computed(() => {
  return oauthAccounts.value.some(a => a.status === 'pending' || a.status === 'authorizing')
})

const oauthProgressText = computed(() => {
  if (!isOAuthAuthorizing.value) return ''
  if (oauthAuthPhase.value === 'preparing') {
    return t('batchAdd.openingAuthorizePage', {
      current: oauthCurrentIndex.value + 1,
      total: oauthAccounts.value.length,
      email: oauthCurrentEmail.value
    })
  }
  return t('batchAdd.authorizingProgress', {
    current: oauthCurrentIndex.value + 1,
    total: oauthAccounts.value.length,
    email: oauthCurrentEmail.value
  })
})

const oauthProgressHint = computed(() => {
  if (oauthAuthPhase.value === 'preparing') {
    return t('batchAdd.preparingHint')
  }
  return t('batchAdd.waitingHint')
})

const oauthPrimaryButtonText = computed(() => {
  if (!isOAuthAuthorizing.value) return t('batchAdd.startAuthorize')
  if (oauthAuthPhase.value === 'preparing') return t('batchAdd.openingAuthorize')
  return t('batchAdd.authorizingBrowser')
})

const closeButtonText = computed(() => {
  if (isOAuthAuthorizing.value) return t('batchAdd.stop')
  return t('common.cancel')
})

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

// ===== 初始化与重置 =====
const resetState = () => {
  accountsText.value = ''
  loginMode.value = 'auto'
  enableSmtp.value = true
  customHost.value = ''
  customPort.value = 993
  selectedProxyId.value = ''
  results.value = []
  oauthAccounts.value = []
  oauthCurrentIndex.value = -1
  isOAuthAuthorizing.value = false
  oauthStopRequested.value = false
  oauthAuthPhase.value = 'idle'
  oauthErrorMessage.value = ''
}

watch(() => props.visible, (visible) => {
  if (visible) {
    resetState()
    loadProxyOptions()
  } else {
    oauthStopRequested.value = true
    oauthAuthPhase.value = 'idle'
    closeActivePopupWindow()
    results.value = []
  }
})

// ===== 输入模式方法 =====
const GOOGLE_OAUTH_TOKEN_DOMAIN_SUFFIXES = ['gmail.com', 'googlemail.com']
const MICROSOFT_OAUTH_TOKEN_DOMAIN_SUFFIXES = ['outlook.', 'hotmail.', 'live.', 'msn.', 'live.cn']

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

const parseAccounts = () => {
  const mode = loginMode.value
  const lines = accountsText.value.trim().split('\n')
  const accounts: any[] = []

  for (const line of lines) {
    if (!line.trim()) continue

    let processedLine = line.trim()
    processedLine = processedLine.replace(/^卡号[：:]\s*/i, '')

    const parts = processedLine.split(/[\s]+|[-]{2,}|[—–]+/).filter(p => p.trim())

    if (parts.length >= 2) {
      const email = parts[0].trim()
      const domain = (email.split('@')[1] || '').toLowerCase()

      // 4段格式：邮箱----密码----Client_ID----Refresh_Token（OAuth Token 批量导入）
      if (parts.length >= 4 && isOAuthTokenDomain(domain)) {
        const password = parts[1].trim()
        const oauthClientId = parts[2].trim()
        const oauthRefreshToken = parts[3].trim()

        accounts.push({
          email,
          password,
          verify_smtp: enableSmtp.value,
          oauth_client_id: oauthClientId,
          oauth_refresh_token: oauthRefreshToken,
        })
        continue
      }

      const password = parts.length >= 3 ? parts[2].trim() : parts[1].trim()

      let proto: 'auto' | 'imap' | 'pop3' = 'auto'
      if (mode === 'auto') {
        proto = 'auto'
      } else {
        const port = customPort.value || 0
        if (port === 110 || port === 995) {
          proto = 'pop3'
        } else {
          proto = 'imap'
        }
      }

      const account: any = { email, password, protocol: proto, verify_smtp: enableSmtp.value }
      if (selectedProxyId.value) {
        account.proxy_id = Number(selectedProxyId.value)
      }

      if (mode === 'custom' && customHost.value) {
        if (proto === 'imap') {
          account.imap_host = customHost.value
          account.imap_port = customPort.value || 993
        } else {
          account.pop3_host = customHost.value
          account.pop3_port = customPort.value || 995
        }
      }

      accounts.push(account)
    }
  }

  return accounts
}

const handleSubmit = () => {
  const accounts = parseAccounts()
  if (accounts.length > 0) {
    emit('submit', accounts)
  }
}

const extractEmailFromInputLine = (line: string) => {
  const processedLine = String(line || '').trim().replace(/^卡号[：:]\s*/i, '')
  const parts = processedLine.split(/[\s]+|[-]{2,}|[—–]+|[,，]/).filter(p => p.trim())
  const email = String(parts[0] || '').trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? normalizeEmail(email) : ''
}

const removeInputLineByEmail = (email: string) => {
  const target = normalizeEmail(email)
  if (!target) return

  accountsText.value = String(accountsText.value || '')
    .split('\n')
    .filter((line) => {
      const lineEmail = extractEmailFromInputLine(line)
      return !lineEmail || lineEmail !== target
    })
    .join('\n')
    .trim()
}

const resolveResultStatusText = (status: 'pending' | 'success' | 'error' | 'skipped') => {
  if (status === 'success') return '添加成功'
  if (status === 'error') return '添加失败'
  if (status === 'skipped') return '已跳过'
  return '等待处理'
}

const resolveExportStatus = (
  resultStatus: 'pending' | 'success' | 'error' | 'skipped',
  oauthStatus?: 'pending' | 'authorizing' | 'success' | 'error'
) => {
  if (oauthStatus === 'success') return 'OAuth 授权成功'
  if (oauthStatus === 'error') return 'OAuth 授权失败'
  if (oauthStatus === 'authorizing') return 'OAuth 授权中'
  if (oauthStatus === 'pending') return '等待 OAuth 授权'
  return resolveResultStatusText(resultStatus)
}

const exportResults = () => {
  if (exportRows.value.length === 0) return

  const worksheet = XLSX.utils.json_to_sheet(
    exportRows.value.map((item) => ({
      邮箱: item.email,
      结果: item.status,
      登录方式: item.auth_mode,
      说明: item.message,
    }))
  )
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '添加结果')

  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  XLSX.writeFile(workbook, `批量添加邮箱结果_${timestamp}.xlsx`)
}

// ===== OAuth 方法 =====

async function openExternal(url: string): Promise<OpenExternalResult> {
  if (isTauri()) {
    try {
      const { open } = await import('@tauri-apps/plugin-shell')
      await open(url)
      return { opened: true, popup: null }
    } catch (e) {
      console.error('[OAuth2] Tauri shell.open 失败:', e)
      const win = window.open(url, '_blank')
      return { opened: !!win, popup: win ?? null }
    }
  } else {
    const win = window.open(url, '_blank')
    if (win) win.focus()
    return { opened: !!win, popup: win ?? null }
  }
}

const normalizeEmail = (value: string) => (value || '').trim().toLowerCase()
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const closeActivePopupWindow = () => {
  if (!activePopupWindow) return
  try {
    if (!activePopupWindow.closed) {
      activePopupWindow.close()
    }
  } catch (e) {
    console.warn('[OAuth2] 关闭授权窗口失败:', e)
  } finally {
    activePopupWindow = null
  }
}

const getOAuthRowClass = (status: string) => {
  switch (status) {
    case 'success': return 'bg-green-50'
    case 'error': return 'bg-red-50'
    case 'authorizing': return 'bg-primary-50'
    default: return ''
  }
}

const getOAuthStatusText = (status: string) => {
  switch (status) {
    case 'success': return t('batchAdd.authSuccess')
    case 'error': return t('batchAdd.authFailed')
    case 'authorizing': return t('batchAdd.authorizingBrowser')
    default: return t('batchAdd.authPending')
  }
}

const waitForDesktopOAuthCallback = (timeoutMs: number) =>
  new Promise<{ success: boolean, email?: string, error?: string } | null>((resolve) => {
    const stopWatcher = window.setInterval(() => {
      if (oauthStopRequested.value) {
        cleanup()
        resolve({ success: false, error: t('batchAdd.authCanceled') })
      }
    }, 200)

    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail || {}
      if (detail.oauth2_success === '1') {
        cleanup()
        resolve({ success: true, email: (detail.email || '').trim() })
        return
      }
      if (detail.oauth2_error) {
        cleanup()
        resolve({ success: false, error: detail.oauth2_error })
      }
    }

    const cleanup = () => {
      window.clearTimeout(timer)
      window.clearInterval(stopWatcher)
      window.removeEventListener('oauth2-callback', handler as EventListener)
    }

    const timer = window.setTimeout(() => {
      cleanup()
      resolve(null)
    }, timeoutMs)

    window.addEventListener('oauth2-callback', handler as EventListener)
  })

const waitForWebOAuthCallback = (
  timeoutMs: number,
  popupWindow: Window | null
) =>
  new Promise<{ success: boolean, email?: string, error?: string, popupClosed?: boolean } | null>((resolve) => {
    const stopWatcher = window.setInterval(() => {
      if (oauthStopRequested.value) {
        cleanup()
        resolve({ success: false, error: t('batchAdd.authCanceled') })
        return
      }
      if (popupWindow && popupWindow.closed) {
        cleanup()
        resolve({ success: false, error: t('batchAdd.authPopupClosed'), popupClosed: true })
      }
    }, 200)

    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      const detail = event.data || {}
      if (detail.source !== 'oauth2-callback') return

      if (detail.oauth2_success === '1') {
        cleanup()
        resolve({ success: true, email: (detail.email || '').trim() })
        return
      }
      if (detail.oauth2_error) {
        cleanup()
        resolve({ success: false, error: detail.oauth2_error })
      }
    }

    const cleanup = () => {
      window.clearTimeout(timer)
      window.clearInterval(stopWatcher)
      window.removeEventListener('message', handler)
    }

    const timer = window.setTimeout(() => {
      cleanup()
      resolve(null)
    }, timeoutMs)

    window.addEventListener('message', handler)
  })

const markAuthorizedByEmail = (returnedEmail: string, fallbackIndex: number) => {
  const normalized = normalizeEmail(returnedEmail)
  const targetIndex = oauthAccounts.value.findIndex((item) => normalizeEmail(item.email) === normalized)

  if (targetIndex === -1) {
    const fallback = oauthAccounts.value[fallbackIndex]
    if (fallback) {
      fallback.status = 'error'
    }
    oauthErrorMessage.value = t('batchAdd.authSuccessMismatch', { email: returnedEmail })
    return
  }

  if (targetIndex !== fallbackIndex) {
    const current = oauthAccounts.value[fallbackIndex]
    if (current && current.status === 'authorizing') {
      current.status = 'pending'
    }
  }

  oauthAccounts.value[targetIndex].status = 'success'
  removeInputLineByEmail(oauthAccounts.value[targetIndex].email)
  oauthErrorMessage.value = ''
}

const startOAuthAuthorization = async () => {
  if (isOAuthAuthorizing.value) return

  isOAuthAuthorizing.value = true
  oauthStopRequested.value = false
  oauthAuthPhase.value = 'preparing'
  oauthErrorMessage.value = ''

  for (let i = 0; i < oauthAccounts.value.length; i++) {
    if (oauthStopRequested.value) break

    const account = oauthAccounts.value[i]
    if (account.status === 'success' || account.status === 'error') continue

    oauthCurrentIndex.value = i
    account.status = 'authorizing'

    try {
      oauthErrorMessage.value = ''
      const isDesktop = isTauri()
      oauthAuthPhase.value = 'preparing'
      activePopupWindow = null

      const res = await batchLoginAPI.getOAuth2AuthUrl(account.provider, isDesktop, account.email)
      const authUrl = res.data?.auth_url || res.auth_url

      if (!authUrl) {
        oauthErrorMessage.value = res.message || res.data?.message || t('batchAdd.authUrlFailed')
        account.status = 'error'
        closeActivePopupWindow()
        continue
      }

      const openResult = await openExternal(authUrl)
      activePopupWindow = openResult.popup

      if (!openResult.opened) {
        oauthErrorMessage.value = t('batchAdd.authOpenFailed')
        account.status = 'error'
        closeActivePopupWindow()
        continue
      }

      const maxWait = 5 * 60 * 1000
      let waitResult: 'authorized' | 'timeout' | 'popup_closed' | 'cancelled' = 'timeout'
      let callbackEmail = ''
      oauthAuthPhase.value = 'waiting'

      if (isDesktop) {
        const callbackResult = await waitForDesktopOAuthCallback(maxWait)
        if (callbackResult?.success === false) {
          account.status = 'error'
          oauthErrorMessage.value = callbackResult.error || t('batchAdd.authFailed')
          closeActivePopupWindow()
          oauthStopRequested.value = true
          break
        }
        if (callbackResult?.success) {
          callbackEmail = (callbackResult.email || '').trim()
          waitResult = 'authorized'
        } else {
          waitResult = oauthStopRequested.value ? 'cancelled' : 'timeout'
        }
      } else {
        const callbackResult = await waitForWebOAuthCallback(maxWait, activePopupWindow)
        if (callbackResult?.success === false) {
          if (callbackResult.popupClosed) {
            waitResult = 'popup_closed'
          } else {
            account.status = 'error'
            oauthErrorMessage.value = callbackResult.error || t('batchAdd.authFailed')
            closeActivePopupWindow()
            oauthStopRequested.value = true
            break
          }
        } else if (callbackResult?.success) {
          callbackEmail = (callbackResult.email || '').trim()
          waitResult = 'authorized'
        } else {
          waitResult = oauthStopRequested.value ? 'cancelled' : 'timeout'
        }
      }

      closeActivePopupWindow()

      if (waitResult === 'authorized') {
        const authorizedEmail = callbackEmail || account.email
        markAuthorizedByEmail(authorizedEmail, i)
      } else if (waitResult === 'popup_closed') {
        account.status = 'error'
        oauthErrorMessage.value = `${t('batchAdd.authPopupClosed')}，${t('batchAdd.authTimeout')}`
        oauthStopRequested.value = true
        break
      } else if (waitResult === 'cancelled') {
        account.status = 'error'
        oauthErrorMessage.value = t('batchAdd.authStopped')
        break
      } else {
        account.status = 'error'
        oauthErrorMessage.value = t('batchAdd.authTimeout')
      }

      if (!oauthStopRequested.value && i < oauthAccounts.value.length - 1) {
        await sleep(1200)
      }

    } catch (e: any) {
      closeActivePopupWindow()
      oauthErrorMessage.value = e.message || t('batchAdd.authFailed')
      account.status = 'error'
      oauthStopRequested.value = true
      break
    }
  }

  isOAuthAuthorizing.value = false
  oauthStopRequested.value = false
  oauthAuthPhase.value = 'idle'
  oauthCurrentIndex.value = -1
  closeActivePopupWindow()

  emit('oauth-complete', {
    successCount: oauthSuccessCount.value,
    failCount: oauthFailCount.value,
    accounts: oauthAccounts.value
  })
}

// ===== 关闭处理 =====
const handleClose = () => {
  if (isOAuthAuthorizing.value) {
    oauthStopRequested.value = true
    closeActivePopupWindow()
    oauthErrorMessage.value = t('batchAdd.authStopping')
    return
  }
  emit('close')
}

// ===== 暴露方法给父组件 =====
defineExpose({
  updatePending: (email: string, message?: string) => {
    const index = results.value.findIndex(r => r.email === email)
    if (index !== -1) {
      results.value[index] = { email, status: 'pending', message }
    }
  },
  updateResult: (email: string, status: 'success' | 'error' | 'skipped', message?: string) => {
    const index = results.value.findIndex(r => r.email === email)
    if (index !== -1) {
      results.value[index] = { email, status, message }
    }
    if (status === 'success' || status === 'skipped') {
      removeInputLineByEmail(email)
    }
  },
  initResults: (emails: string[]) => {
    results.value = emails.map(email => ({ email, status: 'pending' as const }))
  },
  clearResults: () => {
    results.value = []
  },
  // 添加 OAuth 待授权邮箱（在同一弹窗内显示）
  addOAuthAccounts: (pendingAccounts: Array<{ email: string, provider: string }>) => {
    oauthAccounts.value = pendingAccounts.map(a => ({
      email: a.email,
      provider: a.provider as 'google' | 'microsoft',
      status: 'pending' as const
    }))
    oauthCurrentIndex.value = -1
    isOAuthAuthorizing.value = false
    oauthStopRequested.value = false
    oauthAuthPhase.value = 'idle'
    oauthErrorMessage.value = ''
  },
  startOAuthAuthorization
})
</script>

<style scoped>
.mailbox-checkbox {
  appearance: none;
  -webkit-appearance: none;
  border: 2px solid #d1d5db;
  background-color: #fff;
  position: relative;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.mailbox-checkbox[type='checkbox'] {
  border-radius: 4px;
}

.mailbox-checkbox[type='radio'] {
  border-radius: 9999px;
}

.mailbox-checkbox:checked {
  background-color: rgb(var(--color-primary-500));
  border-color: rgb(var(--color-primary-500));
}

.mailbox-checkbox[type='checkbox']:checked::after {
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

.mailbox-checkbox[type='radio']:checked::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  height: 6px;
  width: 6px;
  border-radius: 9999px;
  background-color: white;
  transform: translate(-50%, -50%);
}
</style>
