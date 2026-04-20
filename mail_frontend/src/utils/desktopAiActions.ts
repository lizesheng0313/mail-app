import batchLoginAPI from '@/api/batchLogin'
import mailboxProxyApi from '@/api/mailboxProxy'
import smtpAccountsAPI from '@/api/smtpAccounts'
import { getServerUrl, isTauri } from '@/services/api'
import { canDesktopSmtpSend, normalizeSmtpEmail } from '@/utils/smtpCapability'

const DESKTOP_AI_TOOL_NAMES = new Set([
  'desktop.smtp.send',
  'desktop.external_mailbox.verify',
  'desktop.external_mailbox.fetch'
])

const getTauriInvoke = async () => {
  if (!isTauri()) return null
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke
  } catch {
    return null
  }
}

const readString = (value: unknown) => String(value || '').trim()

const readNumber = (value: unknown) => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0
}

const normalizeMailboxEmail = (value: unknown) => readString(value).toLowerCase()

const pickDesktopSendAccount = (accounts: any[], fromEmail?: string) => {
  const sendableAccounts = (accounts || []).filter((account) => canDesktopSmtpSend(account))
  if (!sendableAccounts.length) {
    throw new Error('当前没有可发件邮箱，请先在桌面端配置发件账号')
  }

  const normalizedFromEmail = normalizeSmtpEmail(fromEmail)
  if (normalizedFromEmail) {
    const matched = sendableAccounts.find(
      (account) => normalizeSmtpEmail(account?.email) === normalizedFromEmail
    )
    if (!matched) {
      throw new Error(`没有找到可用发件邮箱 ${fromEmail}`)
    }
    return matched
  }

  if (sendableAccounts.length === 1) {
    return sendableAccounts[0]
  }

  throw new Error('当前有多个可发件邮箱，请直接写明用哪个邮箱发送')
}

const loadExternalMailboxAccount = async (mailboxId?: number, email?: string) => {
  const normalizedEmail = normalizeMailboxEmail(email)
  const response: any = await batchLoginAPI.getAllAccounts(100, {
    suppressErrorMessage: true,
    ...(normalizedEmail ? { search: normalizedEmail } : {})
  })
  if (response.code !== 0) {
    throw new Error(response.message || '获取第三方邮箱列表失败')
  }

  const accounts = Array.isArray(response?.data?.accounts) ? response.data.accounts : []
  if (mailboxId > 0) {
    const matchedById = accounts.find((item: any) => Number(item?.id || 0) === mailboxId)
    if (matchedById) return matchedById
  }
  if (normalizedEmail) {
    const matchedByEmail = accounts.find(
      (item: any) => normalizeMailboxEmail(item?.email) === normalizedEmail
    )
    if (matchedByEmail) return matchedByEmail
  }
  throw new Error('没有找到对应的第三方邮箱')
}

const loadMailboxRuntimeProxy = async (mailboxId?: number) => {
  if (!mailboxId) return null
  try {
    const response: any = await mailboxProxyApi.getRuntimeProxy(mailboxId)
    if (response.code !== 0) return null
    return response?.data?.runtime_proxy || null
  } catch {
    return null
  }
}

