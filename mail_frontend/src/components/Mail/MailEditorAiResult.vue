<template>
  <Teleport to="body">
    <section
      v-if="active"
      ref="panel"
      tabindex="-1"
      :aria-label="ta(action)"
      :aria-busy="busy"
      :style="position"
      :data-placement="placement"
      class="fixed z-[250] flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg focus:outline-none"
    >
      <header
        class="flex shrink-0 items-center gap-2 border-b border-gray-100 px-3 py-2 text-xs text-gray-500"
      >
        <svg
          class="h-4 w-4 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            v-if="action === 'polish'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M4 5h12M4 12h7M4 19h7m7-11 1.4 3.6L23 13l-3.6 1.4L18 18l-1.4-3.6L13 13l3.6-1.4L18 8Z"
          />
          <path
            v-else
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M3 5h12M9 3v2m4 0c-1 6-4 9-9 12m2-9c1 3 3 5 6 7m2 6 4-10 4 10m-6.5-4h5"
          />
        </svg>
        <span>{{ ta(action) }}</span>
        <select
          v-if="action === 'translate'"
          v-model="language"
          :aria-label="ta('language')"
          class="min-w-0 rounded border border-gray-200 bg-white py-0.5 pl-2 pr-6 text-xs text-gray-700 focus:border-primary-500 focus:outline-none"
          @change="generate()"
        >
          <option v-for="option in localeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <button
          type="button"
          :aria-label="t('common.close')"
          class="ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          @click="dismiss(true)"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
          >
            <path stroke-linecap="round" d="m6 6 12 12M6 18 18 6" />
          </svg>
        </button>
      </header>
      <div
        role="status"
        aria-live="polite"
        class="min-h-0 flex-1 overflow-y-auto px-3 py-3 text-sm leading-6 text-gray-800"
      >
        <div ref="resultContent">
          <div v-if="busy" class="flex items-center gap-2 text-gray-500">
            <span
              class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-200 border-t-primary-600"
              aria-hidden="true"
            />
            {{ ta(action === 'polish' ? 'polishing' : 'translating') }}
          </div>
          <p v-else-if="error" class="text-red-600">{{ error }}</p>
          <div v-else class="whitespace-pre-wrap break-words">{{ result }}</div>
        </div>
      </div>
      <footer
        v-if="!busy"
        class="flex shrink-0 flex-wrap items-center gap-2 border-t border-gray-100 px-3 py-2"
      >
        <template v-if="result && !error">
          <button
            type="button"
            class="rounded bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
            @click="apply(false)"
          >
            {{ ta(action === 'translate' ? 'useTranslation' : 'useContent') }}
          </button>
          <button
            type="button"
            class="rounded bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200"
            @click="apply(true)"
          >
            {{ ta('insertBelow') }}
          </button>
        </template>
        <button
          type="button"
          class="rounded px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
          @click="generate(action === 'polish' ? result : undefined)"
        >
          {{ error ? t('common.retry') : ta(action === 'polish' ? 'improve' : 'retry') }}
        </button>
      </footer>
    </section>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { useI18n } from 'vue-i18n'
import api from '@/services/api'
import { localeOptions, type SupportedLocale } from '@/i18n/locales'
import {
  applyMailAiResult,
  getMailAiTarget,
  type MailAiAction,
  type MailAiTarget
} from '@/utils/mailEditorAi'
import { showMessage } from '@/utils/message'
import { getMailAiPanelPosition } from '@/utils/mailEditorAiPosition'

const props = defineProps<{ editor: Editor; viewport?: HTMLElement | null; disabled?: boolean }>()
const emit = defineEmits<{ busy: [value: boolean] }>()
const { t } = useI18n()
const ta = (key: string) => t(`sendEmail.aiEdit.${key}`)
const active = ref(false)
const busy = ref(false)
const panel = ref<HTMLElement | null>(null)
const resultContent = ref<HTMLElement | null>(null)
const position = ref<Record<string, string>>({ visibility: 'hidden' })
const placement = ref('below')
const action = ref<MailAiAction>('polish')
const language = ref<SupportedLocale>('en')
const target = shallowRef<MailAiTarget | null>(null)
const result = ref('')
const error = ref('')
let requestId = 0
let controller: AbortController | undefined
let positionFrame = 0
let resizeObserver: ResizeObserver | undefined

