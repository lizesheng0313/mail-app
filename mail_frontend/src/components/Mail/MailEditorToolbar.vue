<template>
  <div
    role="toolbar"
    :aria-label="te('formatting')"
    class="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-gray-100 bg-gray-50/70 px-2 py-1"
  >
    <button
      v-for="action in historyActions"
      :key="action.key"
      type="button"
      :title="te(action.key)"
      :aria-label="te(action.key)"
      :disabled="disabled || !state.can[action.key]"
      :class="buttonClass(false)"
      @mousedown.prevent
      @click="run(action.run)"
    >
      <component :is="action.icon" class="h-4 w-4" aria-hidden="true" />
    </button>
    <span class="mx-1 h-4 w-px bg-gray-200" aria-hidden="true" />
    <select
      :value="state.fontFamily"
      :disabled="disabled"
      :aria-label="te('fontFamily')"
      class="h-7 w-24 rounded border-0 bg-transparent py-0 pl-1.5 pr-5 text-xs text-gray-600 focus:ring-1 focus:ring-primary-400"
      @change="fontFamily(($event.target as HTMLSelectElement).value)"
    >
      <option value="">{{ te('defaultFont') }}</option>
      <option v-for="font in fonts" :key="font.value" :value="font.value">{{ font.label }}</option>
    </select>
    <select
      :value="state.fontSize"
      :disabled="disabled"
      :aria-label="te('fontSize')"
      class="h-7 w-14 rounded border-0 bg-transparent py-0 pl-1 pr-5 text-xs text-gray-600 focus:ring-1 focus:ring-primary-400"
      @change="fontSize(($event.target as HTMLSelectElement).value)"
    >
      <option value="">14</option>
      <option v-for="size in [12, 14, 16, 18, 20, 24, 28, 32]" :key="size" :value="`${size}px`">
        {{ size }}
      </option>
    </select>
    <span class="mx-1 h-4 w-px bg-gray-200" aria-hidden="true" />
    <button
      v-for="action in markActions"
      :key="action.key"
      type="button"
      :title="te(action.key)"
      :aria-label="te(action.key)"
      :aria-pressed="state.active[action.key]"
      :disabled="disabled"
      :class="buttonClass(state.active[action.key])"
      @mousedown.prevent
      @click="run(action.run)"
    >
      <component :is="action.icon" class="h-4 w-4" aria-hidden="true" />
    </button>
    <label
      :title="te('textColor')"
      class="relative inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded text-sm font-semibold text-gray-600 hover:bg-gray-100"
    >
      A<span
        class="absolute bottom-1 left-1.5 right-1.5 h-0.5"
        :style="{ backgroundColor: state.color }"
      />
      <input
        type="color"
        :value="state.color"
        :disabled="disabled"
        :aria-label="te('textColor')"
        class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        @input="
          editor
            .chain()
            .focus()
            .setColor(($event.target as HTMLInputElement).value)
            .run()
        "
      />
    </label>
    <label
      :title="te('highlight')"
      class="relative inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded hover:bg-gray-100"
    >
      <PaintBrushIcon class="h-4 w-4 text-gray-500" aria-hidden="true" /><span
        class="absolute bottom-1 left-1.5 right-1.5 h-0.5"
        :style="{ backgroundColor: state.backgroundColor }"
      />
      <input
        type="color"
        :value="state.backgroundColor"
        :disabled="disabled"
        :aria-label="te('highlight')"
        class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        @input="
          editor
            .chain()
            .focus()
            .setBackgroundColor(($event.target as HTMLInputElement).value)
            .run()
        "
      />
    </label>
    <span class="mx-1 h-4 w-px bg-gray-200" aria-hidden="true" />
    <EditorToolbarMenu
      :icon="Bars3BottomLeftIcon"
      :label="te('alignment')"
      :disabled="disabled"
      v-slot="{ close }"
    >
      <button
        v-for="align in ['left', 'center', 'right', 'justify']"
        :key="align"
        type="button"
        :class="menuClass(state.alignment === align)"
        @click="run(() => editor.chain().focus().setTextAlign(align).run(), close)"
      >
        {{ te(`align_${align}`) }}
      </button>
    </EditorToolbarMenu>
    <button
      v-for="action in listActions"
      :key="action.key"
      type="button"
      :title="te(action.key)"
      :aria-label="te(action.key)"
      :aria-pressed="state.active[action.key]"
      :disabled="disabled"
      :class="buttonClass(state.active[action.key])"
      @mousedown.prevent
      @click="run(action.run)"
    >
      <component :is="action.icon" class="h-4 w-4" aria-hidden="true" />
    </button>
    <EditorToolbarMenu
      :icon="LinkIcon"
      :label="te('link')"
      :active="state.active.link"
      :disabled="disabled"
      @open="resetLinkForm"
      v-slot="{ close }"
    >
      <form class="space-y-2 p-2" @submit.prevent="applyLink(close)">
        <label class="block text-xs font-medium text-gray-600">{{ te('linkUrl') }}</label>
        <input
          v-model="linkUrl"
          type="text"
          placeholder="https://"
          :aria-label="te('linkUrl')"
          class="w-full rounded border border-gray-200 px-2 py-1.5 text-xs focus:border-primary-400 focus:ring-0"
        />
        <p v-if="linkError" role="alert" class="text-xs text-red-600">{{ linkError }}</p>
        <div class="flex justify-end gap-2">
          <button
            v-if="state.active.link"
            type="button"
            class="rounded px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
            @click="
              run(() => editor.chain().focus().extendMarkRange('link').unsetLink().run(), close)
            "
          >
            {{ te('removeLink') }}
          </button>
          <button
            type="submit"
            class="rounded bg-primary-600 px-2 py-1.5 text-xs text-white hover:bg-primary-700"
          >
            {{ te('apply') }}
          </button>
        </div>
      </form>
    </EditorToolbarMenu>
    <button
      type="button"
      :title="te('image')"
      :aria-label="te('image')"
      :disabled="disabled || uploadingImage"
      :class="buttonClass(false)"
      @mousedown.prevent
      @click="imageInput?.click()"
    >
      <PhotoIcon class="h-4 w-4" :class="{ 'animate-pulse': uploadingImage }" aria-hidden="true" />
    </button>
    <input
      ref="imageInput"
      type="file"
      accept="image/png,image/jpeg,image/gif,image/webp"
      class="hidden"
      @change="insertImage"
    />
    <EditorToolbarMenu
      :icon="TableCellsIcon"
      :label="te('table')"
      :active="state.active.table"
      :disabled="disabled"
      v-slot="{ close }"
    >
      <form
        v-if="!state.active.table"
        class="space-y-2 p-2"
        @submit.prevent="
          run(
            () =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: tableRows, cols: tableCols, withHeaderRow: true })
                .run(),
            close
          )
        "
      >
        <div class="grid grid-cols-2 gap-2">
          <label class="text-xs text-gray-500"
            >{{ te('rows')
            }}<input
              v-model.number="tableRows"
              type="number"
              min="1"
              max="20"
              required
              :aria-label="te('rows')"
              class="mt-1 w-full rounded border border-gray-200 px-2 py-1 text-xs focus:ring-0"
          /></label>
          <label class="text-xs text-gray-500"
            >{{ te('columns')
            }}<input
              v-model.number="tableCols"
              type="number"
              min="1"
              max="12"
              required
              :aria-label="te('columns')"
              class="mt-1 w-full rounded border border-gray-200 px-2 py-1 text-xs focus:ring-0"
          /></label>
        </div>
        <button
          type="submit"
          class="w-full rounded bg-primary-50 px-2 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100"
        >
          {{ te('insertTable') }}
        </button>
      </form>
      <button
        v-for="action in tableActions"
        v-show="state.active.table"
        :key="action.key"
        type="button"
        :disabled="!state.can[action.key]"
        :class="[menuClass(false), { 'text-red-600': action.key.startsWith('delete') }]"
        @click="run(action.run, close)"
      >
        {{ te(action.key) }}
      </button>
      <label
        v-if="state.active.table"
        class="flex items-center justify-between border-t border-gray-100 px-2 py-2 text-xs text-gray-600"
      >
        {{ te('cellColor')
        }}<input
          type="color"
          value="#f1f5f9"
          :disabled="!state.active.table"
          :aria-label="te('cellColor')"
          class="h-6 w-8 cursor-pointer rounded border-0 p-0 disabled:opacity-30"
          @input="
            editor
              .chain()
              .focus()
              .setCellAttribute('backgroundColor', ($event.target as HTMLInputElement).value)
              .run()
          "
        />
      </label>
    </EditorToolbarMenu>
    <EditorToolbarMenu
      :icon="EllipsisHorizontalIcon"
      :label="te('more')"
      :disabled="disabled"
      v-slot="{ close }"
    >
      <button
        type="button"
        :class="menuClass(false)"
        @click="run(() => editor.chain().focus().setParagraph().run(), close)"
      >
        {{ te('paragraph') }}
      </button>
      <button
        v-for="level in [1, 2, 3]"
        :key="level"
        type="button"
        :class="menuClass(false)"
        @click="
          run(
            () =>
              editor
                .chain()
                .focus()
                .toggleHeading({ level: level as 1 | 2 | 3 })
                .run(),
            close
          )
        "
      >
        {{ te('heading', { level }) }}
      </button>
      <button
        type="button"
        :class="menuClass(state.active.blockquote)"
        @click="run(() => editor.chain().focus().toggleBlockquote().run(), close)"
      >
        {{ te('quote') }}
      </button>
      <button
        type="button"
        :class="menuClass(false)"
        @click="run(() => editor.chain().focus().setHorizontalRule().run(), close)"
      >
        {{ te('divider') }}
      </button>
      <button
        type="button"
        :class="menuClass(false)"
        @click="
          run(
            () => editor.chain().focus().unsetAllMarks().clearNodes().unsetTextAlign().run(),
            close
          )
        "
      >
        {{ te('clearFormatting') }}
      </button>
    </EditorToolbarMenu>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { useI18n } from 'vue-i18n'
