<template>
  <div class="flex flex-col h-full email-detail-container">
    <!-- 标题栏 -->
    <div class="border-b border-gray-200 pb-4 mb-4">
      <h2 class="text-base font-semibold text-black">{{ title }}</h2>
    </div>

    <!-- 邮件详情内容 -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="!email" class="flex items-center justify-center h-full text-gray-400">
        <div class="text-center">
          <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
          </svg>
          <p class="text-sm">{{ emptyText }}</p>
        </div>
      </div>

      <div v-else>
        <!-- 邮件头部信息 -->
        <div class="border-b border-gray-200 pb-4 mb-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-3">{{ email.subject || '(无主题)' }}</h3>
          <div class="space-y-2 text-sm">
            <div class="flex">
              <span class="text-gray-500 w-16">发件人：</span>
              <span class="text-gray-900">{{ email.from_addr }}</span>
            </div>
            <div class="flex">
              <span class="text-gray-500 w-16">收件人：</span>
              <span class="text-gray-900">{{ email.to_addr }}</span>
            </div>
            <div class="flex">
              <span class="text-gray-500 w-16">时间：</span>
              <span class="text-gray-900">{{ formatDate(email.received_at) }}</span>
            </div>
          </div>
        </div>

        <!-- 附件列表 -->
        <div v-if="attachments.length > 0" class="mb-4">
          <div class="text-sm text-gray-500 mb-2">附件 ({{ attachments.length }})</div>
          <div class="flex flex-col gap-2">
            <div
              v-for="att in attachments"
              :key="att.id"
              class="attachment-item flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              :class="isExternalEmail ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-pointer'"
              @click="isExternalEmail ? downloadAttachment(att) : showMessage('临时邮箱附件不支持下载', 'warning')"
            >
              <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span class="text-sm text-gray-700 truncate max-w-[200px]">{{ att.filename }}</span>
              <span class="text-xs text-gray-400 flex-shrink-0">{{ formatFileSize(att.size_bytes) }}</span>
              <!-- 下载图标：仅外部邮箱 -->
              <svg v-if="isExternalEmail" class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
          </div>
        </div>

        <!-- 邮件内容 -->
        <div class="email-content" style="position: relative;">
          <!-- 放大按钮 -->
          <button
            v-if="email"
            @click="$emit('expand', email)"
            class="expand-button"
            title="点击放大查看完整邮件内容"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            <span class="text-xs font-medium">放大</span>
          </button>

          <!-- HTML内容 -->
          <iframe
            v-if="hasHtmlContent"
            :srcdoc="getEmailHtml()"
            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            class="w-full border-none"
            @load="adjustIframeHeight"
            ref="emailIframe"
          ></iframe>
          <!-- 纯文本内容 -->
          <div v-else-if="hasTextContent" class="whitespace-pre-wrap text-gray-700">
            {{ textContent }}
          </div>
          <div v-else class="text-gray-400 text-center py-8">
            邮件内容为空
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { formatTimestamp } from '@/utils/timeUtils'
import { isTauri } from '@/services/api'
import { showMessage } from '@/utils/message'
import api from '@/services/api'

interface Email {
  id: number
  subject: string
  sender: string
  recipient: string
  received_at: number
  content_html?: string
  content_text?: string
  [key: string]: any
}

interface Props {
  title?: string
  email: Email | null
  emptyText?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '邮件详情',
  email: null,
  emptyText: '请选择一封邮件查看详情'
})

defineEmits<{
  expand: [email: Email]
}>()

const isFullscreen = ref(false)

const attachments = computed(() => {
  return props.email?.attachments || []
})

const isExternalEmail = computed(() => {
  return props.email?.mailbox_type === 'external'
})

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

