import { onUnmounted, ref } from 'vue'

import { batchLoginAPI } from '@/api/batchLogin'
import { getServerUrl, isTauri } from '@/services/api'
import { isAutoRecoveryLimitError, normalizeOAuthRecoveryErrorMessage } from '@/utils/oauthRecovery'

import { getDesktopMailboxAccounts, invalidateDesktopMailboxes, subscribeDesktopMailboxChanges } from '@/services/desktopMailboxCache'
import { clearDesktopOAuthTokens, desktopOAuthRefreshAt, getDesktopOAuthAccessToken } from '@/services/desktopOAuthMailbox'

const RETRY_DELAY_MS = 5 * 60 * 1000
const WAKE_REFRESH_MIN_GAP_MS = 30 * 1000

type OAuthMailboxAccount = {
  id: number
  email?: string
  password?: string
  auth_type?: string
  oauth_provider?: string
  status?: string
  error_message?: string
}

const AUTH_RECOVERY_KEYWORDS = ['auth', 'token', 'oauth', '授权', '失效', '重新授权', 'login', 'refresh_token']

const getErrorMessage = (error: any) =>
  error?.response?.data?.message || error?.message || String(error || '')

const shouldAttemptSilentRecovery = (message: string) => {
  const normalized = String(message || '').toLowerCase()
  return AUTH_RECOVERY_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

const getTauriInvoke = async () => {
  if (!isTauri()) return null
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke
}

export function useDesktopOAuthKeepAlive() {
  const isRunning = ref(false)
  const isRefreshing = ref(false)
  let timer: number | null = null
  let lastWakeRefreshAt = 0
  let sessionVersion = 0
  let sessionToken = ''
  let unsubscribeCache: (() => void) | undefined
  const nextChecks = new Map<number, number>()

  const scheduleNext = (delay?: number) => {
    if (!isRunning.value) return
    if (timer) {
      clearTimeout(timer)
    }
    timer = null
    const wait = delay ?? (nextChecks.size ? Math.max(1000, Math.min(...nextChecks.values()) - Date.now()) : undefined)
    if (wait === undefined) return
    timer = window.setTimeout(() => {
      timer = null
      void refreshAllOAuthTokens()
    }, wait)
  }

  const loadOAuthAccounts = async (): Promise<OAuthMailboxAccount[]> => {
    const list = await getDesktopMailboxAccounts()
    return list.filter(
      (account: OAuthMailboxAccount) => String(account?.auth_type || '').toLowerCase() === 'oauth2'
    )
  }

  const refreshAllOAuthTokens = async () => {
    if (!isTauri() || !isRunning.value || isRefreshing.value) {
      return
    }

    const authToken = localStorage.getItem('token')
    if (!authToken) {
      scheduleNext()
      return
    }

    const version = sessionVersion
    isRefreshing.value = true
    let retryDelay: number | undefined
    try {
      const oauthAccounts = await loadOAuthAccounts()
      const ids = new Set(oauthAccounts.map(account => account.id))
      for (const id of nextChecks.keys()) if (!ids.has(id)) nextChecks.delete(id)
      const tauriInvoke = await getTauriInvoke()
      for (const account of oauthAccounts) {
        if (!isRunning.value || localStorage.getItem('token') !== authToken) break
        if ((nextChecks.get(account.id) || 0) > Date.now()) continue
        try {
          await getDesktopOAuthAccessToken(account.id)
          if (!isRunning.value || version !== sessionVersion || localStorage.getItem('token') !== authToken) break
          nextChecks.set(account.id, Math.max(Date.now() + 60000, desktopOAuthRefreshAt(account.id) || Date.now() + RETRY_DELAY_MS))
          if (
            account.status === 'failed' &&
            AUTH_RECOVERY_KEYWORDS.some((keyword) =>
              String(account.error_message || '').toLowerCase().includes(keyword)
            )
          ) {
            await batchLoginAPI.updateMailboxStatus(account.id, 'active')
          }
        } catch (error: any) {
          if (!isRunning.value || version !== sessionVersion || localStorage.getItem('token') !== authToken) break
          nextChecks.set(account.id, Date.now() + RETRY_DELAY_MS)
          const errorMessage = getErrorMessage(error)
          const recovered = await trySilentRecover(account, authToken, errorMessage, tauriInvoke)
          if (recovered) {
            continue
          }
          console.warn('[DesktopOAuthKeepAlive] token keep-alive request failed:', {
            mailboxId: account.id,
            email: account.email,
            provider: account.oauth_provider,
            message: errorMessage
          })
        }
      }
    } catch (error: any) {
      retryDelay = 60000
      console.warn(
        '[DesktopOAuthKeepAlive] load oauth accounts failed:',
        error?.response?.data?.message || error?.message || String(error || '')
      )
    } finally {
      if (version === sessionVersion) {
        isRefreshing.value = false
        scheduleNext(retryDelay)
      }
    }
  }

  const trySilentRecover = async (
    account: OAuthMailboxAccount,
    authToken: string,
    rawMessage: string,
    tauriInvoke: any
  ) => {
    if (!tauriInvoke || !shouldAttemptSilentRecovery(rawMessage) || !String(account.password || '').trim()) {
      return false
    }

    try {
      await tauriInvoke('recover_external_mailbox_session', {
        mailboxId: account.id,
        token: authToken,
        serverUrl: getServerUrl()
      })
      window.dispatchEvent(
        new CustomEvent('external-mailbox-recovered', {
          detail: { mailboxId: account.id }
        })
      )
      return true
    } catch (recoveryError: any) {
      const rawMessage = getErrorMessage(recoveryError)
      const message = normalizeOAuthRecoveryErrorMessage(rawMessage)
      if (isAutoRecoveryLimitError(rawMessage)) {
        try {
          await batchLoginAPI.updateMailboxStatus(account.id, 'failed', message)
          window.dispatchEvent(
            new CustomEvent('external-mailbox-updated', {
              detail: { mailboxId: account.id }
            })
          )
        } catch (statusError) {
          console.warn('[DesktopOAuthKeepAlive] update failed status error:', statusError)
        }
      }
      console.warn('[DesktopOAuthKeepAlive] silent recovery failed:', {
        mailboxId: account.id,
        email: account.email,
        provider: account.oauth_provider,
        message: rawMessage
      })
      return false
    }
  }

  const triggerWakeRefresh = async () => {
    if (!isRunning.value || !isTauri()) return

    const now = Date.now()
    if (now - lastWakeRefreshAt < WAKE_REFRESH_MIN_GAP_MS) {
      return
    }
    lastWakeRefreshAt = now
    await refreshAllOAuthTokens()
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void triggerWakeRefresh()
    }
  }

  const handleWindowFocus = () => {
    void triggerWakeRefresh()
  }

  const handleWindowOnline = () => {
    void triggerWakeRefresh()
  }

  const start = async (runImmediately = true) => {
    if (!isTauri()) return
    const token = localStorage.getItem('token') || ''
    if (isRunning.value && sessionToken === token) return
    if (isRunning.value) stop()
    sessionToken = token

    sessionVersion++
    isRunning.value = true
    unsubscribeCache = subscribeDesktopMailboxChanges(change => {
      if (change.resource === 'proxy') return
      if (change.mailbox_id) nextChecks.delete(change.mailbox_id)
      else nextChecks.clear()
      scheduleNext(300)
    })
    window.addEventListener('focus', handleWindowFocus)
    window.addEventListener('online', handleWindowOnline)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    if (runImmediately) {
      await refreshAllOAuthTokens()
      return
    }
    scheduleNext(0)
  }

  const stop = () => {
    sessionVersion++
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    sessionToken = ''
    isRunning.value = false
    isRefreshing.value = false
    unsubscribeCache?.()
    unsubscribeCache = undefined
    nextChecks.clear()
    clearDesktopOAuthTokens()
    window.removeEventListener('focus', handleWindowFocus)
    window.removeEventListener('online', handleWindowOnline)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }

  onUnmounted(() => {
    stop()
  })

  return {
    isRunning,
    isRefreshing,
    start,
    stop,
    refreshNow: async () => { invalidateDesktopMailboxes(); await refreshAllOAuthTokens() }
  }
}
