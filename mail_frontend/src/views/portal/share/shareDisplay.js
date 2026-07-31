export const formatShareDate = (dateValue, locale) => {
  if (!dateValue) return ''

  const date = typeof dateValue === 'number' ? new Date(dateValue) : new Date(dateValue)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleDateString(locale || undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

export const formatShareCountdown = ({ expireAt, now }) => {
  if (!expireAt || !Number.isFinite(Number(now))) return ''

  const expireAtMs = typeof expireAt === 'number' ? expireAt : new Date(expireAt).getTime()
  if (!Number.isFinite(expireAtMs)) return ''

  const remainingSeconds = Math.max(0, Math.ceil((expireAtMs - Number(now)) / 1000))
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export const resolveShareValidity = ({
  expireAt,
  expireMode,
  locale,
  expireMinutes,
  expireDays,
  minuteUnit = '分钟',
  dayUnit = '天',
  permanentValue = '永久',
  now,
  validityText
}) => {
  let value = ''

  if (expireMode === 'minutes' && Number(expireMinutes) > 0) {
    value =
      expireAt && now !== undefined && now !== null
        ? formatShareCountdown({ expireAt, now }) || `${Number(expireMinutes)}${minuteUnit}`
        : `${Number(expireMinutes)}${minuteUnit}`
  } else if (expireMode === 'days' && Number(expireDays) > 0) {
    value = `${Number(expireDays)}${dayUnit}`
  } else if (expireMode === 'permanent' || !expireAt) {
    value = permanentValue
  } else {
    value = formatShareDate(expireAt, locale)
  }

  return validityText(value)
}