const executeDesktopSmtpSend = async (argumentsValue: Record<string, any> = {}) => {
  const tauriInvoke = await getTauriInvoke()
  if (!tauriInvoke) {
    throw new Error('发邮件需要在桌面端客户端里操作')
  }

  const toEmail = readString(argumentsValue.to_email || argumentsValue.to)
  const subject = readString(argumentsValue.subject)
  const content = readString(argumentsValue.content || argumentsValue.body || argumentsValue.text)
  const fromEmail = readString(argumentsValue.from_email || argumentsValue.from)
  const cc = readString(argumentsValue.cc)
  const bcc = readString(argumentsValue.bcc)

  if (!toEmail) throw new Error('还缺收件人邮箱')
  if (!subject) throw new Error('还缺邮件主题')
  if (!content) throw new Error('还缺邮件正文')

  const accountsResponse: any = await smtpAccountsAPI.getAccounts()
  if (accountsResponse.code !== 0) {
    throw new Error(accountsResponse.message || '获取发件账号失败')
  }

  const accounts = Array.isArray(accountsResponse?.data?.accounts) ? accountsResponse.data.accounts : []
  const account = pickDesktopSendAccount(accounts, fromEmail)
  const runtimeProxy = await mailboxProxyApi.previewRuntimeProxy({ email: account.email })

  await tauriInvoke('send_smtp_email', {
    fromEmail: account.email,
    password: account.smtp_password || account.password || '',
    smtpHost: account.smtp_host || '',
    smtpPort: Number(account.smtp_port || 465),
    toEmail,
    subject,
    content,
    cc: cc || null,
    bcc: bcc || null,
    attachments: [],
    proxy: runtimeProxy?.data?.runtime_proxy || null
  })

  let recordSynced = true
  try {
    const saveResponse: any = await smtpAccountsAPI.saveSentEmails({
      records: [{
        smtp_account_id: account.id,
        external_mailbox_id: account.external_mailbox_id,
        from_email: account.email,
        to_email: toEmail,
        subject,
        content
      }]
    })
    if (saveResponse.code !== 0) {
      recordSynced = false
    }
  } catch {
    recordSynced = false
  }

  return {
    from_email: account.email,
    to_email: toEmail,
    subject,
    content,
    cc: cc || '',
    bcc: bcc || '',
    smtp_account_id: account.id,
    external_mailbox_id: account.external_mailbox_id,
    record_synced: recordSynced
  }
}

const executeDesktopExternalMailboxVerify = async (argumentsValue: Record<string, any> = {}) => {
  const tauriInvoke = await getTauriInvoke()
  if (!tauriInvoke) {
    throw new Error('第三方邮箱验证需要在桌面端客户端里操作')
  }

  const email = readString(argumentsValue.email)
  const password = readString(argumentsValue.password)
  const refreshToken = readString(argumentsValue.oauth_refresh_token)

  if (!email) throw new Error('还缺邮箱地址')
  if (!password && refreshToken) {
    throw new Error('当前桌面端本地验号暂只支持账号密码邮箱，令牌邮箱请走导入链路')
  }
  if (!password) throw new Error('还缺邮箱密码')

  const protocol = readString(argumentsValue.protocol || 'auto').toLowerCase() || 'auto'
  const host = readString(argumentsValue.host)
  const port = readNumber(argumentsValue.port)
  const verifySmtp = argumentsValue.verify_smtp !== false

  const result: any = await tauriInvoke('add_external_mailbox', {
    email,
    password,
    protocol,
    host: host || null,
    port: port || null,
    verifySmtp
  })

  if (!result?.success) {
    throw new Error(result?.message || '本地验证失败')
  }

  return {
    email,
    protocol: readString(result?.protocol || protocol || 'auto'),
    host: readString(result?.host || host),
    port: readNumber(result?.port || port),
    smtp_verified: Boolean(result?.smtp_verified),
    smtp_host: readString(result?.smtp_host),
    smtp_port: readNumber(result?.smtp_port)
  }
}

