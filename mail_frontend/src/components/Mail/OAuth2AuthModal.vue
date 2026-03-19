<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] p-4 sm:p-6">
      <div class="mx-auto flex h-full w-full max-w-3xl items-center justify-center">
      <div class="w-full overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 max-h-[86vh] flex flex-col">
        <!-- 标题栏 -->
        <div class="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <h3 class="text-2xl font-semibold text-gray-800">OAuth2 授权登录</h3>
          <button @click="handleClose" class="text-gray-400 hover:text-gray-600 transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="p-5 overflow-y-auto">
          <!-- 说明 -->
          <div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 leading-relaxed">
            <p>以下邮箱需要 OAuth2 授权。点击"开始授权"后将逐个打开授权窗口，请在新窗口中完成登录。</p>
          </div>

          <!-- 邮箱列表 -->
          <div class="border border-gray-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
            <div v-for="(item, idx) in accounts" :key="item.email" 
                 class="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-b-0"
                 :class="getRowClass(item.status)">
              <!-- 序号 -->
              <span class="text-gray-400 text-sm w-6">{{ idx + 1 }}.</span>
              
              <!-- 状态图标 -->
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
              
              <!-- 邮箱地址 -->
              <span class="flex-1 font-mono text-sm truncate" :class="item.status === 'error' ? 'text-red-600' : 'text-gray-700'">
                {{ item.email }}
              </span>
              
              <!-- 平台标签 -->
              <span class="text-xs px-2 py-0.5 rounded" :class="item.provider === 'google' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'">
                {{ item.provider === 'google' ? 'Gmail' : 'Outlook' }}
              </span>
              
              <!-- 状态文字 -->
              <span class="text-xs text-gray-500 w-20 text-right">
                {{ getStatusText(item.status) }}
              </span>
            </div>
          </div>

          <!-- 当前授权进度 -->
          <div v-if="isAuthorizing" class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <div class="flex items-center gap-2 text-blue-700 text-sm">
              <span class="inline-flex h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse"></span>
              <span>{{ progressText }}</span>
            </div>
            <p class="text-xs text-blue-600 mt-1">{{ progressHint }}</p>
          </div>

          <!-- 错误提示 -->
          <div v-if="errorMessage" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {{ errorMessage }}
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="px-5 py-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
          <div class="text-sm text-gray-500">
            共 {{ accounts.length }} 个邮箱，成功 {{ successCount }} 个，失败 {{ failCount }} 个
          </div>
          <div class="flex gap-3">
            <button
              @click="handleClose"
              class="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition"
            >
              {{ isAuthorizing ? '终止' : (isFinished ? '关闭' : '取消') }}
            </button>
            <button
              v-if="!isFinished"
              @click="startAuthorization"
              :disabled="isAuthorizing || accounts.length === 0"
              class="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition disabled:opacity-50 inline-flex items-center gap-2"
            >
              {{ primaryButtonText }}
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
import batchLoginAPI from '@/api/batchLogin'
import { isTauri } from '@/services/api'

interface OpenExternalResult {
  opened: boolean
  popup: Window | null
}

type WaitResult = 'authorized' | 'timeout' | 'popup_closed' | 'cancelled'
type AuthPhase = 'idle' | 'preparing' | 'waiting'

const buildPopupFeatures = () => {
  const popupWidth = 720
  const popupHeight = 720
  const screenLeft = typeof window.screenLeft === 'number' ? window.screenLeft : window.screenX
  const screenTop = typeof window.screenTop === 'number' ? window.screenTop : window.screenY
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || screen.width
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || screen.height
  const left = Math.max(0, screenLeft + Math.round((viewportWidth - popupWidth) / 2))
  const top = Math.max(0, screenTop + Math.round((viewportHeight - popupHeight) / 2))

  return [
    'popup=yes',
    `width=${popupWidth}`,
    `height=${popupHeight}`,
    `left=${left}`,
    `top=${top}`,
    'resizable=yes',
    'scrollbars=yes'
  ].join(',')
}

