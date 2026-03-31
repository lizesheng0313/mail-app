<template>
  <div class="flex flex-col h-full email-detail-container">
    <!-- 标题栏 -->
    <div class="mb-4 flex items-center justify-between border-b border-gray-200 pb-4">
      <h2 class="text-base font-semibold text-black">{{ title }}</h2>
      <HoverTooltip v-if="email" :text="t('emailDetail.fullscreen')">
        <button
          @click="$emit('expand', email)"
          class="expand-button"
          :aria-label="t('emailDetail.fullscreen')"
        >
          <ArrowsPointingOutIcon class="h-4 w-4" />
        </button>
      </HoverTooltip>
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
          <h3 class="text-lg font-semibold text-gray-900 mb-3">{{ email.subject || t('emailDetail.noSubject') }}</h3>
          <div class="space-y-2 text-sm">
            <div class="flex">
              <span class="text-gray-500 w-16">{{ t('common.sender') }}：</span>
              <span class="text-gray-900">{{ email.from_addr }}</span>
            </div>
            <div class="flex">
              <span class="text-gray-500 w-16">{{ t('common.recipient') }}：</span>
              <span class="text-gray-900">{{ email.to_addr }}</span>
            </div>
            <div class="flex">
              <span class="text-gray-500 w-16">{{ t('common.time') }}：</span>
              <span class="text-gray-900">{{ formatDate(email.received_at) }}</span>
            </div>
          </div>
        </div>

        <!-- 附件列表 -->
        <div v-if="attachments.length > 0" class="mb-4">
          <div class="text-sm text-gray-500 mb-2">{{ t('emailDetail.attachmentsCount', { count: attachments.length }) }}</div>
          <div class="flex flex-col gap-2">
            <div
              v-for="att in attachments"
              :key="att.id"
              class="attachment-item flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              :class="canDownloadExternalAttachment ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-default'"
              @click="handleAttachmentClick(att)"
            >
              <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span class="text-sm text-gray-700 truncate max-w-[200px]">{{ att.filename }}</span>
              <span class="text-xs text-gray-400 flex-shrink-0">{{ formatFileSize(att.size_bytes) }}</span>
              <!-- 下载图标：仅外部邮箱 -->
              <svg v-if="canDownloadExternalAttachment" class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
          </div>
        </div>

        <!-- 邮件内容 -->
        <div class="email-content">
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
            {{ t('emailDetail.emptyContent') }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowsPointingOutIcon } from '@heroicons/vue/24/solid'
import { useI18n } from 'vue-i18n'
import { formatTimestamp } from '@/utils/timeUtils'
import { isTauri } from '@/services/api'
import { batchLoginAPI } from '@/api/batchLogin'
import { runDesktopOAuthMailboxAction } from '@/services/desktopOAuthMailbox'
import { showMessage } from '@/utils/message'
import HoverTooltip from '@/components/HoverTooltip/index.vue'

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

type EmailIframeElement = HTMLIFrameElement & {
  __mailObserver?: MutationObserver
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  email: null,
  emptyText: ''
})
const { t } = useI18n()

defineEmits<{
  expand: [email: Email]
}>()

const title = computed(() => props.title || t('emailDetail.title'))
const emptyText = computed(() => props.emptyText || t('emailDetail.emptyText'))

const attachments = computed(() => {
  return props.email?.attachments || []
})

const isExternalEmail = computed(() => {
  return props.email?.mailbox_type === 'external'
})

const canDownloadExternalAttachment = computed(() => {
  return isExternalEmail.value && isTauri()
})

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

