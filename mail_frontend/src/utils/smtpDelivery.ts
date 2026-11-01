export const assertSmtpSubmission = (result: any) => {
  const code = Number(result?.response_code)
  if (result?.success === false || (result?.response_code != null && (!Number.isFinite(code) || code < 200 || code >= 300))) {
    throw new Error(result?.response_message || '发件服务器未接受邮件')
  }
}

export const sentStatusLabel = (record: { status?: string; smtp_response_code?: number | null }) => {
  if (record.status === 'failed') return '发送失败'
  if (record.status === 'bounced') return '已退信'
  return '已发送'
}

export const sentStatusClass = (status?: string) => {
  if (status === 'failed' || status === 'bounced') return 'bg-rose-50 text-rose-700'
  return 'bg-emerald-50 text-emerald-700'
}