const getProviderLabel = (provider: 'google' | 'microsoft') =>
  provider === 'google' ? 'Google' : 'Microsoft'

const renderPreparingPopup = (popup: Window | null, provider: 'google' | 'microsoft') => {
  if (!popup) return

  try {
    popup.document.open()
    popup.document.write(`
      <!doctype html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>正在打开授权页面</title>
          <style>
            body {
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              color: #1f2937;
            }
            .card {
              width: min(420px, calc(100vw - 48px));
              padding: 32px 28px;
              background: rgba(255, 255, 255, 0.96);
              border: 1px solid #dbeafe;
              border-radius: 18px;
              box-shadow: 0 18px 60px rgba(15, 23, 42, 0.12);
              text-align: center;
            }
            .spinner {
              width: 38px;
              height: 38px;
              margin: 0 auto 18px;
              border-radius: 9999px;
              border: 3px solid #bfdbfe;
              border-top-color: #2563eb;
              animation: spin 0.9s linear infinite;
            }
            h1 {
              margin: 0 0 10px;
              font-size: 20px;
              color: #111827;
            }
            p {
              margin: 0;
              font-size: 14px;
              line-height: 1.7;
              color: #4b5563;
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="spinner"></div>
            <h1>正在打开 ${getProviderLabel(provider)} 授权页面</h1>
            <p>授权链接已获取中，请稍候，不要关闭当前窗口。</p>
          </div>
        </body>
      </html>
    `)
    popup.document.close()
    popup.focus()
  } catch (e) {
    console.warn('[OAuth2] 渲染授权准备页失败:', e)
  }
}

const openPreparingPopup = (provider: 'google' | 'microsoft') => {
  const popup = window.open('', 'oauth2_authorize_window', buildPopupFeatures())
  renderPreparingPopup(popup, provider)
  return popup
}

// 动态获取 Tauri shell API
async function openExternal(url: string, popupWindow: Window | null = null): Promise<OpenExternalResult> {
  if (isTauri()) {
    try {
      const { open } = await import('@tauri-apps/plugin-shell')
      await open(url)
      return { opened: true, popup: null }
    } catch (e) {
      console.error('[OAuth2] Tauri shell.open 失败:', e)
      // 降级尝试 window.open
      const win = window.open(url, '_blank')
      return { opened: !!win, popup: win ?? null }
    }
  } else {
    const win = popupWindow && !popupWindow.closed
      ? popupWindow
      : window.open('', 'oauth2_authorize_window', buildPopupFeatures())

    if (win) {
      try {
        win.location.href = url
        win.focus()
      } catch (e) {
        console.warn('[OAuth2] 复用授权窗口失败，尝试重新打开:', e)
        const fallbackWin = window.open(url, 'oauth2_authorize_window', buildPopupFeatures())
        return { opened: !!fallbackWin, popup: fallbackWin ?? null }
      }
    }
    return { opened: !!win, popup: win ?? null }
  }
}

interface OAuthAccount {
  email: string
  provider: 'google' | 'microsoft'
  status: 'pending' | 'authorizing' | 'success' | 'error'
}

const props = defineProps<{
  visible: boolean
  pendingAccounts: Array<{ email: string, provider: string }>
}>()

const emit = defineEmits(['close', 'complete'])

const accounts = ref<OAuthAccount[]>([])
const isAuthorizing = ref(false)
const currentIndex = ref(-1)
const stopRequested = ref(false)
const authPhase = ref<AuthPhase>('idle')

const currentEmail = computed(() => {
  if (currentIndex.value >= 0 && currentIndex.value < accounts.value.length) {
    return accounts.value[currentIndex.value].email
  }
  return ''
})