const updatePosition = (reveal = true) => {
  if (!active.value || !panel.value || props.editor.isDestroyed) return
  const bounds = (props.viewport || props.editor.view.dom).getBoundingClientRect()
  let caret: { top: number; bottom: number }
  try {
    caret = props.editor.view.coordsAtPos(props.editor.state.selection.head)
  } catch {
    // DOM layout can disappear during editor teardown or a draft replacement.
    position.value = { ...position.value, visibility: 'hidden' }
    return
  }
  const header = panel.value.querySelector('header')?.getBoundingClientRect().height || 40
  const footer = panel.value.querySelector('footer')?.getBoundingClientRect().height || 0
  const height = header + Math.max(64, (resultContent.value?.scrollHeight || 0) + 24) + footer + 2
  const next = getMailAiPanelPosition(bounds, caret, height, {
    width: window.innerWidth,
    height: window.innerHeight
  })
  placement.value = next.placement
  position.value = { ...next.style, ...(!reveal ? { visibility: 'hidden' } : {}) }
}
const schedulePosition = () => {
  if (!active.value || positionFrame) return
  positionFrame = requestAnimationFrame(() => {
    positionFrame = 0
    updatePosition()
  })
}
const onScroll = (event: Event) => {
  if (event.target instanceof Node && panel.value?.contains(event.target)) return
  schedulePosition()
}
const stopFollowing = () => {
  if (positionFrame) cancelAnimationFrame(positionFrame)
  positionFrame = 0
  resizeObserver?.disconnect()
  resizeObserver = undefined
  document.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', schedulePosition)
}
const followCaret = () => {
  stopFollowing()
  document.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', schedulePosition)
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(schedulePosition)
    for (const element of [
      props.viewport || props.editor.view.dom,
      panel.value,
      resultContent.value
    ]) {
      if (element) resizeObserver.observe(element)
    }
  }
}
const setBusy = (value: boolean) => {
  busy.value = value
  emit('busy', value)
}
const dismiss = (focus = false) => {
  stopFollowing()
  requestId++
  controller?.abort()
  active.value = false
  target.value = null
  setBusy(false)
  if (focus && !props.editor.isDestroyed) props.editor.view.focus()
}
const generate = async (input?: string) => {
  if (!active.value || !target.value || props.disabled) return
  controller?.abort()
  controller = new AbortController()
  const currentId = ++requestId
  const source = input || target.value.text
  result.value = ''
  error.value = ''
  setBusy(true)
  try {
    const requestConfig = { signal: controller.signal, timeout: 120000, suppressErrorMessage: true }
    const response: any = await api.post(
      `/ai/${action.value === 'polish' ? 'polish' : 'translate'}-email`,
      {
        content: source,
        ...(action.value === 'translate' ? { target_language: language.value } : {})
      },
      requestConfig
    )
    if (currentId !== requestId) return
    if (response.code !== 0 || !String(response.data?.content || '').trim()) {
      error.value = response.message || ta('failed')
      return
    }
    result.value = String(response.data.content)
  } catch {
    if (currentId === requestId) error.value = ta('failed')
  } finally {
    if (currentId === requestId) setBusy(false)
  }
}
const start = async (mode: MailAiAction, selectedLanguage: SupportedLocale = 'en') => {
  if (props.disabled || props.editor.isDestroyed || !props.editor.isEditable) return
  const nextTarget = getMailAiTarget(props.editor)
  if (!nextTarget) return
  if (nextTarget.text.length > 30000) {
    showMessage(ta('tooLong'), 'warning')
    return
  }
  target.value = nextTarget
  action.value = mode
  language.value = selectedLanguage
  position.value = { visibility: 'hidden' }
  active.value = true
  void generate()
  await nextTick()
  if (!active.value || props.editor.isDestroyed || !panel.value) return
  updatePosition(false)
  await nextTick()
  if (!active.value || props.editor.isDestroyed || !panel.value) return
  updatePosition()
  followCaret()
  panel.value?.focus({ preventScroll: true })
}
const apply = (insert: boolean) => {
  if (busy.value || error.value || !result.value || !target.value || props.disabled) return
  const original = target.value
  const text = result.value
  dismiss()
  if (!applyMailAiResult(props.editor, original, text, insert))
    showMessage(ta('draftChanged'), 'info')
}
watch(
  () => props.editor,
  (editor, _previous, onCleanup) => {
    dismiss()
    const update = () => {
      if (active.value && target.value && !editor.state.doc.eq(target.value.doc)) dismiss()
      else schedulePosition()
    }
    const destroy = () => dismiss()
    editor.on('update', update)
    editor.on('transaction', update)
    editor.on('selectionUpdate', schedulePosition)
    editor.on('destroy', destroy)
    onCleanup(() => {
      editor.off('update', update)
      editor.off('transaction', update)
      editor.off('selectionUpdate', schedulePosition)
      editor.off('destroy', destroy)
    })
  },
  { immediate: true }
)
watch(
  () => props.disabled,
  (value) => {
    if (value) dismiss()
  }
)
watch([busy, result, error], async () => {
  await nextTick()
  schedulePosition()
})
onBeforeUnmount(() => dismiss())
defineExpose({ start })
</script>