const downloadAttachment = async (att: { id: number; filename: string }) => {
  if (!props.email) return
  const currentEmail = props.email

  // 桌面端：本地 IMAP/POP3 实时取附件
  if (isTauri() && currentEmail.message_id && currentEmail.mailbox_type === 'external') {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const { save } = await import('@tauri-apps/plugin-dialog')

      // 弹保存对话框
      const savePath = await save({ defaultPath: att.filename })
      if (!savePath) return

      showMessage(t('emailDetail.downloadingAttachment'), 'info')

      // 获取邮箱连接信息
      const mailboxId = props.email.mailbox_id
      const accountsRes = await batchLoginAPI.getAllAccounts(100, {
        suppressErrorMessage: true
      })
      const accountsData = accountsRes?.data
      const accounts = Array.isArray(accountsData)
        ? accountsData
        : (accountsData?.accounts || accountsData?.mailboxes || [])
      const mailbox = accounts.find((a: any) => a.id === mailboxId)

      if (!mailbox) {
        showMessage(t('emailDetail.mailboxConfigMissing'), 'error')
        return
      }

      const isOAuth2 = mailbox.auth_type === 'oauth2'
      let host = mailbox.imap_host || ''
      let port = mailbox.imap_port || 993
      let protocol = mailbox.protocol || 'imap'

      if (isOAuth2) {
        await runDesktopOAuthMailboxAction(mailboxId, async (tokenPayload) => {
          host = tokenPayload.imap_host
          port = tokenPayload.imap_port
          protocol = 'imap'

          await invoke('download_attachment', {
            email: mailbox.email,
            password: mailbox.password || '',
            protocol,
            host,
            port,
            messageId: currentEmail.message_id,
            filename: att.filename,
            savePath,
            authType: 'oauth2',
            accessToken: tokenPayload.access_token,
            subject: currentEmail.subject || '',
            fromAddr: currentEmail.from_addr || '',
            toAddr: currentEmail.to_addr || '',
            emailDateMs: Number(currentEmail.email_date || currentEmail.received_at || 0),
          })
        })

        showMessage(t('emailDetail.attachmentSaved', { path: savePath }), 'success')
        return
      } else if (protocol === 'pop3') {
        host = mailbox.pop3_host || ''
        port = mailbox.pop3_port || 995
      }

      await invoke('download_attachment', {
        email: mailbox.email,
        password: mailbox.password || '',
        protocol,
        host,
        port,
        messageId: currentEmail.message_id,
        filename: att.filename,
        savePath,
        authType: isOAuth2 ? 'oauth2' : 'password',
        accessToken: undefined,
        subject: currentEmail.subject || '',
        fromAddr: currentEmail.from_addr || '',
        toAddr: currentEmail.to_addr || '',
        emailDateMs: Number(currentEmail.email_date || currentEmail.received_at || 0),
      })

      showMessage(t('emailDetail.attachmentSaved', { path: savePath }), 'success')
      return
    } catch (e: any) {
      console.error('桌面端下载附件失败:', e)
      showMessage(typeof e === 'string' ? e : (e?.message || t('emailDetail.downloadFailed')), 'error')
      return
    }
  }
}

const handleAttachmentClick = async (att: { id: number; filename: string }) => {
  if (!isExternalEmail.value) {
    showMessage(t('emailDetail.tempAttachmentUnsupported'), 'warning')
    return
  }

  if (!isTauri()) {
    showMessage(t('emailDetail.desktopDownloadOnly'), 'warning')
    return
  }

  await downloadAttachment(att)
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
  hint.textContent = t('emailDetail.openInBrowserHint')
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

const adjustIframeHeight = (event: Event) => {
  const iframe = event.target as EmailIframeElement
  try {
    const iframeDoc = iframe.contentWindow?.document
    if (!iframeDoc) return

    setupIframeInteractiveElements(iframeDoc)

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

    iframe.__mailObserver?.disconnect()
    const observer = new MutationObserver(() => {
      setupIframeInteractiveElements(iframeDoc)
      resizeIframe()
    })

    observer.observe(iframeDoc.documentElement, {
      childList: true,
      subtree: true
    })
    iframe.__mailObserver = observer
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

.expand-button {
  @apply inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent text-gray-600 hover:bg-primary-50 hover:text-primary-700;
  transition: all 0.2s;
  flex-shrink: 0;
}

.expand-button:hover {
  transform: none;
}
</style>
