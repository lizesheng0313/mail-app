import { batchLoginAPI } from '@/api/batchLogin'
import { getServerUrl } from './api'
import { subscribeDesktopMailboxChanges } from './desktopMailboxCache'

type OAuthAccessTokenPayload = {
  access_token: string
  email: string
  imap_host: string
  imap_port: number
  provider?: string
  expires_at?: number
  refresh_before_at?: number
  next_refresh_at?: number
  should_cache?: boolean
}

const tokens = new Map<number, OAuthAccessTokenPayload>()
const pending = new Map<number, Promise<OAuthAccessTokenPayload>>()
let identity = ''
let generation = 0
const ensureIdentity = () => {
  const next = `${getServerUrl()}|${localStorage.getItem('token') || ''}`
  if (next !== identity) { clearDesktopOAuthTokens(); identity = next }
}
export const clearDesktopOAuthTokens = (id?: number) => {
  generation++
  if (id) { tokens.delete(id); pending.delete(id) }
  else { tokens.clear(); pending.clear() }
}
subscribeDesktopMailboxChanges(change => {
  if (change.resource !== 'proxy') clearDesktopOAuthTokens(change.mailbox_id)
})
export const desktopOAuthRefreshAt = (id: number) => {
  ensureIdentity()
  const token = tokens.get(id)
  if (!token) return 0
  return Math.min(Number(token.next_refresh_at || Infinity), Number(token.refresh_before_at || Infinity), Number(token.expires_at || 0) - 60000)
}

const requestToken = (id: number, suppressErrorMessage: boolean, force = false): Promise<OAuthAccessTokenPayload> => {
  if (!localStorage.getItem('token')) return Promise.reject(new Error('登录状态已变化'))
  ensureIdentity()
  if (pending.has(id)) return pending.get(id)!
  const cached = tokens.get(id)
  if (!force && cached && Date.now() < desktopOAuthRefreshAt(id)) return Promise.resolve(cached)
  const version = generation
  const scope = identity
  const promise = (async () => {
    if (force) {
      const response: any = await batchLoginAPI.refreshOAuth2Token(id, getRequestConfig(suppressErrorMessage))
      if (response.code !== 0) throw new Error(response.message || '刷新 token 失败')
    }
    const response: any = await batchLoginAPI.getOAuth2AccessToken(id, getRequestConfig(suppressErrorMessage))
    if (version !== generation || scope !== `${getServerUrl()}|${localStorage.getItem('token') || ''}`) throw new Error('邮箱授权配置已变化，请重试')
    if (response.code !== 0 || !response.data?.access_token) throw new Error(response.message || '获取 token 失败')
    // Access tokens are held in memory only, never localStorage or the sync journal.
    if (response.data.should_cache !== false) tokens.set(id, response.data)
    return response.data
  })()
  pending.set(id, promise)
  void promise.finally(() => { if (pending.get(id) === promise) pending.delete(id) }).catch(() => {})
  return promise
}

type OAuthActionOptions = {
  suppressErrorMessage?: boolean
}

const OAUTH_RETRY_KEYWORDS = [
  'oauth2',
  'xoauth2',
  'auth',
  'token',
  'credential',
  'login',
  '重新授权',
  '授权',
  '选择收件箱失败',
  'bad response: command',
  'command error',
  'not authenticated',
  'invalid credentials'
]

const getRequestConfig = (suppressErrorMessage = true) => ({
  suppressErrorMessage, timeout: 15000
})

const getErrorMessage = (error: any) =>
  error?.response?.data?.message || error?.message || String(error || '')

const shouldSkipTokenForceRefresh = (error: any) => {
  const message = getErrorMessage(error).toLowerCase()
  return ['refresh_token 不存在', '等待桌面端自动恢复', '配置已变化', '登录状态已变化'].some(reason => message.includes(reason))
}

export const shouldRetryOAuthMailboxAction = (error: any) => {
  const message = getErrorMessage(error).toLowerCase()
  return OAUTH_RETRY_KEYWORDS.some((keyword) => message.includes(keyword))
}

export const getDesktopOAuthAccessToken = async (
  mailboxId: number,
  suppressErrorMessage = true
): Promise<OAuthAccessTokenPayload> => {
  return requestToken(mailboxId, suppressErrorMessage)
}

export const forceRefreshDesktopOAuthAccessToken = async (
  mailboxId: number,
  suppressErrorMessage = true
): Promise<OAuthAccessTokenPayload> => {
  tokens.delete(mailboxId)
  return requestToken(mailboxId, suppressErrorMessage, true)
}

export const runDesktopOAuthMailboxAction = async <T>(
  mailboxId: number,
  executor: (tokenPayload: OAuthAccessTokenPayload) => Promise<T>,
  options: OAuthActionOptions = {}
): Promise<T> => {
  const suppressErrorMessage = options.suppressErrorMessage ?? true

  try {
    const tokenPayload = await getDesktopOAuthAccessToken(mailboxId, suppressErrorMessage)
    return await executor(tokenPayload)
  } catch (error: any) {
    if (!shouldRetryOAuthMailboxAction(error)) {
      throw error
    }

    if (shouldSkipTokenForceRefresh(error)) {
      throw error
    }

    const tokenPayload = await forceRefreshDesktopOAuthAccessToken(mailboxId, suppressErrorMessage)
    return await executor(tokenPayload)
  }
}