const downloadAttachment = async (att: { id: number; filename: string }) => {
  if (!props.email) return

  // 桌面端：优先尝试本地文件
  if (isTauri() && props.email.message_id) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('open_local_attachment', {
        messageId: props.email.message_id,
        filename: att.filename
      })
      return
    } catch {
      // 本地没有，走 API 下载
    }
  }

  // 通过 API 代理下载
  try {
    showMessage('正在下载附件...', 'info')
    const response = await api.get(`/unified-emails/attachments/${att.id}/download`, {
      responseType: 'blob'
    })

    // 创建下载链接
    const blob = new Blob([response as any])
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = att.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    showMessage('下载完成', 'success')
  } catch (e: any) {
    console.error('下载附件失败:', e)
    const msg = e.response?.data?.detail || e.response?.data?.message || '下载失败'
    showMessage(msg, 'error')
  }
}

const formatDate = (timestamp: number) => {
  return formatTimestamp(timestamp, 'datetime')
}

const textContent = computed(() => {
  if (!props.email) return ''
  return (
    props.email.content ||
    props.email.content_text ||
    props.email.contentHtml ||
    props.email.content_html ||
    ''
  ).trim()
})

// 检查是否有HTML内容（判断content字段是否包含HTML标签）
const hasHtmlContent = computed(() => {
  if (!props.email) return false
  const html = props.email.contentHtml || props.email.content_html || props.email.content || ''
  const trimmed = html.trim()
  // 检查是否包含HTML标签
  return /<[^>]+>/.test(trimmed)
})

// 检查是否有纯文本内容（不包含HTML标签）
const hasTextContent = computed(() => {
  const trimmed = textContent.value
  // 如果有内容但不包含HTML标签，则认为是纯文本
  return trimmed.length > 0 && !/<[^>]+>/.test(trimmed)
})

const getEmailHtml = () => {
  // 优先使用contentHtml，如果为空则尝试content（某些邮件HTML在content字段）
  let html = props.email?.contentHtml || props.email?.content_html || props.email?.content || props.email?.content_text || ''
  if (!html) return ''

  html = html.trim()

  // 如果HTML已经有完整的文档结构（以<!doctype或<html开头），直接返回
  if (/^<!doctype/i.test(html) || /^<html/i.test(html)) {
    return html
  }

  // 否则包装成完整文档
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { margin: 0; padding: 20px; font-family: Arial, "Microsoft YaHei", sans-serif; }
  table { max-width: 100%; }
  img { max-width: 100%; height: auto; }
</style>
</head>
<body>
${html}
</body>
</html>`
}

const adjustIframeHeight = (event: Event) => {
  const iframe = event.target as HTMLIFrameElement
  try {
    const iframeDoc = iframe.contentWindow?.document
    if (!iframeDoc) return

    // 给所有链接添加 target="_blank"，让它们在新标签页打开
    const links = iframeDoc.querySelectorAll('a')
    links.forEach((link) => {
      link.setAttribute('target', '_blank')
      link.setAttribute('rel', 'noopener noreferrer')
    })

    // 自动调整iframe高度以适应内容
    const resizeIframe = () => {
      try {
        const body = iframeDoc.body
        const html = iframeDoc.documentElement

        if (body && html) {
          const height = Math.max(
            body.scrollHeight,
            body.offsetHeight,
            html.clientHeight,
            html.scrollHeight,
            html.offsetHeight
          )

          // 设置实际内容高度
          iframe.style.height = (height + 20) + 'px'
        }
      } catch (e) {
        console.warn('无法调整iframe高度:', e)
      }
    }

    // 立即调整一次
    resizeIframe()

    // 等待图片加载后再次调整
    setTimeout(resizeIframe, 100)
    setTimeout(resizeIframe, 500)

    // 监听iframe内容变化
    const images = iframeDoc.querySelectorAll('img')
    images.forEach((img) => {
      img.onload = resizeIframe
    })
  } catch (e) {
    // 跨域时无法访问iframe内容
    console.warn('无法访问iframe内容:', e)
  }
}
</script>


<style scoped>
.email-content {
  font-size: 14px;
  line-height: 1.6;
  position: relative;
}

iframe {
  display: block;
}

.email-detail-container.fullscreen-mode {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: white;
  padding: 2rem;
}

/* 放大按钮 - 和线上一致 */
.expand-button {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 10;
  padding: 0.5rem 0.75rem;
  @apply bg-primary-600 hover:bg-primary-700;
  color: white;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.expand-button:hover {
  transform: scale(1.05);
}
</style>
