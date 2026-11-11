type TimedMessage = { created_at_ms?: number }

const MESSAGE_GROUP_GAP_MS = 5 * 60 * 1000

const isSameDay = (first: number, second: number) => {
  const a = new Date(first)
  const b = new Date(second)
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

export function buildMessageTimeline<T extends TimedMessage>(
  messages: readonly T[],
  senderKey: (message: T) => string | number,
) {
  return messages.map((message, index) => {
    const previous = messages[index - 1]
    const timestamp = Number(message.created_at_ms)
    const previousTimestamp = Number(previous?.created_at_ms)
    const validTime = Number.isFinite(timestamp) && timestamp > 0
    const validPreviousTime = Number.isFinite(previousTimestamp) && previousTimestamp > 0
    const gap = timestamp - previousTimestamp
    const sameSession = validTime && validPreviousTime
      && isSameDay(timestamp, previousTimestamp)
      && gap >= 0 && gap < MESSAGE_GROUP_GAP_MS

    return {
      message,
      showTimeSeparator: validTime && !sameSession,
      isContinuation: Boolean(previous && sameSession && senderKey(previous) === senderKey(message)),
    }
  })
}

export function formatMessageTime(timestamp: number) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  if (isSameDay(timestamp, now.getTime())) return `今天 ${time}`

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (isSameDay(timestamp, yesterday.getTime())) return `昨天 ${time}`

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day} ${time}`
}
