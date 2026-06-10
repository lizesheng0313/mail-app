export const EMAIL_REACH_BADGE_BASE =
  'inline-flex rounded-full px-3 py-1 text-xs font-medium'

export const TABLE_EMPTY_CELL_CLASS = 'px-6 py-12 text-center text-sm text-slate-500'
export const TABLE_LOADING_CELL_CLASS = 'px-6 py-12 text-center text-sm text-slate-500'

const BADGE_TONES = {
  success: 'bg-emerald-100 text-emerald-700',
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-amber-100 text-amber-700',
  orange: 'bg-orange-100 text-orange-700',
  danger: 'bg-red-100 text-red-700',
  neutral: 'bg-slate-100 text-slate-700'
}

export const buildBadgeClass = (tone = 'neutral') =>
  `${EMAIL_REACH_BADGE_BASE} ${BADGE_TONES[tone] || BADGE_TONES.neutral}`

export const formatNumber = (value) => Number(value || 0).toLocaleString()

export const formatSendErrorMessage = (value) => {
  const message = String(value || '').trim()
  if (!message) return '-'
  const lowered = message.toLowerCase()
  if (lowered.includes('please run connect() first')) {
    return '发信 SMTP 未配置或未连接，请先在后台配置并启用发信账号'
  }
  if (lowered.includes('domain name') && lowered.includes('does not exist')) {
    const matched = message.match(/domain name\s+(.+?)\s+does not exist/i)
    return matched?.[1] ? `收件邮箱域名不存在：${matched[1]}` : '收件邮箱域名不存在'
  }
  return message
}

export const formatDateTime = (value, options = {}) => {
  const { dateOnly = false } = options
  if (!value) return '-'
  const date = new Date(Number(value))
  if (Number.isNaN(date.getTime())) return '-'
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  if (dateOnly) return `${year}-${month}-${day}`
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

export const getAccessStatusMeta = (status) => {
  if (status === 'approved') return { label: '已开通', tone: 'success' }
  if (status === 'trial') return { label: '试用中', tone: 'info' }
  if (status === 'blocked') return { label: '已限制', tone: 'danger' }
  return { label: '待开通', tone: 'warning' }
}

export const hasAccessStatus = (status) => ['approved', 'trial'].includes(status)

export const getTaskStatusMeta = (status) => {
  if (status === 'draft') return { label: '草稿', tone: 'neutral' }
  if (status === 'ready') return { label: '待发送', tone: 'warning' }
  if (status === 'blocked') return { label: '全部拦截', tone: 'danger' }
  if (status === 'scheduled') return { label: '待发送', tone: 'warning' }
  if (status === 'sending') return { label: '发送中', tone: 'info' }
  if (status === 'completed') return { label: '已完成', tone: 'success' }
  if (status === 'partial_failed') return { label: '部分失败', tone: 'orange' }
  if (status === 'failed') return { label: '失败', tone: 'danger' }
  return { label: status || '-', tone: 'neutral' }
}

export const getRecordStatusMeta = (status) => {
  if (status === 'queued') return { label: '待发送', tone: 'warning' }
  if (status === 'sending') return { label: '发送中', tone: 'info' }
  if (status === 'sent') return { label: '已发送', tone: 'success' }
  if (status === 'failed') return { label: '失败', tone: 'danger' }
  if (status === 'blocked') return { label: '已拦截', tone: 'danger' }
  return { label: status || '-', tone: 'neutral' }
}

export const getReplyMatchStatusMeta = (status) => {
  if (status === 'matched') return { label: '已匹配', tone: 'success' }
  if (status === 'pending') return { label: '待处理', tone: 'warning' }
  return { label: status || '-', tone: 'neutral' }
}

export const getActiveStatusMeta = (status) => {
  if (status === 'inactive') return { label: '已取消', tone: 'neutral' }
  return { label: '生效中', tone: 'success' }
}
