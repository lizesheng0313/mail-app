import smtpAccountsAPI from '@/api/smtpAccounts'
import { isTauri } from '@/services/api'
import { canDesktopSmtpSend, normalizeSmtpEmail } from '@/utils/smtpCapability'

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

  if (!toEmail) {
    throw new Error('还缺收件人邮箱')
  }
  if (!subject) {
    throw new Error('还缺邮件主题')
  }
  if (!content) {
    throw new Error('还缺邮件正文')
  }

  const accountsResponse: any = await smtpAccountsAPI.getAccounts()
  if (accountsResponse.code !== 0) {
    throw new Error(accountsResponse.message || '获取发件账号失败')
  }

  const accounts = Array.isArray(accountsResponse?.data?.accounts) ? accountsResponse.data.accounts : []
  const account = pickDesktopSendAccount(accounts, fromEmail)

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
    attachments: []
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

export const isClientExecutableDesktopAiTool = (tool: any) =>
  String(tool?.name || '').trim() === 'desktop.smtp.send'

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

  throw new Error('当前桌面动作暂不支持本地执行')
}
