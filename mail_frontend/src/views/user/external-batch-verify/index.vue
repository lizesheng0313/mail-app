<template>
  <div class="flex h-full min-h-0 flex-col">
    <section
      class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white"
    >
      <header
        class="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-gray-200 bg-gray-50/70 px-3 py-2"
      >
        <div class="flex flex-wrap items-center gap-4">
          <label
            class="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap text-xs text-gray-600"
          >
            <input
              v-model="verifySmtp"
              :disabled="verifyBusy"
              type="checkbox"
              class="mailbox-checkbox h-4 w-4 shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            />
            同时验证 SMTP
          </label>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500">代理</span>
            <div class="w-40">
              <CustomSelect
                v-model="selectedProxyId"
                :options="proxySelectOptions"
                :disabled="verifyBusy"
                size="sm"
                class="verify-select"
                placeholder="不使用代理"
              />
            </div>
          </div>
        </div>
        <div class="ml-auto flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            class="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded px-2 text-xs text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
            :disabled="failedRows.length === 0 || verifyBusy"
            @click="retryFailedItems"
          >
            <svg
              class="h-4 w-4"
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M20 7v5h-5M4 17v-5h5M5 9a7 7 0 0 1 12-5l3 3M4 17l3 3a7 7 0 0 0 12-5" /></svg
            >重试失败{{ failedRows.length ? ` (${failedRows.length})` : '' }}
          </button>
          <button
            type="button"
            class="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded px-2 text-xs text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
            :disabled="promotableRows.length === 0 || promoting"
            @click="importSuccessAccounts"
          >
            <svg
              class="h-4 w-4"
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M14 4h6v16h-6M4 12h12m-4-4 4 4-4 4" /></svg
            >{{
              promoting
                ? '导入中...'
                : `导入成功账号${successRows.length ? ` (${promotableRows.length})` : ''}`
            }}
          </button>
          <button
            type="button"
            class="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded px-2 text-xs text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
            :disabled="filteredExportRows.length === 0"
            @click="exportExcel()"
          >
            <svg
              class="h-4 w-4"
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 3v12m-5-5 5 5 5-5M4 15v5h16v-5" /></svg
            >导出结果
          </button>
          <span class="mx-1 hidden h-4 w-px bg-gray-200 sm:inline-block" aria-hidden="true" />
          <HoverTooltip :text="isDesktop ? '' : '请在桌面端使用批量验号。'" placement="left">
            <button
              type="button"
              class="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded bg-primary-600 px-3 text-xs font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
              :disabled="verifyBusy || validItems.length === 0"
              @click="startVerify"
            >
              <svg
                v-if="verifyBusy"
                class="h-4 w-4 animate-spin"
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M20 7v5h-5M4 17v-5h5M5 9a7 7 0 0 1 12-5l3 3M4 17l3 3a7 7 0 0 0 12-5" />
              </svg>
              <svg
                v-else
                class="h-4 w-4"
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m9 5 11 7-11 7V5Z" />
              </svg>
              {{ verifyBusy ? '验号中...' : '开始验号' }}
            </button>
          </HoverTooltip>
        </div>
      </header>

      <div
        class="grid min-h-0 flex-1 grid-cols-1 grid-rows-[260px_minmax(260px,1fr)] divide-y divide-gray-200 overflow-y-auto lg:grid-cols-[minmax(280px,0.42fr)_minmax(0,0.58fr)] lg:grid-rows-1 lg:divide-x lg:divide-y-0 lg:overflow-hidden"
      >
        <section aria-label="账号导入" class="flex min-h-0 min-w-0 flex-col">
          <div
            class="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-3"
          >
            <div class="flex min-w-0 items-center gap-2">
              <svg
                class="h-4 w-4 shrink-0 text-gray-400"
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M7 3h8l4 4v14H5V3h2m8 0v5h4M8 12h8m-8 4h8" />
              </svg>
              <h2 class="text-sm font-medium text-gray-800">账号导入</h2>
            </div>
            <button
              type="button"
              class="rounded px-1 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="verifyBusy || promoting || (!rawText && !liveResults.length)"
              @click="clearAll"
            >
              清空
            </button>
          </div>
          <textarea
            v-model="rawText"
            aria-label="待验证账号"
            :disabled="verifyBusy"
            spellcheck="false"
            autocapitalize="off"
            autocomplete="off"
            class="min-h-0 w-full flex-1 resize-none border-0 bg-white px-3 py-3 font-mono text-xs leading-6 text-gray-700 outline-none placeholder:text-gray-400 focus:ring-0 disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="demo1@gmail.com,app_password_1,auto&#10;demo2@outlook.com----password_2----imap&#10;demo3@qq.com,password_3,pop3"
          />
          <div
            class="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-100 bg-gray-50/50 px-3 py-2 text-xs text-gray-400"
          >
            <span>{{ parsedItems.length }} 个账号</span>
            <span v-if="validItems.length" class="text-primary-600"
              >可验 {{ validItems.length }}</span
            >
            <span v-if="invalidItems.length" class="text-red-500"
              >异常 {{ invalidItems.length }}</span
            >
            <span
              class="ml-auto"
              title="支持逗号、空格或 ---- 分隔邮箱、密码和协议，也支持 OAuth Token 格式"
              >每行一个账号</span
            >
          </div>
        </section>

        <section aria-label="验号结果" class="flex min-h-0 min-w-0 flex-col">
          <div
            class="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-3"
          >
            <div class="flex items-center gap-2">
              <svg
                class="h-4 w-4 text-gray-400"
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M9 4H5v17h14V4h-3M9 3h7v4H9V3Zm-1 11 3 3 5-6" />
              </svg>
              <h2 class="text-sm font-medium text-gray-800">
                {{ !showLivePanel && invalidItems.length ? '异常账号' : '验号结果' }}
              </h2>
              <span
                v-if="!showLivePanel && invalidItems.length"
                class="rounded bg-red-50 px-1.5 py-0.5 text-[11px] text-red-600"
                >{{ invalidItems.length }}</span
              >
            </div>
            <span class="inline-flex shrink-0 items-center gap-1.5 text-xs text-gray-400">
              <span
                v-if="verifyBusy"
                class="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-500"
                aria-hidden="true"
              />
              {{ verifyBusy ? '验证中' : showLivePanel ? '本轮已完成' : '等待开始' }}
            </span>
          </div>
          <div v-if="showLivePanel" class="shrink-0 border-b border-gray-100">
            <div class="flex flex-wrap items-center gap-2 px-3 py-2">
              <div
                class="flex items-center gap-0.5 rounded-md bg-gray-100 p-0.5"
                role="group"
                aria-label="结果筛选"
              >
                <button
                  v-for="tab in resultTabs"
                  :key="tab.value"
                  type="button"
                  :aria-pressed="resultFilter === tab.value"
                  class="inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs transition-colors"
                  :class="
                    resultFilter === tab.value
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  "
                  @click="resultFilter = tab.value"
                >
                  {{ tab.label
                  }}<span
                    class="tabular-nums"
                    :class="
                      tab.value === 'success'
                        ? 'text-primary-600'
                        : tab.value === 'failed'
                          ? 'text-red-500'
                          : 'text-gray-400'
                    "
                    >{{ tab.count }}</span
                  >
                </button>
              </div>
              <div
                v-if="availableFailureReasons.length && resultFilter !== 'success'"
                class="ml-auto w-40"
              >
                <CustomSelect
                  v-model="failureReasonFilter"
                  :options="failureReasonOptions"
                  size="sm"
                  class="verify-select"
                  placeholder="全部原因"
                />
              </div>
            </div>
            <div class="flex items-center gap-3 px-3 pb-2">
              <div
                role="progressbar"
                aria-label="验号进度"
                :aria-valuenow="progressPercent"
                aria-valuemin="0"
                aria-valuemax="100"
                class="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100"
              >
                <div
                  class="h-full rounded-full bg-primary-500 transition-all duration-300"
                  :style="{ width: `${progressPercent}%` }"
                />
              </div>
              <span class="shrink-0 text-[11px] tabular-nums text-gray-400">{{
                progressText
              }}</span>
            </div>
          </div>

          <div class="min-h-0 flex-1 overflow-hidden">
            <div
              v-if="!sidePanelItems.length"
              class="flex h-full min-h-48 flex-col items-center justify-center gap-2 px-5 text-center"
            >
              <div class="mb-1 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50">
                <svg
                  class="h-6 w-6 text-gray-300"
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M9 4H5v17h14V4h-3M9 3h7v4H9V3Zm-1 11 3 3 5-6" />
                </svg>
              </div>
              <p class="text-sm text-gray-500">
                {{
                  showLivePanel
                    ? '没有符合筛选条件的结果'
                    : validItems.length
                      ? `已识别 ${validItems.length} 个可验账号`
                      : '验号结果将在这里显示'
                }}
              </p>
              <p class="text-xs text-gray-400">
                {{
                  showLivePanel
                    ? '切换结果类型或失败原因，查看其他结果。'
                    : validItems.length
                      ? '点击右上角「开始验号」即可验证。'
                      : '在左侧粘贴账号，开始验证后查看进度与结果。'
                }}
              </p>
            </div>
            <div
              v-else
              ref="sidePanelScrollRef"
              class="h-full overflow-y-auto"
              @scroll="syncSidePanelViewport"
            >
              <div class="relative w-full" :style="{ height: `${sidePanelTotalHeight}px` }">
                <div
                  v-for="virtualRow in sidePanelVirtualItems"
                  :key="virtualRow.key"
                  class="absolute left-0 top-0 w-full"
                  :style="{ transform: `translateY(${virtualRow.start}px)` }"
                >
                  <div
                    class="flex h-[42px] items-center gap-2 border-b border-gray-100 px-3"
                    :class="resolvePanelRowClass(virtualRow.item)"
                  >
                    <span
                      class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                      :class="resolvePanelIconClass(virtualRow.item)"
                      >{{ resolvePanelIconText(virtualRow.item) }}</span
                    >
                    <p
                      class="min-w-0 flex-1 truncate font-mono text-xs text-gray-700"
                      :title="virtualRow.item.email || ''"
                    >
                      {{ virtualRow.item.email || '未识别邮箱' }}
                    </p>
                    <div
                      v-if="showLivePanel && virtualRow.item.status === 'success'"
                      class="flex shrink-0 items-center gap-1"
                    >
                      <span
                        class="inline-flex rounded border px-1.5 py-0.5 text-[10px] font-medium"
                        :class="resolveProtocolBadgeClass(virtualRow.item)"
                        >{{ resolveProtocolBadge(virtualRow.item) }}</span
                      >
                      <span
                        v-if="resolveSmtpBadge(virtualRow.item)"
                        class="inline-flex rounded border px-1.5 py-0.5 text-[10px] font-medium"
                        :class="resolveSmtpBadgeClass(virtualRow.item)"
                        >{{ resolveSmtpBadge(virtualRow.item) }}</span
                      >
                    </div>
                    <p
                      v-else
                      class="max-w-[45%] shrink-0 truncate text-right text-[11px]"
                      :class="
                        showLivePanel && virtualRow.item.status === 'error'
                          ? 'text-red-500'
                          : 'text-gray-400'
                      "
                      :title="resolvePanelTooltip(virtualRow.item)"
                    >
                      {{ resolvePanelShortMessage(virtualRow.item) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-if="sidePanelItems.length"
            class="flex shrink-0 items-center justify-between border-t border-gray-100 px-3 py-2 text-xs text-gray-400"
          >
            <span>当前显示 {{ sidePanelItems.length }} 条</span
            ><span v-if="!showLivePanel && invalidItems.length > 200">仅显示前 200 条异常账号</span>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import externalVerifyPoolAPI from '@/api/externalVerifyPool'
import mailboxProxyApi from '@/api/mailboxProxy'
import { isTauri } from '@/services/api'
import {
  DEFAULT_PASSWORD_VERIFY_CONCURRENCY,
  isOAuthTokenDomain,
  resolveOAuthProviderByDomain,
  runPasswordMailboxPool
} from '@/utils/externalMailboxRules'
import {
  createExternalMailboxFailure,
  runExternalMailboxWithRelayFallback,
  verifyExternalMailboxThroughRelay
} from '@/utils/externalMailboxRelay'
import { showMessage } from '@/utils/message'
import CustomSelect from '@/components/CustomSelect/index.vue'
import HoverTooltip from '@/components/HoverTooltip/index.vue'

const SUPPORTED_PROTOCOLS = ['auto', 'imap', 'pop3']
const OAUTH_VERIFY_DISPLAY_CONCURRENCY = 6
const rawText = ref('')
const verifying = ref(false)
const importingForVerify = ref(false)
const promoting = ref(false)
const verifySmtp = ref(false)
const selectedProxyId = ref<number | ''>('')
const proxyOptions = ref<any[]>([])
const exportRows = ref<any[]>([])
const currentBatchNo = ref('')
const resultFilter = ref<'all' | 'success' | 'failed'>('all')
const failureReasonFilter = ref('')
const liveResults = ref<any[]>([])
const sidePanelScrollRef = ref<HTMLElement | null>(null)
const sidePanelScrollTop = ref(0)
const sidePanelViewportHeight = ref(0)
const liveProgress = ref({
  total: 0,
  completed: 0,
  success: 0,
  failed: 0,
  currentEmail: ''
})
const isDesktop = isTauri()
let unlistenVerifyProgress: null | (() => void) = null
const processedCandidateSignatures = ref<Set<string>>(new Set())

const getTauriInvoke = async () => {
  if (!isTauri()) return null
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke
  } catch {
    return null
  }
}

const verifyPasswordMailboxWithRelay = async (options: {
  tauriInvoke: any
  email: string
  password: string
  protocol: string
  host?: string | null
  port?: number | null
  verifySmtp: boolean
  proxy?: any
}) => {
  const { source, result } = await runExternalMailboxWithRelayFallback<any>({
    email: options.email,
    localAction: async () => {
      const localResult: any = await options.tauriInvoke('add_external_mailbox', {
        email: options.email,
        password: options.password,
        protocol: options.protocol,
        host: options.host || null,
        port: options.port || null,
        verifySmtp: options.verifySmtp,
        proxy: options.proxy || null
      })
      if (!localResult?.success) {
        throw createExternalMailboxFailure(localResult || { message: '本地验号失败' })
      }
      return localResult
    },
    relayAction: () => verifyExternalMailboxThroughRelay({
      email: options.email,
      password: options.password,
      protocol: options.protocol,
      verifySmtp: options.verifySmtp
    })
  })
  return {
    ...result,
    relay_fetch_enabled: isDesktop && source === 'relay'
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

const isSupportedProtocol = (value: string) =>
  SUPPORTED_PROTOCOLS.includes(String(value || '').trim().toLowerCase())

const getCandidateSignature = (item: any) => [
  String(item?.email || '').trim().toLowerCase(),
  String(item?.password || '').trim(),
  String(item?.protocol || 'auto').trim().toLowerCase() || 'auto',
  String(item?.auth_type || 'password').trim().toLowerCase() || 'password',
  String(item?.oauth_provider || '').trim().toLowerCase(),
  String(item?.oauth_client_id || '').trim(),
  String(item?.oauth_refresh_token || '').trim()
].join('\u0001')

const markCandidatesProcessed = (items: any[]) => {
  if (!items.length) return
  const next = new Set(processedCandidateSignatures.value)
  for (const item of items) {
    next.add(getCandidateSignature(item))
  }
  processedCandidateSignatures.value = next
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
      const credentialParts = parts.slice(1).filter((part) => !isSupportedProtocol(part))
      const explicitProtocol = parts.slice(1).find((part) => isSupportedProtocol(part))
      const protocol = String(explicitProtocol || 'auto').trim().toLowerCase()
      const isOAuthToken = credentialParts.length >= 3 && isOAuthTokenDomain(domain)
      const oauthProvider = isOAuthToken ? resolveOAuthProviderByDomain(domain) : ''
      const password = String(credentialParts[0] || '').trim()
      const oauthClientId = String(credentialParts[1] || '').trim()
      const oauthRefreshToken = String(credentialParts[2] || '').trim()
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
        oauth_provider: oauthProvider || null,
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
const verifyBusy = computed(() => verifying.value || importingForVerify.value)
const showLivePanel = computed(() => verifying.value || liveResults.value.length > 0)
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
const resultTabs = computed(() => [
  { label: '全部', value: 'all' as const, count: liveResults.value.length },
  {
    label: '通过',
    value: 'success' as const,
    count: liveProgress.value.success
  },
  {
    label: '失败',
    value: 'failed' as const,
    count: liveProgress.value.failed
  }
])
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
const SIDE_PANEL_ROW_HEIGHT = 42
const SIDE_PANEL_OVERSCAN = 12
const sidePanelTotalHeight = computed(() => sidePanelItems.value.length * SIDE_PANEL_ROW_HEIGHT)
const syncSidePanelViewport = () => {
  const element = sidePanelScrollRef.value
  if (!element) return
  sidePanelScrollTop.value = element.scrollTop
  sidePanelViewportHeight.value = element.clientHeight
}
const sidePanelVirtualItems = computed(() => {
  const rows = sidePanelItems.value
  const total = rows.length
  if (total === 0) return []

  const viewportHeight = sidePanelViewportHeight.value || sidePanelScrollRef.value?.clientHeight || 600
  const startIndex = Math.max(0, Math.floor(sidePanelScrollTop.value / SIDE_PANEL_ROW_HEIGHT) - SIDE_PANEL_OVERSCAN)
  const visibleCount = Math.ceil(viewportHeight / SIDE_PANEL_ROW_HEIGHT) + SIDE_PANEL_OVERSCAN * 2
  const endIndex = Math.min(total, startIndex + visibleCount)

  return rows.slice(startIndex, endIndex).map((item: any, offset: number) => {
    const index = startIndex + offset
    return {
      item,
      index,
      key: item?.id ?? `${index}-${item?.email || ''}`,
      start: index * SIDE_PANEL_ROW_HEIGHT
    }
  })
})
const progressPercent = computed(() => {
  if (!liveProgress.value.total) return 0
  return Math.min(100, Math.round((liveProgress.value.completed / liveProgress.value.total) * 100))
})
const progressText = computed(() => {
  if (!liveProgress.value.total) return '等待开始验号'
  return `${liveProgress.value.completed}/${liveProgress.value.total} · 已完成`
})

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
  processedCandidateSignatures.value = new Set()
  liveProgress.value = {
    total: 0,
    completed: 0,
    success: 0,
    failed: 0,
    currentEmail: ''
  }
}

const resolvePanelRowClass = (item: any) =>
  showLivePanel.value && item.status === 'running'
    ? 'bg-primary-50/50'
    : 'bg-white hover:bg-gray-50'
const resolvePanelIconClass = (item: any) => {
  if (showLivePanel.value) {
    if (item.status === 'success' || item.status === 'running')
      return 'bg-primary-50 text-primary-600'
    if (item.status !== 'error') return 'bg-gray-100 text-gray-400'
  }
  return 'bg-red-50 text-red-500'
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
  if (!isSmtpChecked(item)) return 'SMTP 未检测'
  if (item.smtp_verified === true) return 'SMTP 可发'
  if (item.smtp_verified === false) return 'SMTP 失败'
  if (String(item.message || '').includes('SMTP 可发')) return 'SMTP 可发'
  if (String(item.message || '').includes('SMTP 不可发')) return 'SMTP 失败'
  return ''
}

const isSmtpChecked = (item: any) => {
  if (Object.prototype.hasOwnProperty.call(item || {}, 'smtp_checked')) {
    return item?.smtp_checked === true
  }
  const smtpError = String(item?.smtp_error || '')
  if (smtpError.includes('未检测 SMTP')) return false
  return item?.smtp_verified === true || Boolean(smtpError)
}

const resolveSmtpBadgeClass = (item: any) => {
  if (!isSmtpChecked(item)) return 'border-slate-200 bg-slate-50 text-slate-600'
  return item.smtp_verified
    ? 'border-primary-200 bg-primary-50 text-primary-700'
    : 'border-red-200 bg-red-50 text-red-700'
}

const resolveVerifySuccessMessage = (item: any, prefix = '验号通过') => {
  if (!isSmtpChecked(item)) return `${prefix}，SMTP 未检测`
  if (item?.smtp_verified) return `${prefix}，SMTP 可发`
  return `${prefix}，SMTP 不可发${item?.smtp_error ? `：${item.smtp_error}` : ''}`
}

const resolvePanelTooltip = (item: any) => {
  if (showLivePanel.value) {
    if (item.status === 'success') return ''
    if (item.status === 'running') return item.message || '验证中'
    if (item.status === 'pending') return ''
    if (item.status === 'error') return compactDetailMessage(item.message || '')
    return item.message || '等待验号'
  }
  return compactDetailMessage(item.reason || '')
}

const resolvePanelShortMessage = (item: any) => {
  if (showLivePanel.value) {
    if (item.status === 'running') return item.message || '验证中'
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
  relay_fetch_enabled: item.relay_fetch_enabled === true,
  smtp_checked: isSmtpChecked(item),
  smtp_verified: item.smtp_verified === true,
  status: item.verify_status === 'success' ? 'success' : item.verify_status === 'failed' ? 'error' : 'pending',
  message: item.verify_status === 'success'
    ? resolveVerifySuccessMessage(item)
    : (item.error_message || item.verify_message || '等待验号')
})

const syncLiveProgressStats = () => {
  liveProgress.value.success = liveResults.value.filter((entry: any) => entry.status === 'success').length
  liveProgress.value.failed = liveResults.value.filter((entry: any) => entry.status === 'error').length
}

const markVerifyCompleted = () => {
  liveProgress.value.completed += 1
  syncLiveProgressStats()
}

const resolveRunningMessage = (protocol: string) => {
  const normalized = String(protocol || 'auto').toLowerCase()
  if (normalized === 'imap') return 'IMAP 验证中'
  if (normalized === 'pop3') return 'POP3 验证中'
  return 'IMAP 验证中'
}

const handleVerifyProgressEvent = (payload: any) => {
  const email = String(payload?.email || '').trim().toLowerCase()
  if (!email) return
  const currentLiveItem = liveResults.value.find((entry: any) => String(entry?.email || '').trim().toLowerCase() === email)
  if (!currentLiveItem || currentLiveItem.status === 'success' || currentLiveItem.status === 'error') return
  currentLiveItem.status = 'running'
  currentLiveItem.message = String(payload?.message || '').trim() || '验证中'
}

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

  try {
    const XLSX = await import('xlsx')
    const rows = targetRows.map((item: any) => ({
      邮箱: item.email || '',
      密码: item.password || '',
      IMAP: formatServerValue(item.imap_host, item.imap_port),
      POP3: formatServerValue(item.pop3_host, item.pop3_port),
      SMTP: formatServerValue(item.smtp_host, item.smtp_port),
      SMTP状态: !isSmtpChecked(item) ? '未检测' : item.smtp_verified ? '可发' : '失败',
      验号状态: item.verify_status === 'success' ? '成功' : item.verify_status === 'failed' ? '失败' : '待验',
      失败原因: item.verify_status === 'failed' ? simplifyErrorMessage(item.error_message || item.verify_message || '') : ''
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 30 }, { wch: 22 }, { wch: 28 }, { wch: 28 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 24 }
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '批量验号结果')
    const timestamp = formatExportTimestamp()
    const resultSuffix = resultFilter.value === 'success' ? '成功' : resultFilter.value === 'failed' ? '失败' : '全部'
    const reasonSuffix = failureReasonFilter.value ? `_${failureReasonFilter.value}` : ''
    const defaultFileName = `批量验号${resultSuffix}结果${reasonSuffix}_${timestamp}.xlsx`

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
      smtp_checked: false,
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
      smtp_checked: false,
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

    if (passwordItems.length > 0) {
      const passwordVerifyResults = await runPasswordMailboxPool(passwordItems, {
        scene: 'verify',
        defaultConcurrency: DEFAULT_PASSWORD_VERIFY_CONCURRENCY,
        getEmail: (item: any) => item.email,
        worker: async (item: any) => {
          const currentLiveItem = liveResults.value.find((entry: any) => entry.id === item.id)
          if (currentLiveItem) {
            currentLiveItem.status = 'running'
            currentLiveItem.message = resolveRunningMessage(item?.input_protocol || item?.protocol || 'auto')
          }

          const protocol = String(item?.input_protocol || 'auto').toLowerCase() || 'auto'
          const host = protocol === 'imap' ? item?.imap_host : protocol === 'pop3' ? item?.pop3_host : null
          const port = protocol === 'imap' ? item?.imap_port : protocol === 'pop3' ? item?.pop3_port : null

          try {
            const result: any = await verifyPasswordMailboxWithRelay({
              tauriInvoke,
              email: item.email,
              password: item.password,
              protocol,
              host,
              port,
              verifySmtp: verifySmtp.value,
              proxy: selectedRuntimeProxy || item.runtime_proxy || null
            })

            if (result?.success) {
              if (currentLiveItem) {
                currentLiveItem.status = 'success'
                currentLiveItem.protocol = String(result?.protocol || protocol || 'auto').toLowerCase()
                currentLiveItem.resolved_protocol = String(result?.protocol || protocol || 'auto').toLowerCase()
                currentLiveItem.relay_fetch_enabled = result?.relay_fetch_enabled === true
                currentLiveItem.smtp_checked = isSmtpChecked(result)
                currentLiveItem.smtp_verified = result?.smtp_verified === true
                currentLiveItem.smtp_error = result?.smtp_error || null
                currentLiveItem.message = resolveVerifySuccessMessage(result)
              }

              return {
                candidate_id: item.id,
                success: true,
                protocol: String(result?.protocol || protocol || 'auto').toLowerCase(),
                host: result?.host || null,
                port: Number(result?.port || 0) || null,
                smtp_checked: isSmtpChecked(result),
                smtp_verified: result?.smtp_verified === true,
                smtp_host: result?.smtp_host || null,
                smtp_port: Number(result?.smtp_port || 0) || null,
                smtp_error: result?.smtp_error || null,
                relay_fetch_enabled: result?.relay_fetch_enabled === true,
                verify_message: result?.message || '验号成功'
              }
            }

            if (currentLiveItem) {
              currentLiveItem.status = 'error'
              currentLiveItem.protocol = protocol
              currentLiveItem.resolved_protocol = null
              currentLiveItem.smtp_verified = false
              currentLiveItem.message = result?.message || '验号失败'
            }

            return {
              candidate_id: item.id,
              success: false,
              protocol,
              error_message: result?.message || '验号失败'
            }
          } catch (error: any) {
            if (currentLiveItem) {
              currentLiveItem.status = 'error'
              currentLiveItem.protocol = protocol
              currentLiveItem.resolved_protocol = null
              currentLiveItem.smtp_verified = false
              currentLiveItem.message = String(error?.message || error || '验号失败')
            }

            return {
              candidate_id: item.id,
              success: false,
              protocol,
              error_message: String(error?.message || error || '验号失败')
            }
          } finally {
            markVerifyCompleted()
          }
        }
      })

      verifyResults.push(...passwordVerifyResults)
    }

    if (oauthItems.length > 0) {
      for (const [index, item] of oauthItems.entries()) {
        const currentLiveItem = liveResults.value.find((entry: any) => entry.id === item.id)
        if (currentLiveItem) {
          if (index < OAUTH_VERIFY_DISPLAY_CONCURRENCY) {
            currentLiveItem.status = 'running'
            currentLiveItem.message = 'OAuth Token 验证中'
          } else {
            currentLiveItem.status = 'pending'
            currentLiveItem.message = 'OAuth Token 排队中'
          }
        }
      }

      const oauthVerifyResponse: any = await externalVerifyPoolAPI.verifyOAuthCandidates({
        ids: oauthItems.map((item: any) => item.id),
        verify_smtp: verifySmtp.value
      })
      if (oauthVerifyResponse.code !== 0) return

      const oauthResultMap = new Map<number, any>()
      for (const result of Array.isArray(oauthVerifyResponse?.data?.items) ? oauthVerifyResponse.data.items : []) {
        oauthResultMap.set(Number(result?.candidate_id || 0), result)
      }

      for (const item of oauthItems) {
        const result = oauthResultMap.get(Number(item.id))
        const currentLiveItem = liveResults.value.find((entry: any) => entry.id === item.id)
        if (result) {
          verifyResults.push(result)
          if (currentLiveItem) {
            currentLiveItem.status = result.success ? 'success' : 'error'
            currentLiveItem.protocol = String(result?.protocol || item?.input_protocol || 'auto').toLowerCase()
            currentLiveItem.resolved_protocol = result.success
              ? String(result?.protocol || item?.input_protocol || 'auto').toLowerCase()
              : null
            currentLiveItem.smtp_checked = isSmtpChecked(result)
            currentLiveItem.smtp_verified = result?.smtp_verified === true
            currentLiveItem.smtp_error = result?.smtp_error || null
            currentLiveItem.message = result.success
              ? resolveVerifySuccessMessage(result, 'OAuth 验号通过')
              : (result.error_message || 'OAuth 验号失败')
          }
        } else if (currentLiveItem) {
          currentLiveItem.status = 'error'
          currentLiveItem.resolved_protocol = null
          currentLiveItem.smtp_verified = false
          currentLiveItem.message = 'OAuth 验号失败'
        }

        markVerifyCompleted()
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

  } finally {
    liveProgress.value.currentEmail = ''
    verifying.value = false
  }
}

const buildVerifyAccountPayload = (item: any) => ({
  email: item.email,
  password: item.password,
  protocol: item.protocol,
  auth_type: item.auth_type || 'password',
  oauth_provider: item.oauth_provider || null,
  oauth_client_id: item.oauth_client_id || null,
  oauth_refresh_token: item.oauth_refresh_token || null
})

const getUnprocessedValidItems = () =>
  validItems.value.filter((item: any) => !processedCandidateSignatures.value.has(getCandidateSignature(item)))

const runDirectVerification = async (items: any[], selectedRuntimeProxy: any = null) => {
  const passwordItems = items.filter((item: any) => String(item?.auth_type || 'password') !== 'oauth2')
  const oauthItems = items.filter((item: any) => String(item?.auth_type || '') === 'oauth2')
  const liveRows = items.map((item: any) => ({
    id: item.id,
    email: item.email,
    protocol: item.protocol || '',
    resolved_protocol: null,
    smtp_checked: false,
    smtp_verified: false,
    status: String(item?.auth_type || 'password') === 'oauth2' ? 'error' : 'pending',
    message: String(item?.auth_type || 'password') === 'oauth2' ? 'OAuth 账号暂不支持直接验号' : '等待验号'
  }))

  resultFilter.value = 'all'
  failureReasonFilter.value = ''
  liveResults.value = liveRows
  const liveItemMap = new Map(liveResults.value.map((item: any) => [item.id, item]))
  exportRows.value = []
  currentBatchNo.value = ''
  liveProgress.value = {
    total: items.length,
    completed: oauthItems.length,
    success: 0,
    failed: oauthItems.length,
    currentEmail: ''
  }

  const tauriInvoke = passwordItems.length > 0 ? await getTauriInvoke() : null
  if (passwordItems.length > 0 && !tauriInvoke) {
    showMessage('账号密码类批量验号需要在桌面端客户端里操作', 'warning')
    return
  }

  verifying.value = true
  try {
    const rows: any[] = []
    await runPasswordMailboxPool(passwordItems, {
      scene: 'verify',
      defaultConcurrency: DEFAULT_PASSWORD_VERIFY_CONCURRENCY,
      getEmail: (item: any) => item.email,
      worker: async (item: any) => {
        const currentLiveItem = liveItemMap.get(item.id)
        const protocol = String(item?.protocol || 'auto').toLowerCase() || 'auto'
        if (currentLiveItem) {
          currentLiveItem.status = 'running'
          currentLiveItem.message = resolveRunningMessage(protocol)
        }

        try {
          const result: any = await verifyPasswordMailboxWithRelay({
            tauriInvoke,
            email: item.email,
            password: item.password,
            protocol,
            host: null,
            port: null,
            verifySmtp: verifySmtp.value,
            proxy: selectedRuntimeProxy || null
          })

          if (result?.success) {
            const resolvedProtocol = String(result?.protocol || protocol || 'auto').toLowerCase()
            if (currentLiveItem) {
              currentLiveItem.status = 'success'
              currentLiveItem.protocol = resolvedProtocol
              currentLiveItem.resolved_protocol = resolvedProtocol
              currentLiveItem.relay_fetch_enabled = result?.relay_fetch_enabled === true
              currentLiveItem.smtp_checked = isSmtpChecked(result)
              currentLiveItem.smtp_verified = result?.smtp_verified === true
              currentLiveItem.smtp_error = result?.smtp_error || null
              currentLiveItem.message = resolveVerifySuccessMessage(result)
            }
            liveProgress.value.success += 1
            rows.push({
              id: item.id,
              email: item.email,
              password: item.password,
              input_protocol: protocol,
              resolved_protocol: resolvedProtocol,
              imap_host: resolvedProtocol === 'imap' ? result?.host || null : null,
              imap_port: resolvedProtocol === 'imap' ? Number(result?.port || 0) || null : null,
              pop3_host: resolvedProtocol === 'pop3' ? result?.host || null : null,
              pop3_port: resolvedProtocol === 'pop3' ? Number(result?.port || 0) || null : null,
              smtp_host: result?.smtp_host || null,
              smtp_port: Number(result?.smtp_port || 0) || null,
              smtp_checked: isSmtpChecked(result),
              smtp_verified: result?.smtp_verified === true,
              relay_fetch_enabled: result?.relay_fetch_enabled === true,
              smtp_error: result?.smtp_error || null,
              verify_status: 'success',
              verify_message: result?.message || '验号成功',
              error_message: '',
              import_status: 'pending'
            })
            return
          }

          if (currentLiveItem) {
            currentLiveItem.status = 'error'
            currentLiveItem.protocol = protocol
            currentLiveItem.resolved_protocol = null
            currentLiveItem.smtp_verified = false
            currentLiveItem.message = result?.message || '验号失败'
          }
          liveProgress.value.failed += 1
          rows.push({
            id: item.id,
            email: item.email,
            password: item.password,
            input_protocol: protocol,
            resolved_protocol: null,
            smtp_verified: false,
            verify_status: 'failed',
            verify_message: '',
            error_message: result?.message || '验号失败',
            import_status: 'pending'
          })
        } catch (error: any) {
          const errorMessage = String(error?.message || error || '验号失败')
          if (currentLiveItem) {
            currentLiveItem.status = 'error'
            currentLiveItem.protocol = protocol
            currentLiveItem.resolved_protocol = null
            currentLiveItem.smtp_verified = false
            currentLiveItem.message = errorMessage
          }
          liveProgress.value.failed += 1
          rows.push({
            id: item.id,
            email: item.email,
            password: item.password,
            input_protocol: protocol,
            resolved_protocol: null,
            smtp_verified: false,
            verify_status: 'failed',
            verify_message: '',
            error_message: errorMessage,
            import_status: 'pending'
          })
        } finally {
          liveProgress.value.completed += 1
        }
      }
    })
    exportRows.value = rows
  } finally {
    liveProgress.value.currentEmail = ''
    verifying.value = false
  }
}

const loadRuntimeProxyOrWarn = async () => {
  if (!selectedProxyId.value) return null
  const selectedRuntimeProxy = await loadSelectedRuntimeProxy()
  if (!selectedRuntimeProxy) {
    showMessage('所选代理当前不可用，请更换后重试', 'warning')
    return undefined
  }
  return selectedRuntimeProxy
}

const startVerify = async () => {
  if (verifyBusy.value) return
  if (validItems.value.length === 0) {
    showMessage('先导入可验账号', 'warning')
    return
  }

  const targetItems = getUnprocessedValidItems()
  if (targetItems.length === 0) {
    showMessage('没有新增或改动的账号需要验号', 'warning')
    return
  }

  const selectedRuntimeProxy = await loadRuntimeProxyOrWarn()
  if (selectedRuntimeProxy === undefined) return

  const hasPasswordItems = targetItems.some((item: any) => String(item?.auth_type || 'password') !== 'oauth2')
  if (hasPasswordItems && !isDesktop) {
    showMessage('账号密码类批量验号需要在桌面端客户端里操作', 'warning')
    return
  }

  await runDirectVerification(targetItems, selectedRuntimeProxy)
  markCandidatesProcessed(targetItems)
}

const retryFailedItems = async () => {
  if (verifyBusy.value) return
  if (failedRows.value.length === 0) {
    showMessage('当前没有可重试的失败项', 'warning')
    return
  }

  const selectedRuntimeProxy = await loadRuntimeProxyOrWarn()
  if (selectedRuntimeProxy === undefined) return

  importingForVerify.value = true
  try {
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
    await runImportedVerification(importedItems, batchNo, true, selectedRuntimeProxy)
  } finally {
    importingForVerify.value = false
  }
}

onMounted(async () => {
  await loadProxyOptions()
  window.requestAnimationFrame(syncSidePanelViewport)
  if (!isDesktop) return
  try {
    const { listen } = await import('@tauri-apps/api/event')
    unlistenVerifyProgress = await listen('external-verify-progress', (event: any) => {
      handleVerifyProgressEvent(event?.payload)
    })
  } catch (error) {
    console.error('注册验号进度监听失败', error)
  }
})

onBeforeUnmount(() => {
  unlistenVerifyProgress?.()
  unlistenVerifyProgress = null
})
</script>

<style scoped>
.verify-select :deep(button[aria-expanded]) {
  @apply h-8 rounded border-gray-200 pl-2 pr-7 text-xs;
}

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