const successCount = computed(() => accounts.value.filter(a => a.status === 'success').length)
const failCount = computed(() => accounts.value.filter(a => a.status === 'error').length)
const progressText = computed(() => {
  if (!isAuthorizing.value) return ''
  if (authPhase.value === 'preparing') {
    return `正在打开授权页面 ${currentIndex.value + 1}/${accounts.value.length}: ${currentEmail.value}`
  }
  return `正在授权 ${currentIndex.value + 1}/${accounts.value.length}: ${currentEmail.value}`
})
const progressHint = computed(() => {
  if (authPhase.value === 'preparing') {
    return '正在获取授权链接并打开新窗口，请稍候，不要关闭即将打开的窗口。'
  }
  return '请在弹出的窗口中完成授权。若手动关闭授权窗口，本次批量授权会停止。'
})
const primaryButtonText = computed(() => {
  if (!isAuthorizing.value) return '开始授权'
  if (authPhase.value === 'preparing') return '正在打开授权页...'
  return '授权中，请在弹窗中完成'
})
const isFinished = computed(() => {
  return accounts.value.length > 0 && accounts.value.every(a => a.status === 'success' || a.status === 'error')
})

watch(() => props.visible, (visible) => {
  if (visible) {
    // 初始化账号列表
    accounts.value = props.pendingAccounts.map(a => ({
      email: a.email,
      provider: a.provider as 'google' | 'microsoft',
      status: 'pending' as const
    }))
    currentIndex.value = -1
    isAuthorizing.value = false
    stopRequested.value = false
    authPhase.value = 'idle'
    errorMessage.value = ''
  } else {
    stopRequested.value = true
    authPhase.value = 'idle'
    closeActivePopupWindow()
  }
})

const getRowClass = (status: string) => {
  switch (status) {
    case 'success': return 'bg-green-50'
    case 'error': return 'bg-red-50'
    case 'authorizing': return 'bg-blue-50'
    default: return ''
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'success': return '授权成功'
    case 'error': return '授权失败'
    case 'authorizing': return '授权中...'
    default: return '待授权'
  }
}

const errorMessage = ref('')
let activePopupWindow: Window | null = null
const normalizeEmail = (value: string) => (value || '').trim().toLowerCase()

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

