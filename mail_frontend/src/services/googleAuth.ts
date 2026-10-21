import authAPI from '@/api/auth'

const PREFIX = 'google-oauth:'
const TTL_MS = 10 * 60 * 1000

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

// 秘密留在发起授权的浏览器/桌面 WebView 中，回调 URL 只包含它的摘要。
export const beginGoogleAuth = async (params: { is_bind?: boolean; is_desktop?: boolean } = {}) => {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)))
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))))
  for (const key of Object.keys(sessionStorage)) {
    if (!key.startsWith(PREFIX)) continue
    try {
      if (JSON.parse(sessionStorage.getItem(key) || '{}').createdAt > Date.now() - TTL_MS) continue
    } catch { /* 删除无效的旧流程 */ }
    sessionStorage.removeItem(key)
  }
  const result = await authAPI.getGoogleLoginUrl({ ...params, client_challenge: challenge })
  if (result.code === 0 && result.data?.state) {
    sessionStorage.setItem(PREFIX + result.data.state, JSON.stringify({ verifier, createdAt: Date.now() }))
  }
  return result
}

export const googleAuthProof = (ticket: unknown, flow: unknown) => {
  if (typeof ticket !== 'string' || typeof flow !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(ticket)
      || !/^[A-Za-z0-9_-]{43}$/.test(flow)) throw new Error('Invalid Google authorization')
  let stored
  try { stored = JSON.parse(sessionStorage.getItem(PREFIX + flow) || 'null') } catch { /* 校验失败 */ }
  if (!stored || typeof stored.verifier !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(stored.verifier)
      || !(stored.createdAt > Date.now() - TTL_MS)) throw new Error('Google authorization expired or belongs to another client')
  return { ticket, client_verifier: stored.verifier }
}

export const clearGoogleAuth = (flow: string) => sessionStorage.removeItem(PREFIX + flow)