import {
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
  Bars3BottomLeftIcon,
  ListBulletIcon,
  NumberedListIcon,
  LinkIcon,
  PhotoIcon,
  TableCellsIcon,
  EllipsisHorizontalIcon,
  PaintBrushIcon
} from '@heroicons/vue/24/outline'
import EditorToolbarMenu from './EditorToolbarMenu.vue'
import { uploadImageFile } from '@/utils/imageUpload'
import { getApiBaseURL } from '@/services/api'
import { showMessage } from '@/utils/message'

const props = defineProps<{ editor: Editor; disabled?: boolean }>()
const emit = defineEmits<{ busy: [value: boolean] }>()
const { t } = useI18n()
const te = (key: string, params: Record<string, unknown> = {}) =>
  t(`sendEmail.editor.${key}`, params)
const buttonClass = (active: boolean) => [
  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-30',
  active ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
]
const menuClass = (active: boolean) => [
  'block w-full rounded px-2 py-1.5 text-left text-xs disabled:cursor-not-allowed disabled:opacity-30',
  active ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
]
const historyActions = [
  { key: 'undo', icon: ArrowUturnLeftIcon, run: () => props.editor.chain().focus().undo().run() },
  { key: 'redo', icon: ArrowUturnRightIcon, run: () => props.editor.chain().focus().redo().run() }
]
const markActions = [
  { key: 'bold', icon: BoldIcon, run: () => props.editor.chain().focus().toggleBold().run() },
  { key: 'italic', icon: ItalicIcon, run: () => props.editor.chain().focus().toggleItalic().run() },
  {
    key: 'underline',
    icon: UnderlineIcon,
    run: () => props.editor.chain().focus().toggleUnderline().run()
  },
  {
    key: 'strike',
    icon: StrikethroughIcon,
    run: () => props.editor.chain().focus().toggleStrike().run()
  }
]
const listActions = [
  {
    key: 'bulletList',
    icon: ListBulletIcon,
    run: () => props.editor.chain().focus().toggleBulletList().run()
  },
  {
    key: 'orderedList',
    icon: NumberedListIcon,
    run: () => props.editor.chain().focus().toggleOrderedList().run()
  }
]
const tableCommands = [
  'addRowBefore',
  'addRowAfter',
  'deleteRow',
  'addColumnBefore',
  'addColumnAfter',
  'deleteColumn',
  'toggleHeaderRow',
  'toggleHeaderColumn',
  'mergeCells',
  'splitCell',
  'deleteTable'
] as const
const tableActions = tableCommands.map((key) => ({
  key,
  run: () => props.editor.chain().focus()[key]().run()
}))
const fonts = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: '微软雅黑', value: 'Microsoft YaHei, sans-serif' },
  { label: '宋体', value: 'SimSun, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Courier New', value: 'Courier New, monospace' }
]
const revision = ref(0)
const update = () => {
  revision.value++
}
watch(
  () => props.editor,
  (editor, previous) => {
    previous?.off('transaction', update)
    editor.on('transaction', update)
    update()
  },
  { immediate: true }
)
onBeforeUnmount(() => props.editor.off('transaction', update))
const toHex = (value: string, fallback: string) => {
  if (/^#[0-9a-f]{6}$/i.test(value || '')) return value
  const rgb = String(value || '').match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  return rgb
    ? '#' +
        rgb
          .slice(1)
          .map((part) => Number(part).toString(16).padStart(2, '0'))
          .join('')
    : fallback
}
const state = computed(() => {
  revision.value
  const editor = props.editor
  const style = editor.getAttributes('textStyle')
  return {
    fontFamily: style.fontFamily || '',
    fontSize: style.fontSize || '',
    color: toHex(style.color, '#1e293b'),
    backgroundColor: toHex(style.backgroundColor, '#fef08a'),
    alignment:
      editor.getAttributes('paragraph').textAlign ||
      editor.getAttributes('heading').textAlign ||
      'left',
    active: Object.fromEntries(
      [
        'bold',
        'italic',
        'underline',
        'strike',
        'bulletList',
        'orderedList',
        'blockquote',
        'link',
        'table'
      ].map((key) => [key, editor.isActive(key)])
    ),
    can: Object.fromEntries(
      (['undo', 'redo', ...tableCommands] as const).map((key) => [key, editor.can()[key]()])
    )
  }
})
const run = (action: () => unknown, close?: (element?: HTMLElement) => void) => {
  if (props.disabled) return
  action()
  close?.(props.editor.view.dom)
}
const fontFamily = (value: string) =>
  value
    ? props.editor.chain().focus().setFontFamily(value).run()
    : props.editor.chain().focus().unsetFontFamily().run()
const fontSize = (value: string) =>
  value
    ? props.editor.chain().focus().setFontSize(value).run()
    : props.editor.chain().focus().unsetFontSize().run()
const tableRows = ref(3)
const tableCols = ref(3)
const linkUrl = ref('')
const linkError = ref('')
const resetLinkForm = () => {
  linkUrl.value = props.editor.getAttributes('link').href || ''
  linkError.value = ''
}
const applyLink = (close: (element?: HTMLElement) => void) => {
  let url: URL
  try {
    const raw = linkUrl.value.trim()
    if (!raw) throw new Error()
    url = new URL(/^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`)
    if (!['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol)) throw new Error()
  } catch {
    linkError.value = te('invalidLink')
    return
  }
  const editor = props.editor
  if (editor.state.selection.empty && !editor.isActive('link')) {
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'text',
        text: url.href,
        marks: [{ type: 'link', attrs: { href: url.href } }]
      })
      .run()
  } else editor.chain().focus().extendMarkRange('link').setLink({ href: url.href }).run()
  close(editor.view.dom)
}
const imageInput = ref<HTMLInputElement | null>(null)
const uploadingImage = ref(false)
watch(uploadingImage, (value) => emit('busy', value))
const insertImage = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadingImage.value = true
  const position = props.editor.state.selection.from
  try {
    const result = await uploadImageFile(file)
    const api = getApiBaseURL()
    const origin = /^https?:\/\//.test(api) ? api : window.location.origin
    const url = new URL(result.url, origin)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
    if (!props.editor.isDestroyed)
      props.editor
        .chain()
        .focus()
        .insertContentAt(Math.min(position, props.editor.state.doc.content.size), {
          type: 'image',
          attrs: { src: url.href, alt: file.name }
        })
        .run()
  } catch {
    showMessage(te('imageUploadFailed'), 'error')
  } finally {
    uploadingImage.value = false
    input.value = ''
  }
}
</script>