const waitForDesktopOAuthCallback = (timeoutMs: number) =>
  new Promise<{ success: boolean, email?: string, error?: string } | null>((resolve) => {
    const stopWatcher = window.setInterval(() => {
      if (stopRequested.value) {
        cleanup()
        resolve({ success: false, error: '已取消授权' })
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
      if (stopRequested.value) {
        cleanup()
        resolve({ success: false, error: '已取消授权' })
        return
      }

      if (popupWindow && popupWindow.closed) {
        cleanup()
        resolve({ success: false, error: '检测到授权窗口已关闭', popupClosed: true })
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
  const targetIndex = accounts.value.findIndex((item) => normalizeEmail(item.email) === normalized)

  if (targetIndex === -1) {
    const fallback = accounts.value[fallbackIndex]
    if (fallback) {
      fallback.status = 'error'
    }
    errorMessage.value = `授权成功，但邮箱不在列表: ${returnedEmail}`
    return
  }

  if (targetIndex !== fallbackIndex) {
    const current = accounts.value[fallbackIndex]
    if (current && current.status === 'authorizing') {
      current.status = 'pending'
    }
  }

  accounts.value[targetIndex].status = 'success'
  errorMessage.value = ''
}

const startAuthorization = async () => {
  if (isAuthorizing.value) return

  isAuthorizing.value = true
  stopRequested.value = false
  authPhase.value = 'preparing'
  errorMessage.value = ''
  
  for (let i = 0; i < accounts.value.length; i++) {
    if (stopRequested.value) {
      break
    }

    const account = accounts.value[i]
    
    // 跳过已完成的
    if (account.status === 'success' || account.status === 'error') {
      continue
    }
    
    currentIndex.value = i
    account.status = 'authorizing'
    
    try {
      errorMessage.value = ''
      // 获取授权 URL（桌面端传 isDesktop=true）
      const isDesktop = isTauri()
      authPhase.value = 'preparing'
      activePopupWindow = isDesktop ? null : openPreparingPopup(account.provider)
      console.log('[OAuth2] 获取授权 URL:', account.provider, 'isDesktop:', isDesktop)
      const res = await batchLoginAPI.getOAuth2AuthUrl(account.provider, isDesktop, account.email)
      console.log('[OAuth2] API 返回:', res)
      
      // 处理不同的返回格式
      const authUrl = res.data?.auth_url || res.auth_url
      
      if (!authUrl) {
        console.error('[OAuth2] 没有获取到授权 URL:', res)
        errorMessage.value = res.message || res.data?.message || '获取授权链接失败'
        account.status = 'error'
        closeActivePopupWindow()
        continue
      }
      
      console.log('[OAuth2] 打开授权页面:', authUrl)
      
      // 打开授权页面（桌面端用系统浏览器，Web端用弹窗）
      const openResult = await openExternal(authUrl, activePopupWindow)
      activePopupWindow = openResult.popup
      
      if (!openResult.opened) {
        console.error('[OAuth2] 打开授权页面失败')
        errorMessage.value = '无法打开授权页面，请手动复制链接到浏览器'
        account.status = 'error'
        closeActivePopupWindow()
        continue
      }
      
      const maxWait = 5 * 60 * 1000
      let waitResult: WaitResult = 'timeout'
      let callbackEmail = ''
      authPhase.value = 'waiting'

      if (isDesktop) {
        const callbackResult = await waitForDesktopOAuthCallback(maxWait)
        if (callbackResult?.success === false) {
          account.status = 'error'
          errorMessage.value = callbackResult.error || '授权失败'
          closeActivePopupWindow()
          stopRequested.value = true
          break
        }

        if (callbackResult?.success) {
          callbackEmail = (callbackResult.email || '').trim()
          waitResult = 'authorized'
        } else {
          waitResult = stopRequested.value ? 'cancelled' : 'timeout'
        }
      } else {
        const callbackResult = await waitForWebOAuthCallback(maxWait, activePopupWindow)
        if (callbackResult?.success === false) {
          if (callbackResult.popupClosed) {
            waitResult = 'popup_closed'
          } else {
            account.status = 'error'
            errorMessage.value = callbackResult.error || '授权失败'
            closeActivePopupWindow()
            stopRequested.value = true
            break
          }
        } else if (callbackResult?.success) {
          callbackEmail = (callbackResult.email || '').trim()
          waitResult = 'authorized'
        } else {
          waitResult = stopRequested.value ? 'cancelled' : 'timeout'
        }
      }

      closeActivePopupWindow()
      
      if (waitResult === 'authorized') {
        const authorizedEmail = callbackEmail || account.email
        markAuthorizedByEmail(authorizedEmail, i)
      } else if (waitResult === 'popup_closed') {
        account.status = 'error'
        errorMessage.value = '检测到授权窗口已关闭，已停止后续授权，请重试'
        stopRequested.value = true
        break
      } else if (waitResult === 'cancelled') {
        account.status = 'error'
        errorMessage.value = '已终止授权'
        break
      } else {
        account.status = 'error'
        errorMessage.value = '授权超时或未完成，请重试'
      }
      
    } catch (e: any) {
      closeActivePopupWindow()
      console.error('[OAuth2] 授权失败:', e)
      errorMessage.value = e.message || '授权失败'
      account.status = 'error'
      stopRequested.value = true
      break
    }
  }
  
  isAuthorizing.value = false
  stopRequested.value = false
  authPhase.value = 'idle'
  currentIndex.value = -1
  closeActivePopupWindow()
  
  // 通知父组件授权完成
  emit('complete', {
    successCount: successCount.value,
    failCount: failCount.value,
    accounts: accounts.value
  })
}

const handleClose = () => {
  if (isAuthorizing.value) {
    stopRequested.value = true
    closeActivePopupWindow()
    errorMessage.value = '正在终止授权...'
    return
  }
  emit('close')
}
</script>
