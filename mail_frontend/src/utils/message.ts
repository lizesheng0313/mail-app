/**
 * 全局消息提示工具
 */

let messageContainer: HTMLElement | null = null
let messageTimeout: number | null = null

/**
 * 显示消息提示
 * @param msg 消息内容
 * @param type 消息类型
 * @param duration 显示时长（毫秒），默认success为5秒，error为3秒
 */
export const showMessage = (
  msg: string,
  type: 'success' | 'error' | 'info' | 'warning' | 'primary' = 'success',
  duration?: number
) => {
  // 清除之前的消息
  if (messageContainer) {
    document.body.removeChild(messageContainer)
    messageContainer = null
  }

  if (messageTimeout) {
    clearTimeout(messageTimeout)
    messageTimeout = null
  }

  // 创建消息容器
  messageContainer = document.createElement('div')
  const colorClass =
    type === 'success'
      ? 'border-green-200 bg-green-50'
      : type === 'error'
        ? 'border-red-200 bg-red-50'
        : type === 'warning'
          ? 'border-yellow-200 bg-yellow-50'
          : type === 'primary'
            ? 'border-primary-200 bg-primary-50'
            : 'border-blue-200 bg-blue-50'
  messageContainer.className = `fixed bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 z-[9999] pointer-events-none ${colorClass}`
  messageContainer.style.top = '24px'
  messageContainer.style.left = '50%'
  messageContainer.style.transform = 'translateX(-50%)'
  messageContainer.style.width = 'max-content'
  messageContainer.style.maxWidth = 'min(32rem, calc(100vw - 32px))'

  // 创建消息内容
  const messageContent = document.createElement('div')
  messageContent.className = 'flex items-center justify-center'

  // 创建图标
  const icon = document.createElement('div')
  const iconBg =
    type === 'success'
      ? 'bg-green-500'
      : type === 'error'
        ? 'bg-red-500'
        : type === 'warning'
          ? 'bg-yellow-500'
          : type === 'primary'
            ? 'bg-primary-600'
            : 'bg-blue-500'
  const iconText =
    type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '!' : 'i'
  icon.className = `inline-flex items-center justify-center w-5 h-5 mr-2 rounded-full text-white text-xs font-bold ${iconBg}`
  icon.textContent = iconText

  // 创建文本
  const text = document.createElement('p')
  const textColor =
    type === 'success'
      ? 'text-green-800'
      : type === 'error'
        ? 'text-red-800'
        : type === 'warning'
          ? 'text-yellow-800'
          : type === 'primary'
            ? 'text-primary-700'
            : 'text-blue-800'
  text.className = `text-sm text-center ${textColor}`
  text.textContent = msg

  // 组装消息
  messageContent.appendChild(icon)
  messageContent.appendChild(text)
  messageContainer.appendChild(messageContent)

  // 添加到页面
  document.body.appendChild(messageContainer)

  // duration=0 表示常驻，直到下一条消息替换
  if (duration === 0) {
    return
  }

  // 设置自动消失（默认success为5秒，error为3秒）
  const defaultDuration = type === 'success' ? 5000 : 3000
  messageTimeout = setTimeout(() => {
    if (messageContainer) {
      document.body.removeChild(messageContainer)
      messageContainer = null
    }
    messageTimeout = null
  }, duration || defaultDuration)
}