const executeDesktopExternalMailboxFetch = async (argumentsValue: Record<string, any> = {}) => {
  const tauriInvoke = await getTauriInvoke()
  if (!tauriInvoke) {
    throw new Error('第三方邮箱本地收取需要在桌面端客户端里操作')
  }

  const mailboxId = readNumber(argumentsValue.mailbox_id)
  const requestedEmail = readString(argumentsValue.email)
  if (!mailboxId && !requestedEmail) {
    throw new Error('还缺要收取的第三方邮箱')
  }

  const account = await loadExternalMailboxAccount(mailboxId, requestedEmail)
  const resolvedMailboxId = readNumber(account?.id || mailboxId)
  const email = readString(argumentsValue.email || account?.email)
  const authType = readString(argumentsValue.auth_type || account?.auth_type || 'password').toLowerCase()
  const token = readString(localStorage.getItem('token'))
  const serverUrl = readString(argumentsValue.server_url || getServerUrl())

  if (!resolvedMailboxId) throw new Error('没有找到第三方邮箱 ID')
  if (!email) throw new Error('没有找到第三方邮箱地址')
  if (!token) throw new Error('登录信息已失效，请重新登录后再试')
  if (!serverUrl) throw new Error('没有找到服务端地址')

  let result: any
  const runtimeProxy = await loadMailboxRuntimeProxy(resolvedMailboxId)
  if (authType === 'oauth2') {
    const accessTokenResponse: any = await batchLoginAPI.getOAuth2AccessToken(resolvedMailboxId, {
      suppressErrorMessage: true
    })
    if (accessTokenResponse.code !== 0) {
      throw new Error(accessTokenResponse.message || '获取 OAuth2 token 失败')
    }
    const tokenPayload = accessTokenResponse?.data || {}

    result = await tauriInvoke('fetch_emails', {
      mailboxId: resolvedMailboxId,
      email,
      password: '',
      protocol: 'imap',
      host: readString(argumentsValue.host || tokenPayload.imap_host),
      port: readNumber(argumentsValue.port || tokenPayload.imap_port) || null,
      token,
      serverUrl,
      authType: 'oauth2',
      accessToken: readString(argumentsValue.access_token || tokenPayload.access_token),
      proxy: runtimeProxy
    })
  } else {
    const protocol = readString(argumentsValue.protocol || account?.protocol || 'auto').toLowerCase() || 'auto'
    const password = readString(argumentsValue.password || account?.password)
    const host = readString(
      argumentsValue.host ||
      (protocol === 'pop3' ? account?.pop3_host : account?.imap_host)
    )
    const port = readNumber(
      argumentsValue.port ||
      (protocol === 'pop3' ? account?.pop3_port : account?.imap_port)
    )

    if (!password) {
      throw new Error('这条第三方邮箱没有可用密码，无法本地收取')
    }

    result = await tauriInvoke('fetch_emails', {
      mailboxId: resolvedMailboxId,
      email,
      password,
      protocol,
      host: host || null,
      port: port || null,
      token,
      serverUrl,
      authType: 'password',
      accessToken: null,
      proxy: runtimeProxy
    })
  }

  if (result?.success) {
    try {
      await batchLoginAPI.updateMailboxStatus(resolvedMailboxId, 'active')
    } catch {}
  }

  return {
    mailbox_id: resolvedMailboxId,
    email,
    count: readNumber(result?.count),
    message: readString(result?.message)
  }
}

export const isClientExecutableDesktopAiTool = (tool: any) =>
  DESKTOP_AI_TOOL_NAMES.has(String(tool?.name || '').trim())

export const executeDesktopAiTool = async (tool: any) => {
  const toolName = String(tool?.name || '').trim()
  const argumentsValue = tool?.arguments && typeof tool.arguments === 'object' ? tool.arguments : {}

  if (toolName === 'desktop.smtp.send') {
    const result = await executeDesktopSmtpSend(argumentsValue)
    return {
      name: toolName,
      arguments: argumentsValue,
      result,
      needs_confirmation: false,
      reply: result.record_synced
        ? `邮件已经发出去了，发件人是 ${result.from_email}。`
        : `邮件已经发出去了，发件人是 ${result.from_email}。发送记录同步失败。`
    }
  }

  if (toolName === 'desktop.external_mailbox.verify') {
    const result = await executeDesktopExternalMailboxVerify(argumentsValue)
    return {
      name: toolName,
      arguments: argumentsValue,
      result,
      needs_confirmation: false,
      reply: result.smtp_verified
        ? `${result.email} 已验证成功，收信协议是 ${String(result.protocol || '').toUpperCase()}，发信也已识别。`
        : `${result.email} 已验证成功，收信协议是 ${String(result.protocol || '').toUpperCase()}。`
    }
  }

  if (toolName === 'desktop.external_mailbox.fetch') {
    const result = await executeDesktopExternalMailboxFetch(argumentsValue)
    return {
      name: toolName,
      arguments: argumentsValue,
      result,
      needs_confirmation: false,
      reply: `${result.email} 已完成本地收取，新增 ${result.count} 封邮件。`
    }
  }

  throw new Error('当前桌面动作暂不支持本地执行')
}
