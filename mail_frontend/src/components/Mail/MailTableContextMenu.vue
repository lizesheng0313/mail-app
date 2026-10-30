<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="menu"
      role="menu"
      :aria-label="t('sendEmail.editor.table')"
      tabindex="-1"
      :style="position"
      class="fixed z-[260] w-48 max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain rounded-lg border border-gray-200 bg-white p-1 shadow-lg focus:outline-none"
      @contextmenu.prevent
    >
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
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { useI18n } from 'vue-i18n'
import { mailTableCommands, type MailTableCommand } from '@/utils/mailTableActions'

const props = defineProps<{ editor: Editor; disabled?: boolean }>()
const { t } = useI18n()
const open = ref(false)
const menu = ref<HTMLElement | null>(null)
const revision = ref(0)
const position = ref<Record<string, string>>({})
const actions = computed(() => {
  revision.value
  return mailTableCommands.map((key) => ({ key, enabled: props.editor.can()[key]() }))
})
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
const show = async (cell: HTMLElement, x: number, y: number) => {
  selectCell(cell)
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
  if (!cell) return
  // Prevent the browser from collapsing the selected cells before contextmenu fires.
  event.preventDefault()
  selectCell(cell)
}
const onContextMenu = (event: MouseEvent) => {
  const cell = canOpen() ? cellFromTarget(event.target) : null
  if (!cell) {
    close()
    return
  }
  event.preventDefault()
  const rect = cell.getBoundingClientRect()
  void show(cell, event.clientX || rect.left + 12, event.clientY || rect.top + 12)
}
const onEditorKeydown = (event: KeyboardEvent) => {
  if (!canOpen() || !(event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')))
    return
  const editor = props.editor
  if (!editor.isActive('table')) return
  const selected = editor.view.dom.querySelector<HTMLElement>('.selectedCell')
  const cell = selected || cellFromTarget(editor.view.domAtPos(editor.state.selection.from).node)
  if (!cell) return
  event.preventDefault()
  event.stopPropagation()
  const rect = cell.getBoundingClientRect()
  void show(cell, rect.left + 12, rect.top + 12)
}
const run = (key: MailTableCommand) => {
  if (!canOpen() || !props.editor.can()[key]()) return
  close()
  props.editor.chain().focus()[key]().run()
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
