<template>
  <div
    ref="hostRef"
    class="email-html-renderer"
    :style="{ minHeight }"
  ></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { isTauri } from '@/services/api'
import { resolveExternalUrl, sanitizeEmailHtml } from '@/utils/emailHtml'

interface Props {
  html?: string
  minHeight?: string
}

const props = withDefaults(defineProps<Props>(), {
  html: '',
  minHeight: '0px'
})

const hostRef = ref<HTMLDivElement | null>(null)
let shadowRootRef: ShadowRoot | null = null

const baseStyles = `
  :host {
    display: block;
    color: #374151;
    font-size: 14px;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  a {
    color: #2563eb;
    text-decoration: underline;
    cursor: pointer;
  }

  img, video {
    max-width: 100%;
    height: auto;
  }

  table {
    max-width: 100%;
  }

  pre {
    white-space: pre-wrap;
    word-break: break-word;
  }

  body {
    margin: 0;
    padding: 0;
    background: transparent !important;
    color: inherit;
    font-family: Arial, "Microsoft YaHei", sans-serif;
  }

  .email-embedded-frame-card {
    border: 1px solid #d1d5db;
    border-radius: 12px;
    padding: 12px 14px;
    background: #f8fafc;
    color: #374151;
  }

  .email-embedded-frame-title {
    margin-bottom: 6px;
    font-size: 13px;
    color: #6b7280;
  }
`

const renderHtml = () => {
  if (!shadowRootRef) return

  const sanitizedHtml = sanitizeEmailHtml(props.html)
  shadowRootRef.innerHTML = `
    <style>${baseStyles}</style>
    ${sanitizedHtml}
  `
}

const openExternalUrl = async (url: string) => {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('open_external_url', { url })
    return
  } catch {}

  try {
    const { open } = await import('@tauri-apps/plugin-shell')
    await open(url)
  } catch {}
}

const handleShadowClick = (event: Event) => {
  const path = event.composedPath()
  const anchor = path.find((node) => node instanceof HTMLAnchorElement) as HTMLAnchorElement | undefined
  if (!anchor) return

  const resolvedUrl = resolveExternalUrl(anchor.getAttribute('href'), window.location.href)
  if (!resolvedUrl) return

  if (isTauri()) {
    event.preventDefault()
    void openExternalUrl(resolvedUrl)
    return
  }

  anchor.setAttribute('target', '_blank')
  anchor.setAttribute('rel', 'noopener noreferrer')
}

onMounted(() => {
  if (!hostRef.value) return
  shadowRootRef = hostRef.value.attachShadow({ mode: 'open' })
  shadowRootRef.addEventListener('click', handleShadowClick)
  renderHtml()
})

watch(() => props.html, () => {
  renderHtml()
})

onBeforeUnmount(() => {
  shadowRootRef?.removeEventListener('click', handleShadowClick)
})
</script>

<style scoped>
.email-html-renderer {
  display: block;
  width: 100%;
}
</style>
