<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
        @click.self="closeModal"
      >
        <div
          class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
          @click.stop
        >
          <!-- 头部 -->
          <div class="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">{{ email?.subject || '(无主题)' }}</h2>
            <button
              @click="closeModal"
              class="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- 邮件信息 -->
          <div class="p-4 border-b border-gray-200 space-y-2 text-sm">
            <div class="flex">
              <span class="w-20 text-gray-600 flex-shrink-0">发件人:</span>
              <span class="flex-1 text-gray-900">{{ email?.from_addr }}</span>
            </div>
            <div class="flex">
              <span class="w-20 text-gray-600 flex-shrink-0">收件人:</span>
              <span class="flex-1 text-gray-900">{{ email?.to_addr }}</span>
            </div>
            <div class="flex">
              <span class="w-20 text-gray-600 flex-shrink-0">时间:</span>
              <span class="flex-1 text-gray-900">{{ formatDate(email?.received_at) }}</span>
            </div>
          </div>

          <!-- 邮件内容 -->
          <div class="flex-1 overflow-y-auto p-6">
            <iframe
              v-if="hasHtmlContent"
              :srcdoc="getEmailHtml()"
              sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              class="w-full border-none"
              style="min-height: 400px;"
              @load="handleIframeLoad"
            ></iframe>
            <div v-else-if="hasTextContent" class="whitespace-pre-wrap text-gray-900">{{ textContent }}</div>
            <div v-else class="text-gray-400 text-center py-8">无邮件内容</div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatTimestamp } from '@/utils/timeUtils'
import { isTauri } from '@/services/api'

interface Email {
  id: number
  subject?: string
  sender?: string
  recipient?: string
  received_at?: string | number
  contentHtml?: string
  content?: string
  [key: string]: any
}

interface Props {
  visible: boolean
  email?: Email | null
}

type EmailIframeElement = HTMLIFrameElement & {
  __mailObserver?: MutationObserver
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const closeModal = () => {
  emit('update:visible', false)
}

const formatDate = (dateValue?: string | number) => {
  if (!dateValue) return ''
  
  // 统一转换为毫秒时间戳
  const timestamp = typeof dateValue === 'number' ? dateValue : new Date(dateValue).getTime()
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

const SUPPORTED_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])

const resolveExternalUrl = (rawUrl?: string | null, baseUrl?: string) => {
  if (!rawUrl) return null
  const trimmed = rawUrl.trim()
  if (!trimmed || trimmed.startsWith('#')) return null
  if (/^(javascript|data|about):/i.test(trimmed)) return null

  try {
    const parsed = new URL(trimmed, baseUrl || window.location.href)
    if (!SUPPORTED_EXTERNAL_PROTOCOLS.has(parsed.protocol)) return null
    return parsed.toString()
  } catch {
    return null
  }
}

const openExternalUrl = async (url: string) => {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('open_external_url', { url })
    return
  } catch (e) {
    console.warn('Tauri 命令打开失败，尝试 plugin-shell:', e)
  }

  if (isTauri()) {
    try {
      const { open } = await import('@tauri-apps/plugin-shell')
      await open(url)
      return
    } catch (e) {
      console.warn('plugin-shell 打开失败，尝试浏览器新标签页:', e)
    }
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

const enhanceIframeLinks = (iframeDoc: Document) => {
  const links = iframeDoc.querySelectorAll('a')
  links.forEach((link) => {
    if (!(link instanceof HTMLAnchorElement)) return
    const boundLink = link as HTMLAnchorElement & { __externalLinkBound?: boolean }
    const url = resolveExternalUrl(link.getAttribute('href'), iframeDoc.baseURI)
    if (!url) return

    link.setAttribute('href', url)
    link.setAttribute('target', '_blank')
    link.setAttribute('rel', 'noopener noreferrer')

    if (boundLink.__externalLinkBound) return
    boundLink.__externalLinkBound = true

    const openLink = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
      console.info('[mail-link-open]', url)
      void openExternalUrl(url)
    }

    link.addEventListener('click', openLink, true)
    link.addEventListener('auxclick', openLink, true)
  })
}

const ensureDocumentClickInterceptor = (iframeDoc: Document) => {
  const enhancedDoc = iframeDoc as Document & { __externalClickBound?: boolean }
  if (enhancedDoc.__externalClickBound) return
  enhancedDoc.__externalClickBound = true

  iframeDoc.addEventListener('click', (event) => {
    const targetNode = event.target as Node | null
    const targetElement = targetNode instanceof Element ? targetNode : targetNode?.parentElement
    if (!targetElement) return

    const link = targetElement.closest('a')
    if (!(link instanceof HTMLAnchorElement)) return

    const url = resolveExternalUrl(link.getAttribute('href'), iframeDoc.baseURI)
    if (!url) return

    event.preventDefault()
    event.stopPropagation()
    console.info('[mail-link-open]', url)
    void openExternalUrl(url)
  }, true)
}

const addIframeOpenHint = (embeddedFrame: HTMLIFrameElement, iframeDoc: Document) => {
  if (embeddedFrame.dataset.externalHintBound === '1') return
  embeddedFrame.dataset.externalHintBound = '1'

  const url = resolveExternalUrl(embeddedFrame.getAttribute('src'), iframeDoc.baseURI)
  if (!url) return

  const hint = iframeDoc.createElement('a')
  hint.href = url
  hint.textContent = '嵌入页面可能无法直接操作，点此在系统浏览器打开'
  hint.style.display = 'inline-block'
  hint.style.marginBottom = '8px'
  hint.style.padding = '6px 10px'
  hint.style.borderRadius = '6px'
  hint.style.background = '#e5f3ff'
  hint.style.color = '#1d4ed8'
  hint.style.textDecoration = 'none'
  hint.style.fontSize = '12px'
  hint.style.fontWeight = '600'

  hint.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    void openExternalUrl(url)
  }, true)

  embeddedFrame.insertAdjacentElement('beforebegin', hint)
}

const setupIframeInteractiveElements = (iframeDoc: Document) => {
  ensureDocumentClickInterceptor(iframeDoc)
  enhanceIframeLinks(iframeDoc)

  const embeddedFrames = iframeDoc.querySelectorAll('iframe')
  embeddedFrames.forEach((embeddedFrame) => {
    if (embeddedFrame instanceof HTMLIFrameElement) {
      addIframeOpenHint(embeddedFrame, iframeDoc)
    }
  })
}

const handleIframeLoad = (event: Event) => {
  const iframe = event.target as EmailIframeElement
  try {
    const iframeDoc = iframe.contentWindow?.document
    if (!iframeDoc) return

    setupIframeInteractiveElements(iframeDoc)

    iframe.__mailObserver?.disconnect()
    const observer = new MutationObserver(() => {
      setupIframeInteractiveElements(iframeDoc)
    })

    observer.observe(iframeDoc.documentElement, {
      childList: true,
      subtree: true
    })
    iframe.__mailObserver = observer
  } catch (e) {
    console.warn('无法处理邮件 iframe 点击行为:', e)
  }
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

iframe {
  display: block;
}
</style>
