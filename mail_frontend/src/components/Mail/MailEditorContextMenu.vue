<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="menu"
      role="menu"
      :aria-label="inTable ? t('sendEmail.editor.table') : t('sendEmail.body')"
      tabindex="-1"
      :style="position"
      class="fixed z-[260] w-48 max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain rounded-lg border border-gray-200 bg-white p-1 shadow-lg focus:outline-none"
      @contextmenu.prevent
    >
      <template v-if="showLanguages">
        <button
          role="menuitem"
          type="button"
          class="flex w-full items-center gap-2 rounded border-b border-gray-100 px-3 py-2 text-left text-xs text-gray-500 hover:bg-gray-100 focus:bg-primary-50 focus:outline-none"
          @click="showLanguages = false"
        >
          <span aria-hidden="true">‹</span>{{ t('sendEmail.aiEdit.translate') }}
        </button>
        <button
          v-for="option in localeOptions"
          :key="option.value"
          role="menuitem"
          type="button"
          class="block w-full rounded px-3 py-1.5 text-left text-xs text-gray-600 hover:bg-gray-100 focus:bg-primary-50 focus:outline-none"
          @mousedown.prevent
          @click="openAi('translate', option.value)"
        >
          {{ option.label }}
        </button>
      </template>
      <template v-if="!showLanguages && !inTable">
        <button
          v-for="action in clipboardActions"
          :key="action"
          role="menuitem"
          type="button"
          :disabled="disabled || (action !== 'paste' && !hasSelection)"
          class="flex w-full items-center justify-between gap-4 rounded px-3 py-1.5 text-left text-xs text-gray-600 hover:bg-gray-100 focus:bg-primary-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-35"
          @mousedown.prevent
          @click="runClipboard(action)"
        >
          <span>{{ action === 'copy' ? t('common.copy') : t(`sendEmail.editor.${action}`) }}</span>
          <span class="text-gray-400" aria-hidden="true">{{ shortcut(action) }}</span>
        </button>
      </template>
      <template v-if="!showLanguages && inTable">
        <button
          v-for="(action, index) in actions"
          :key="action.key"
          role="menuitem"
          type="button"
          :disabled="!action.enabled || disabled"
          class="block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-gray-100 focus:bg-primary-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-35"
          :class="[
            action.key.startsWith('delete') ? 'text-red-600' : 'text-gray-600',
            { 'mt-1 border-t border-gray-100 pt-2': [3, 6, 8, 10].includes(index) }
          ]"
          @mousedown.prevent
          @click="run(action.key)"
        >
          {{ t(`sendEmail.editor.${action.key}`) }}
        </button>
      </template>
      <button
        v-if="!showLanguages"
        role="menuitem"
        type="button"
        :disabled="disabled || !hasAiContent"
        class="mt-1 flex w-full items-center gap-2 rounded border-t border-gray-100 px-3 py-2 text-left text-xs text-gray-600 hover:bg-gray-100 focus:bg-primary-50 focus:outline-none disabled:opacity-35"
        @mousedown.prevent
        @click="openAi('polish')"
      >
        <SparklesIcon class="h-4 w-4 text-primary-600" aria-hidden="true" />{{
          t('sendEmail.aiEdit.polish')
        }}
      </button>
      <button
        v-if="!showLanguages"
        role="menuitem"
        type="button"
        :disabled="disabled || !hasAiContent"
        aria-haspopup="menu"
        class="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs text-gray-600 hover:bg-gray-100 focus:bg-primary-50 focus:outline-none disabled:opacity-35"
        @mousedown.prevent
        @click="openLanguages"
      >
        <svg
          class="h-4 w-4 text-primary-600"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3 5h12M9 3v2m4 0c-1 6-4 9-9 12m2-9c1 3 3 5 6 7m2 6 4-10 4 10m-6.5-4h5"
          />
        </svg>
        <span>{{ t('sendEmail.aiEdit.translate') }}</span
        ><span class="ml-auto" aria-hidden="true">›</span>
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { useI18n } from 'vue-i18n'
import { SparklesIcon } from '@heroicons/vue/24/outline'
import { mailTableCommands, type MailTableCommand } from '@/utils/mailTableActions'
import { editMailClipboard, type MailClipboardAction } from '@/utils/mailEditorClipboard'
import { showMessage } from '@/utils/message'
import { getMailAiTarget, type MailAiAction } from '@/utils/mailEditorAi'
import { localeOptions, type SupportedLocale } from '@/i18n/locales'

