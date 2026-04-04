<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 p-4 sm:p-6">
      <div class="mx-auto flex h-full w-full max-w-4xl items-center justify-center">
        <div class="w-full overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 max-h-[86vh] flex flex-col">
          <!-- 标题栏 -->
          <div class="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
            <h3 class="text-lg font-semibold text-gray-800">{{ t('batchAdd.title') }}</h3>
            <button @click="handleClose" class="text-gray-400 hover:text-gray-600 transition">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="p-5 overflow-y-auto flex-1">
            <!-- 输入区域 + 结果 -->
            <div class="grid grid-cols-10 gap-4">
              <!-- 左侧：输入框 -->
              <div class="col-span-5">
                <div class="text-sm text-gray-600 mb-2 h-6 flex items-center font-medium">
                  {{ t('batchAdd.inputLabel') }}
                </div>
                <textarea
                  v-model="accountsText"
                  :placeholder="t('batchAdd.inputPlaceholder')"
                  class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 font-mono resize-none transition"
                  :style="{ height: oauthAccounts.length > 0 ? '120px' : '280px', lineHeight: '20px', fontSize: '13px' }"
                ></textarea>
              </div>

              <!-- 右侧：结果状态 -->
              <div class="col-span-5">
                <div class="text-sm text-gray-600 mb-2 h-6 flex items-center font-medium">
                  {{ t('batchAdd.resultLabel') }}
                </div>
                <div class="border border-gray-200 rounded-xl p-2 bg-gray-50 overflow-y-auto"
                     :style="{ height: oauthAccounts.length > 0 ? '120px' : '280px' }">
                  <div v-if="results.length === 0" class="text-sm text-gray-400 text-center" :class="oauthAccounts.length > 0 ? 'py-10' : 'py-20'">
                    {{ t('batchAdd.resultEmpty') }}
                  </div>
                  <div v-else class="space-y-0">
                    <div v-for="(result, idx) in results" :key="idx"
                         class="flex items-center gap-2 px-2 rounded group"
                         :class="result.status === 'error' ? 'bg-red-50' : result.status === 'success' ? 'bg-green-50' : ''"
                         style="height: 20px; line-height: 20px; font-size: 14px;">
                      <span v-if="result.status === 'success'" class="text-green-600 font-bold w-3">✓</span>
                      <span v-else-if="result.status === 'error'" class="text-red-600 font-bold w-3">✗</span>
                      <span v-else class="text-gray-400 w-3">⋯</span>
                      <div class="flex-1 min-w-0 font-mono truncate" :class="result.status === 'error' ? 'text-red-700' : 'text-gray-700'">
                        {{ result.email }}
                      </div>
                      <div v-if="result.message" class="relative flex-shrink-0">
                        <div class="text-gray-500 max-w-xs truncate cursor-help text-xs">
                          {{ result.message }}
                        </div>
                        <div class="invisible group-hover:visible absolute left-0 top-full mt-1 z-50 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-pre-wrap max-w-xs shadow-lg">
                          {{ result.message }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 登录方式 -->
            <div class="mt-4 pt-4 border-t border-gray-100">
              <div class="flex items-center gap-6">
                <div class="flex items-center gap-3">
                  <span class="text-sm text-gray-700 font-medium">{{ t('batchAdd.loginMode') }}</span>
                  <label class="flex items-center text-sm cursor-pointer hover:text-primary-600 transition">
                    <input type="radio" v-model="loginMode" value="auto" class="mr-1.5 h-4 w-4 border-gray-300 text-primary-600 accent-primary-600 focus:ring-primary-500">
                    {{ t('batchAdd.autoRecommended') }}
                  </label>
                  <label class="flex items-center text-sm cursor-pointer hover:text-primary-600 transition">
                    <input type="radio" v-model="loginMode" value="custom" class="mr-1.5 h-4 w-4 border-gray-300 text-primary-600 accent-primary-600 focus:ring-primary-500">
                    {{ t('batchAdd.customServer') }}
                  </label>
                </div>
              </div>

              <div v-if="loginMode === 'custom'" class="mt-3 flex items-center gap-3">
                <span class="text-sm text-gray-600 w-16">{{ t('batchAdd.server') }}</span>
                <input
                  v-model="customHost"
                  type="text"
                  :placeholder="t('batchAdd.serverPlaceholder')"
                  class="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                />
                <span class="text-sm text-gray-600">{{ t('batchAdd.port') }}</span>
                <input
                  v-model.number="customPort"
                  type="number"
                  :placeholder="t('batchAdd.portPlaceholder')"
                  class="w-24 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <!-- ========== OAuth 授权区域（有待授权邮箱时显示） ========== -->
            <template v-if="oauthAccounts.length > 0">
              <div class="mt-4 pt-4 border-t border-gray-100">
                <!-- 说明 -->
                <div class="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 leading-relaxed">
                  {{ t('batchAdd.oauthNotice') }}
                </div>

                <!-- 邮箱列表 -->
                <div class="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                  <div v-for="(item, idx) in oauthAccounts" :key="item.email"
                       class="flex items-center gap-3 px-4 py-2 border-b border-gray-100 last:border-b-0"
                       :class="getOAuthRowClass(item.status)">
                    <span class="text-gray-400 text-sm w-6">{{ idx + 1 }}.</span>

                    <span class="w-5 flex-shrink-0 flex items-center justify-center">
                      <svg v-if="item.status === 'success'" class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                      </svg>
                      <svg v-else-if="item.status === 'error'" class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                      </svg>
                      <span v-else-if="item.status === 'authorizing'" class="inline-flex h-3 w-3 rounded-full bg-blue-500 animate-pulse"></span>
                      <span v-else class="h-3 w-3 rounded-full border-2 border-gray-300 block"></span>
                    </span>

                    <span class="flex-1 font-mono text-sm truncate" :class="item.status === 'error' ? 'text-red-600' : 'text-gray-700'">
                      {{ item.email }}
                    </span>

                    <span class="text-xs px-2 py-0.5 rounded" :class="item.provider === 'google' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'">
                      {{ item.provider === 'google' ? 'Gmail' : 'Outlook' }}
                    </span>

                    <span class="text-xs text-gray-500 w-16 text-right">
                      {{ getOAuthStatusText(item.status) }}
                    </span>
                  </div>
                </div>

                <!-- 当前授权进度 -->
                <div v-if="isOAuthAuthorizing" class="mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                  <div class="flex items-center gap-2 text-blue-700 text-sm">
                    <span class="inline-flex h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                    <span>{{ oauthProgressText }}</span>
                  </div>
                  <p class="text-xs text-blue-600 mt-1">{{ oauthProgressHint }}</p>
                </div>

                <!-- 错误提示 -->
                <div v-if="oauthErrorMessage" class="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {{ oauthErrorMessage }}
                </div>
              </div>
            </template>
          </div>

          <!-- ========== 底部按钮 ========== -->
          <div class="px-5 py-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
            <!-- 左侧信息 -->
            <div class="text-sm text-gray-500">
              <template v-if="oauthAccounts.length > 0">
                {{ t('batchAdd.oauthSummary', { total: oauthAccounts.length, success: oauthSuccessCount, fail: oauthFailCount }) }}
              </template>
            </div>

            <!-- 右侧按钮 -->
            <div class="flex gap-3">
              <button
                @click="handleClose"
                :disabled="loading"
                class="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ closeButtonText }}
              </button>

              <!-- 有待授权的 OAuth 邮箱时显示"开始授权"，否则显示"开始添加" -->
              <button
                v-if="hasOAuthPending"
                @click="startOAuthAuthorization"
                :disabled="isOAuthAuthorizing"
                class="px-5 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {{ oauthPrimaryButtonText }}
              </button>
              <button
                v-else
                @click="handleSubmit()"
                :disabled="loading || !accountsText.trim()"
                class="px-5 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {{ loading ? t('batchAdd.adding') : t('batchAdd.startAdd') }}
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
import { useI18n } from 'vue-i18n'
import batchLoginAPI from '@/api/batchLogin'
import { isTauri } from '@/services/api'
const { t } = useI18n()

// ===== Props & Emits =====
const props = defineProps<{ visible: boolean, loading?: boolean }>()
const emit = defineEmits(['close', 'submit', 'oauth-complete'])

// ===== 输入模式状态 =====
const accountsText = ref('')
const loginMode = ref<'auto' | 'custom'>('auto')
const customHost = ref('')
const customPort = ref(995)
const results = ref<Array<{ email: string, status: 'pending' | 'success' | 'error', message?: string }>>([])

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

// ===== 初始化与重置 =====
const resetState = () => {
  accountsText.value = ''
  loginMode.value = 'auto'
  customHost.value = ''
  customPort.value = 993
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

      const account: any = { email, password, protocol: proto }

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
    case 'authorizing': return 'bg-blue-50'
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
  updateResult: (email: string, status: 'success' | 'error', message?: string) => {
    const index = results.value.findIndex(r => r.email === email)
    if (index !== -1) {
      results.value[index] = { email, status, message }
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