const props = defineProps<{ editor: Editor; disabled?: boolean }>()
const emit = defineEmits<{ ai: [action: MailAiAction, language?: SupportedLocale] }>()
const { t } = useI18n()
const open = ref(false)
const inTable = ref(false)
const showLanguages = ref(false)
const menu = ref<HTMLElement | null>(null)
const revision = ref(0)
const position = ref<Record<string, string>>({})
const actions = computed(() => {
  revision.value
  return mailTableCommands.map((key) => ({ key, enabled: props.editor.can()[key]() }))
})
const hasSelection = computed(() => {
  revision.value
  return !props.editor.state.selection.empty
})
const hasAiContent = computed(() => {
  revision.value
  return Boolean(getMailAiTarget(props.editor))
})
const clipboardActions = ['cut', 'copy', 'paste'] as const
const shortcut = (action: MailClipboardAction) =>
  `${/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+'}${{ cut: 'X', copy: 'C', paste: 'V' }[action]}`
const close = (restoreFocus = false) => {
  if (!open.value) return
  open.value = false
  if (restoreFocus && !props.editor.isDestroyed) props.editor.view.focus()
}
const cellFromTarget = (target: EventTarget | null): HTMLElement | null => {
  const element =
    target instanceof Element ? target : target instanceof Node ? target.parentElement : null
  const cell = element?.closest<HTMLElement>('td, th')
  return cell && props.editor.view.dom.contains(cell) ? cell : null
}
const canOpen = () => !props.disabled && !props.editor.isDestroyed && props.editor.isEditable
const selectCell = (cell: HTMLElement) => {
  // Keep a dragged multi-cell selection when opening the menu inside it.
  if (cell.classList.contains('selectedCell')) return
  const cellPos = props.editor.view.posAtDOM(cell, 0) - 1
  const type = props.editor.state.doc.nodeAt(cellPos)?.type.name
  if (type === 'tableCell' || type === 'tableHeader')
    props.editor.commands.setCellSelection({ anchorCell: cellPos })
}
const show = async (cell: HTMLElement | null, x: number, y: number) => {
  inTable.value = Boolean(cell)
  showLanguages.value = false
  if (cell) selectCell(cell)
  open.value = true
  const editor = props.editor
  position.value = { left: `${x}px`, top: `${y}px`, maxHeight: `${window.innerHeight - 16}px` }
  await nextTick()
  if (!open.value || !menu.value || editor !== props.editor || !canOpen()) return
  const bounds = menu.value.getBoundingClientRect()
  position.value = {
    left: `${Math.max(8, Math.min(x, window.innerWidth - bounds.width - 8))}px`,
    top: `${Math.max(8, Math.min(y, window.innerHeight - bounds.height - 8))}px`,
    maxHeight: `${Math.max(0, window.innerHeight - 16)}px`
  }
  menu.value
    .querySelector<HTMLButtonElement>('button:not(:disabled)')
    ?.focus({ preventScroll: true })
}
const onMouseDown = (event: MouseEvent) => {
  if (event.button !== 2 || !canOpen()) return
  const cell = cellFromTarget(event.target)
  // Prevent the browser from collapsing the selected cells before contextmenu fires.
  event.preventDefault()
  if (cell) selectCell(cell)
  else selectTextAtPointer(event)
}
const selectTextAtPointer = (event: MouseEvent) => {
  if (!event.clientX && !event.clientY) return
  const editor = props.editor
  const hit = editor.view.posAtCoords({ left: event.clientX, top: event.clientY })
  const selection = editor.state.selection
  if (hit && (selection.empty || hit.pos < selection.from || hit.pos > selection.to))
    editor.commands.setTextSelection(hit.pos)
}
const onContextMenu = (event: MouseEvent) => {
  if (!canOpen()) {
    close()
    return
  }
  event.preventDefault()
  const cell = cellFromTarget(event.target)
  if (!cell) selectTextAtPointer(event)
  const rect = (cell || props.editor.view.dom).getBoundingClientRect()
  void show(cell, event.clientX || rect.left + 12, event.clientY || rect.top + 12)
}
const onEditorKeydown = (event: KeyboardEvent) => {
  if (!canOpen() || !(event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')))
    return
  const editor = props.editor
  const selected = editor.view.dom.querySelector<HTMLElement>('.selectedCell')
  const cell = selected || cellFromTarget(editor.view.domAtPos(editor.state.selection.from).node)
  event.preventDefault()
  event.stopPropagation()
  const rect = (cell || editor.view.dom).getBoundingClientRect()
  void show(cell, rect.left + 12, rect.top + 12)
}
const run = (key: MailTableCommand) => {
  if (!canOpen() || !props.editor.can()[key]()) return
  close()
  props.editor.chain().focus()[key]().run()
}
const openAi = (action: MailAiAction, language?: SupportedLocale) => {
  if (!canOpen() || !hasAiContent.value) return
  close(true)
  emit('ai', action, language)
}
const openLanguages = async () => {
  if (!canOpen() || !hasAiContent.value) return
  showLanguages.value = true
  await nextTick()
  if (!menu.value || !open.value) return
  const rect = menu.value.getBoundingClientRect()
  position.value = {
    ...position.value,
    top: `${Math.max(8, Math.min(rect.top, window.innerHeight - rect.height - 8))}px`
  }
  menu.value.querySelector<HTMLButtonElement>('button')?.focus()
}
const runClipboard = async (action: MailClipboardAction) => {
  if (!canOpen() || (action !== 'paste' && !hasSelection.value)) return
  close(true)
  try {
    await editMailClipboard(props.editor, action)
  } catch {
    showMessage(t('sendEmail.editor.clipboardShortcutHint', { shortcut: shortcut(action) }), 'info')
  }
}
const onOutsidePointerDown = (event: PointerEvent) => {
  if (open.value && event.target instanceof Node && !menu.value?.contains(event.target)) close()
}
const onScroll = (event: Event) => {
  if (event.target instanceof Node && menu.value?.contains(event.target)) return
  close()
}
const onKeydown = (event: KeyboardEvent) => {
  if (!open.value) return
  if (showLanguages.value && (event.key === 'ArrowLeft' || event.key === 'Escape')) {
    event.preventDefault()
    event.stopPropagation()
    showLanguages.value = false
    void nextTick(() =>
      menu.value?.querySelector<HTMLButtonElement>('button[aria-haspopup]')?.focus()
    )
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    close(true)
    return
  }
  if (!(event.target instanceof Node) || !menu.value?.contains(event.target)) return
  if (event.key === 'Tab') {
    event.preventDefault()
    event.stopPropagation()
    close(true)
    return
  }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  event.stopPropagation()
  const buttons = Array.from(
    menu.value.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
  )
  const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
  const target =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
  buttons[target]?.focus()
}
const onResize = () => close()
watch(
  () => props.editor,
  (editor, _previous, onCleanup) => {
    const dom = editor.view.dom
    const update = ({ transaction }: { transaction: { docChanged: boolean } }) => {
      revision.value++
      if (transaction.docChanged) close()
    }
    dom.addEventListener('mousedown', onMouseDown, true)
    dom.addEventListener('contextmenu', onContextMenu)
    dom.addEventListener('keydown', onEditorKeydown)
    editor.on('transaction', update)
    editor.on('destroy', onResize)
    document.addEventListener('pointerdown', onOutsidePointerDown, true)
    document.addEventListener('keydown', onKeydown, true)
    document.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    window.addEventListener('blur', onResize)
    onCleanup(() => {
      close()
      dom.removeEventListener('mousedown', onMouseDown, true)
      dom.removeEventListener('contextmenu', onContextMenu)
      dom.removeEventListener('keydown', onEditorKeydown)
      editor.off('transaction', update)
      editor.off('destroy', onResize)
      document.removeEventListener('pointerdown', onOutsidePointerDown, true)
      document.removeEventListener('keydown', onKeydown, true)
      document.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('blur', onResize)
    })
  },
  { immediate: true }
)
watch(
  () => props.disabled,
  (value) => {
    if (value) close()
  }
)
onBeforeUnmount(() => close())
</script>
