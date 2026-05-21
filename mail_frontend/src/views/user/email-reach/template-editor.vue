<template>
  <div class="flex min-h-full flex-col space-y-3 pb-4">
    <div
      v-if="accessLoaded && !canOperate"
      class="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900"
    >
      <div class="font-medium">当前账号还没开通邮件触达</div>
      <div class="mt-2">{{ access.reason }}</div>
    </div>

    <div v-else class="flex flex-col space-y-3">
      <div class="rounded-2xl bg-white p-4 shadow-sm">
        <div class="grid items-end gap-3 xl:grid-cols-[260px_minmax(0,1fr)_auto_auto]">
          <div>
            <label class="mb-1.5 block pl-[2px] text-xs font-medium text-slate-500">模板名称</label>
            <input
              v-model="form.name"
              type="text"
              class="h-[46px] w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              placeholder="例如：订单支付通知"
            />
          </div>
          <div>
            <label class="mb-1.5 block pl-[2px] text-xs font-medium text-slate-500">邮件主题</label>
            <input
              v-model="form.subject"
              type="text"
              class="h-[46px] w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              placeholder="输入邮件主题"
            />
          </div>
          <button
            type="button"
            class="inline-flex h-[46px] items-center justify-center whitespace-nowrap rounded-lg border border-primary-200 bg-white px-4 text-sm font-medium text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
            :disabled="!canOperate || generating"
            @click="aiModalVisible = true"
          >
            {{ generating ? 'AI生成中...' : 'AI辅助生成' }}
          </button>
          <button
            type="button"
            class="inline-flex h-[46px] items-center justify-center whitespace-nowrap rounded-lg bg-primary-600 px-6 text-sm font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-600 disabled:opacity-50"
            :disabled="saving || !canOperate"
            @click="handleSave"
          >
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>

      <div class="flex min-h-[620px] flex-col overflow-hidden rounded-[20px] bg-white shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3">
          <div class="flex flex-wrap items-center gap-2">
            <input
              v-model="customVariableInput"
              placeholder="例如：活动名称"
              class="h-10 w-52 rounded-md border border-gray-300 px-3 text-sm text-gray-700 focus:border-primary-500 focus:outline-none"
            />
            <button
              type="button"
              class="inline-flex h-10 items-center justify-center rounded-md border border-gray-300 px-4 text-sm text-gray-700 hover:bg-gray-50"
              @click="addCustomVariable"
            >
              添加变量
            </button>
            <button
              v-for="item in availableVariables"
              :key="item.name"
              type="button"
              class="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm ring-1 transition-colors"
              :class="item.custom ? 'bg-gray-50 text-gray-700 ring-gray-200 hover:bg-gray-100' : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50'"
              @click="insertVariableToken(item.token)"
            >
              <span>{{ item.name }}</span>
              <span
                v-if="item.custom"
                class="text-gray-400 hover:text-red-500"
                @click.stop="removeCustomVariable(item.name)"
              >
                ×
              </span>
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <input
              ref="imageInputRef"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleImageUpload"
            />
            <div class="flex h-9 items-center px-1">
              <div class="w-[96px]">
                <CustomSelect
                  v-model="selectedFontSize"
                  :options="fontSizeOptions"
                  placeholder="字号"
                  size="sm"
                  @change="applyFontSize"
                />
              </div>
            </div>
            <label class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 ring-1 ring-slate-200 transition hover:bg-slate-100">
              <input
                v-model="selectedTextColor"
                type="color"
                class="h-5 w-5 cursor-pointer appearance-none rounded border-0 bg-transparent p-0"
                @input="applyTextColor($event.target.value)"
              />
            </label>
            <button
              type="button"
              title="上传图片"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-600 disabled:opacity-50"
              :disabled="uploadingImage"
              @click="triggerImageUpload"
            >
              <BaseIcon :name="uploadingImage ? 'refresh' : 'upload'" size="w-4 h-4" />
            </button>
            <button
              type="button"
              @click="toggleBold"
              title="加粗"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              B
            </button>
            <button
              type="button"
              @click="toggleItalic"
              title="斜体"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-sm italic text-gray-700 hover:bg-gray-50"
            >
              I
            </button>
            <button
              type="button"
              @click="openLinkModal"
              title="超链接"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M6.2 9.8 9.8 6.2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M6.7 12.3H4.8a2.8 2.8 0 1 1 0-5.6h1.9" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9.3 3.7h1.9a2.8 2.8 0 1 1 0 5.6H9.3" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button
              type="button"
              @click="toggleBulletList"
              title="列表"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <BaseIcon name="list" size="w-4 h-4" />
            </button>
            <button
              type="button"
              @click="toggleOrderedList"
              title="编号"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M5 4h8M5 8h8M5 12h8" stroke-linecap="round"/>
                <path d="M1.5 3.5h1v2h-1M1.2 7.2c.3-.3.7-.5 1.2-.5.7 0 1.1.4 1.1.9 0 .4-.2.7-.8 1.2l-1.1.9h1.9M1.5 10.6h1.1c.6 0 1 .3 1 .8 0 .6-.5 1-1.2 1-.5 0-.9-.1-1.3-.4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button
              type="button"
              @click="insertDivider"
              title="分割线"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M2 8h12" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="flex items-center bg-slate-50 px-4 py-2">
          <div class="flex items-center rounded-full bg-slate-100 p-1">
            <button
              type="button"
              class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
              :class="editorMode === 'rich' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
              @click="editorMode = 'rich'"
            >
              编辑
            </button>
            <button
              type="button"
              class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
              :class="editorMode === 'code' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
              @click="editorMode = 'code'"
            >
              代码
            </button>
            <button
              type="button"
              class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
              :class="editorMode === 'preview' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
              @click="editorMode = 'preview'"
            >
              预览
            </button>
          </div>
        </div>

        <div
          v-if="editor && editorMode === 'rich'"
          ref="editorWrapRef"
          class="mail-template-editor-wrap flex-1"
        >
          <EditorContent
            :editor="editor"
            class="mail-template-editor"
          />
          <div
            v-if="imageResize.visible"
            class="mail-image-resize-box"
            :style="imageResizeBoxStyle"
          >
            <button
              v-for="handle in resizeHandles"
              :key="handle.key"
              type="button"
              class="mail-image-resize-handle"
              :class="`mail-image-resize-handle--${handle.key}`"
              @mousedown.prevent="startImageResize($event, handle.key)"
            ></button>
          </div>
        </div>
        <textarea
          v-else-if="editorMode === 'code'"
          v-model="htmlSource"
          ref="htmlSourceRef"
          class="mail-template-code"
          placeholder="这里直接写 HTML"
          @input="handleHtmlSourceInput"
        ></textarea>
        <div v-else class="mail-template-preview flex-1">
          <EmailHtmlRenderer :html="previewHtml" min-height="560px" />
        </div>
      </div>
    </div>

    <BaseModal
      :model-value="aiModalVisible"
      title="AI辅助生成"
      confirm-text="开始生成"
      :confirm-loading="generating"
      @update:modelValue="aiModalVisible = $event"
      @confirm="handleGenerate"
    >
      <textarea
        v-model="form.helper_prompt"
        class="min-h-[140px] w-full resize-none rounded-lg border border-gray-300 px-3 py-3 text-sm text-gray-700 outline-none focus:border-primary-500"
        placeholder="例如：突出优惠、适合老客户、语气正式一点"
      ></textarea>
    </BaseModal>

    <BaseModal
      :model-value="linkModalVisible"
      title="插入超链接"
      confirm-text="确定"
      @update:modelValue="linkModalVisible = $event"
      @confirm="handleInsertLink"
    >
      <div class="space-y-4">
        <div>
          <label class="mb-2 block text-sm font-medium text-slate-700">链接地址</label>
          <input
            v-model="linkForm.url"
            type="text"
            class="h-[46px] w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="例如：https://example.com"
          />
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium text-slate-700">显示文字</label>
          <input
            v-model="linkForm.text"
            type="text"
            class="h-[46px] w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="不填默认用选中文字或链接地址"
          />
        </div>
      </div>
    </BaseModal>

    <BaseModal
      :model-value="reviewFailModalVisible"
      title="审核未通过"
      confirm-text="知道了"
      :show-cancel="false"
      @update:modelValue="reviewFailModalVisible = $event"
      @confirm="reviewFailModalVisible = false"
    >
      <div class="space-y-3 text-sm text-slate-700">
        <div v-if="reviewFailSummary" class="rounded-lg bg-rose-50 px-4 py-3 text-rose-700">
          {{ reviewFailSummary }}
        </div>
        <div v-if="reviewFailIssues.length">
          <div class="mb-2 font-medium text-slate-900">存在问题</div>
          <ul class="space-y-2 pl-5 text-slate-600">
            <li v-for="(item, index) in reviewFailIssues" :key="`issue-${index}`" class="list-disc">
              {{ item }}
            </li>
          </ul>
        </div>
        <div v-if="reviewFailFixes.length">
          <div class="mb-2 font-medium text-slate-900">需要修改</div>
          <ul class="space-y-2 pl-5 text-slate-600">
            <li v-for="(item, index) in reviewFailFixes" :key="`fix-${index}`" class="list-disc">
              {{ item }}
            </li>
          </ul>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import BaseModal from '@/components/BaseModal/index.vue'
import BaseIcon from '@/components/BaseIcon/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import EmailHtmlRenderer from '@/components/Mail/EmailHtmlRenderer.vue'
import SimpleImageExtension from './components/SimpleImageExtension'
import SimpleLinkExtension from './components/SimpleLinkExtension'
import TextStyleExtension from './components/TextStyleExtension'
import emailReachApi from '@/api/emailReach'
import { uploadImageFile } from '@/utils/imageUpload'
import { showMessage } from '@/utils/message'

const route = useRoute()
const router = useRouter()

const accessLoaded = ref(false)
const saving = ref(false)
const generating = ref(false)
const uploadingImage = ref(false)
const reviewResult = ref(null)
const imageInputRef = ref(null)
const htmlSourceRef = ref(null)
const editorWrapRef = ref(null)
const customVariableInput = ref('')
const customVariables = ref([])
const syncingContent = ref(false)
const htmlSource = ref('')
const aiModalVisible = ref(false)
const linkModalVisible = ref(false)
const reviewFailModalVisible = ref(false)
const editorMode = ref('rich')
const lastEditorSelection = ref({ from: 0, to: 0 })
const lastCodeSelection = ref({ start: 0, end: 0 })
const selectedFontSize = ref('14px')
const selectedTextColor = ref('#374151')
const linkForm = reactive({
  url: '',
  text: ''
})
const access = ref({
  status: 'pending',
  reason: ''
})
const imageResize = reactive({
  visible: false,
  left: 0,
  top: 0,
  width: 0,
  height: 0
})
const resizeHandles = [
  { key: 'nw' },
  { key: 'ne' },
  { key: 'sw' },
  { key: 'se' }
]
let activeResize = null

const fontSizeOptions = [
  { label: '12px', value: '12px' },
  { label: '14px', value: '14px' },
  { label: '16px', value: '16px' },
  { label: '18px', value: '18px' },
  { label: '20px', value: '20px' },
  { label: '24px', value: '24px' }
]

const createDefaultForm = () => ({
  id: null,
  template_id: '',
  name: '',
  scene: '',
  subject: '',
  content: '',
  helper_prompt: '',
  variables: []
})

const form = reactive(createDefaultForm())
const canOperate = computed(() => access.value.status === 'approved' || access.value.status === 'trial')
const templateId = computed(() => String(route.params.id || '').trim())
const isEdit = computed(() => route.name === 'user-email-reach-template-edit')
const previewHtml = computed(() => buildManagedContent())
const reviewFailSummary = computed(() => String(reviewResult.value?.summary || '').trim())
const reviewFailIssues = computed(() =>
  Array.isArray(reviewResult.value?.issues)
    ? reviewResult.value.issues.filter((item) => String(item || '').trim())
    : []
)
const reviewFailFixes = computed(() =>
  Array.isArray(reviewResult.value?.required_fixes)
    ? reviewResult.value.required_fixes.filter((item) => String(item || '').trim())
    : []
)

const LEGACY_RESERVED_VARIABLES = new Set([
  'nickname',
  'order_no',
  'product_name',
  'pay_amount',
  'order_time',
  'tracking_no',
  'delivery_company',
  'register_time'
])

const allVariables = computed(() => customVariables.value.map((item) => `{{${item}}}`))

const extractTemplateVariables = (text) => {
  const source = String(text || '')
  const doubleMatches = [...source.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)]
    .map((item) => String(item[1] || '').trim())
  const singleMatches = [...source.matchAll(/(^|[^{])\{\s*([\u4e00-\u9fa5a-zA-Z_][\u4e00-\u9fa5a-zA-Z0-9_]{0,48})\s*\}(?!})/g)]
    .map((item) => String(item[2] || '').trim())
  return [...new Set([...doubleMatches, ...singleMatches].filter(Boolean))]
}

const syncVariablesFromContent = () => {
  const next = [
    ...customVariables.value,
    ...extractTemplateVariables(`${form.subject || ''}\n${form.content || ''}`)
  ].filter((item) => item && !LEGACY_RESERVED_VARIABLES.has(String(item)))
  customVariables.value = [...new Set(next)]
}

const availableVariables = computed(() =>
  allVariables.value.map((item) => {
    const name = item.replace(/[{}]/g, '')
    return {
      name,
      token: item,
      custom: customVariables.value.includes(name)
    }
  })
)
const imageResizeBoxStyle = computed(() => ({
  left: `${imageResize.left}px`,
  top: `${imageResize.top}px`,
  width: `${imageResize.width}px`,
  height: `${imageResize.height}px`
}))

const normalizePreviewImageUrls = (html) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return String(html || '')
    .replace(/https?:\/\/zjkdongao\.cn\/image\/([^"' >]+)/gi, `${origin}/image/$1`)
    .replace(/src=(['"])\/image\/([^"' >]+)\1/gi, `src=$1${origin}/image/$2$1`)
}

const buildManagedContent = () => {
  const text = String(form.content || '').trim()
  if (!text) {
    return '<p></p>'
  }
  return normalizePreviewImageUrls(text)
}

const rgbToHex = (value) => {
  const match = String(value || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (!match) return String(value || '')
  return `#${match
    .slice(1, 4)
    .map((item) => Number(item).toString(16).padStart(2, '0'))
    .join('')}`
}

const normalizeColorValue = (value) => {
  const input = String(value || '').trim()
  if (!input) return '#374151'
  if (input.startsWith('rgb')) return rgbToHex(input).toLowerCase()
  if (/^#[0-9a-fA-F]{6}$/.test(input)) return input.toLowerCase()
  return '#374151'
}

const syncTextStyleState = () => {
  if (!editor.value) return
  const attrs = editor.value.getAttributes('textStyle') || {}
  selectedFontSize.value = String(attrs.fontSize || '14px')
  selectedTextColor.value = normalizeColorValue(attrs.color)
}

const resolveTextStyleRange = () => {
  if (!editor.value) return null
  const { selection } = editor.value.state
  const currentFrom = Number(selection?.from || 0)
  const currentTo = Number(selection?.to || 0)

  if (currentTo > currentFrom) {
    return { from: currentFrom, to: currentTo, restoreFrom: currentFrom }
  }

  const savedFrom = Number(lastEditorSelection.value?.from || 0)
  const savedTo = Number(lastEditorSelection.value?.to || 0)
  if (savedTo > savedFrom) {
    return { from: savedFrom, to: savedTo, restoreFrom: savedFrom }
  }

  const $from = selection?.$from
  const parent = $from?.parent
  if (parent?.isTextblock && Number(parent.content.size || 0) > 0) {
    const start = $from.start()
    const end = start + parent.content.size
    if (end > start) {
      return { from: start, to: end, restoreFrom: currentFrom || start }
    }
  }

  return null
}

const resolveExplicitSelectionRange = () => {
  if (!editor.value) return null
  const { selection } = editor.value.state
  const currentFrom = Number(selection?.from || 0)
  const currentTo = Number(selection?.to || 0)

  if (currentTo > currentFrom) {
    return { from: currentFrom, to: currentTo }
  }

  const savedFrom = Number(lastEditorSelection.value?.from || 0)
  const savedTo = Number(lastEditorSelection.value?.to || 0)
  if (savedTo > savedFrom) {
    return { from: savedFrom, to: savedTo }
  }

  return null
}

const applyTextStyleAttrs = (nextAttrs) => {
  if (!editor.value) return
  const currentAttrs = editor.value.getAttributes('textStyle') || {}
  const mergedAttrs = {
    ...currentAttrs,
    ...nextAttrs
  }
  const range = resolveTextStyleRange()
  const chain = editor.value.chain().focus()

  if (range?.to > range?.from) {
    chain
      .setTextSelection({ from: range.from, to: range.to })
      .setMark('textStyle', mergedAttrs)
      .setTextSelection({ from: range.restoreFrom, to: range.restoreFrom })
      .run()
  } else {
    chain.setMark('textStyle', mergedAttrs).run()
  }

  form.content = editor.value.getHTML()
  htmlSource.value = form.content
  syncTextStyleState()
}

const editor = useEditor({
  extensions: [
    StarterKit,
    TextStyleExtension,
    SimpleLinkExtension,
    SimpleImageExtension,
    Placeholder.configure({
      placeholder: '这里直接编辑邮件内容，看到的就是邮件样子。'
    })
  ],
  content: '',
  editorProps: {
    attributes: {
      class: 'fm-mail-editor prose prose-sm max-w-none focus:outline-none'
    }
  },
  onUpdate: ({ editor }) => {
    if (syncingContent.value) return
    form.content = editor.getHTML()
    htmlSource.value = form.content
  },
  onSelectionUpdate: ({ editor }) => {
    lastEditorSelection.value = {
      from: editor.state.selection.from,
      to: editor.state.selection.to
    }
    syncTextStyleState()
    window.requestAnimationFrame(() => syncImageResizeBox())
  }
})

const syncImageResizeBox = () => {
  if (!editorWrapRef.value) return
  const selected = editorWrapRef.value.querySelector('.ProseMirror-selectednode')
  if (!(selected instanceof HTMLImageElement)) {
    imageResize.visible = false
    return
  }
  const wrapRect = editorWrapRef.value.getBoundingClientRect()
  const imgRect = selected.getBoundingClientRect()
  imageResize.left = imgRect.left - wrapRect.left + editorWrapRef.value.scrollLeft
  imageResize.top = imgRect.top - wrapRect.top + editorWrapRef.value.scrollTop
  imageResize.width = imgRect.width
  imageResize.height = imgRect.height
  imageResize.visible = true
}

const syncForm = (item = {}) => {
  Object.assign(form, createDefaultForm(), {
    id: item.id || null,
    template_id: item.template_id || '',
    name: item.name || '',
    scene: item.scene || item.name || '',
    subject: item.subject || '',
    content: String(item.content || '').trim() || '<p></p>',
    variables: item.variables || []
  })
  customVariables.value = (item.variables || []).filter((value) => value && !LEGACY_RESERVED_VARIABLES.has(String(value)))
  customVariableInput.value = ''
  reviewResult.value = item.last_review || null
  if (editor.value) {
    syncingContent.value = true
    editor.value.commands.setContent(form.content || '<p></p>', false)
    syncingContent.value = false
    syncTextStyleState()
  }
  htmlSource.value = form.content || '<p></p>'
}

const addCustomVariable = () => {
  const normalized = String(customVariableInput.value || '').trim().replace(/[{}]/g, '')
  if (!normalized) return
  if (!/^[\u4e00-\u9fa5a-zA-Z][\u4e00-\u9fa5a-zA-Z0-9_]*$/.test(normalized)) {
    showMessage('变量名可用中文、英文、数字、下划线，不能用空格和符号', 'warning')
    return
  }
  if (LEGACY_RESERVED_VARIABLES.has(normalized)) {
    showMessage('这个变量名已被系统占用', 'warning')
    return
  }
  if (customVariables.value.includes(normalized)) {
    customVariableInput.value = ''
    return
  }
  customVariables.value = [...customVariables.value, normalized]
  customVariableInput.value = ''
}

const removeCustomVariable = (name) => {
  customVariables.value = customVariables.value.filter((item) => item !== name)
}

const insertVariableToken = (text) => {
  if (editorMode.value === 'code') {
    const next = `${htmlSource.value || ''}${text}`
    htmlSource.value = next
    handleHtmlSourceInput()
    return
  }
  editor.value?.chain().focus().insertContent(text).run()
}

const triggerImageUpload = () => {
  if (editorMode.value === 'code' && htmlSourceRef.value) {
    lastCodeSelection.value = {
      start: htmlSourceRef.value.selectionStart || 0,
      end: htmlSourceRef.value.selectionEnd || 0
    }
  }
  imageInputRef.value?.click?.()
}

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const normalizeLinkUrl = (value) => {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/^(https?:\/\/|mailto:|tel:|\/)/i.test(text)) return text
  return `https://${text}`
}

const getSelectedEditorText = () => {
  if (!editor.value) return ''
  const range = resolveExplicitSelectionRange()
  if (!range?.to || range.to <= range.from) return ''
  return String(editor.value.state.doc.textBetween(range.from, range.to, ' ') || '').trim()
}

const openLinkModal = () => {
  if (editorMode.value === 'code' && htmlSourceRef.value) {
    lastCodeSelection.value = {
      start: htmlSourceRef.value.selectionStart || 0,
      end: htmlSourceRef.value.selectionEnd || 0
    }
  }
  linkForm.url = ''
  linkForm.text = editorMode.value === 'code' ? '' : getSelectedEditorText()
  linkModalVisible.value = true
}

const handleInsertLink = () => {
  const normalizedUrl = normalizeLinkUrl(linkForm.url)
  if (!normalizedUrl) {
    showMessage('先填写链接地址', 'warning')
    return
  }

  const selectedText = editorMode.value === 'code' ? '' : getSelectedEditorText()
  const displayText = String(linkForm.text || '').trim() || selectedText || normalizedUrl
  const snippet = `<a href="${escapeHtml(normalizedUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(displayText)}</a>`

  if (editorMode.value === 'code') {
    insertIntoCodeAtCursor(snippet)
  } else if (editor.value) {
    const range = resolveExplicitSelectionRange()
    const chain = editor.value.chain().focus()
    if (range?.to > range?.from) {
      chain
        .setTextSelection({ from: range.from, to: range.to })
        .insertContent(snippet)
        .run()
    } else {
      chain.insertContent(snippet).run()
    }
    form.content = editor.value.getHTML()
    htmlSource.value = form.content
  }

  linkModalVisible.value = false
  linkForm.url = ''
  linkForm.text = ''
}

const applyFontSize = (value) => {
  applyTextStyleAttrs({
    fontSize: String(value || '14px')
  })
}

const applyTextColor = (value) => {
  applyTextStyleAttrs({
    color: String(value || '#374151')
  })
}

const toggleBold = () => {
  editor.value?.chain().focus().toggleBold().run()
}

const toggleItalic = () => {
  editor.value?.chain().focus().toggleItalic().run()
}

const toggleBulletList = () => {
  editor.value?.chain().focus().toggleBulletList().run()
}

const toggleOrderedList = () => {
  editor.value?.chain().focus().toggleOrderedList().run()
}

const insertDivider = () => {
  editor.value?.chain().focus().setHorizontalRule().run()
}

const resizeSelectedImage = (width) => {
  if (!editor.value) return
  const { selection } = editor.value.state
  const node = selection?.node
  if (!node || node.type?.name !== 'image') {
    showMessage('先点一下图片再调大小', 'warning')
    return
  }
  const attrs = node.attrs || {}
  editor.value
    .chain()
    .focus()
    .updateAttributes('image', {
      src: attrs.src || '',
      alt: attrs.alt || '',
      title: attrs.title || '',
      style: `width:${width};max-width:100%;height:auto;border-radius:12px;`
    })
    .run()
}

const updateSelectedImageWidth = (widthPx) => {
  if (!editor.value) return
  const { selection } = editor.value.state
  const node = selection?.node
  if (!node || node.type?.name !== 'image') return
  const nextWidth = Math.max(80, Math.round(widthPx))
  const attrs = node.attrs || {}
  editor.value
    .chain()
    .focus()
    .updateAttributes('image', {
      src: attrs.src || '',
      alt: attrs.alt || '',
      title: attrs.title || '',
      style: `width:${nextWidth}px;max-width:100%;height:auto;border-radius:12px;`
    })
    .run()
  requestAnimationFrame(() => syncImageResizeBox())
}

const handleImageResizeMove = (event) => {
  if (!activeResize) return
  const deltaX = event.clientX - activeResize.startX
  const direction = activeResize.handle.includes('w') ? -1 : 1
  updateSelectedImageWidth(activeResize.startWidth + deltaX * direction)
}

const stopImageResize = () => {
  activeResize = null
  window.removeEventListener('mousemove', handleImageResizeMove)
  window.removeEventListener('mouseup', stopImageResize)
}

const startImageResize = (event, handle) => {
  if (!imageResize.visible) return
  activeResize = {
    handle,
    startX: event.clientX,
    startWidth: imageResize.width
  }
  window.addEventListener('mousemove', handleImageResizeMove)
  window.addEventListener('mouseup', stopImageResize)
}

const clearContent = () => {
  editor.value?.commands.setContent('<p></p>', false)
  form.content = '<p></p>'
  htmlSource.value = '<p></p>'
  imageResize.visible = false
}

const revealInsertedImage = async (url) => {
  await nextTick()
  const host = document.querySelector('.mail-template-editor')
  const targets = host?.querySelectorAll(`img[src="${url}"]`)
  const target = targets?.[targets.length - 1]
  if (!target) return
  target.classList.add('mail-template-image-inserted')
  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  window.setTimeout(() => {
    target.classList.remove('mail-template-image-inserted')
  }, 1600)
}

const handleHtmlSourceInput = () => {
  form.content = htmlSource.value
  if (editor.value) {
    syncingContent.value = true
    editor.value.commands.setContent(htmlSource.value || '<p></p>', false)
    syncingContent.value = false
  }
}

const insertIntoCodeAtCursor = (snippet) => {
  const text = htmlSource.value || ''
  const start = lastCodeSelection.value.start ?? text.length
  const end = lastCodeSelection.value.end ?? start
  const next = `${text.slice(0, start)}${snippet}${text.slice(end)}`
  htmlSource.value = next
  form.content = next
  if (editor.value) {
    syncingContent.value = true
    editor.value.commands.setContent(next || '<p></p>', false)
    syncingContent.value = false
  }
  requestAnimationFrame(() => {
    if (!htmlSourceRef.value) return
    const position = start + snippet.length
    htmlSourceRef.value.focus()
    htmlSourceRef.value.setSelectionRange(position, position)
    lastCodeSelection.value = { start: position, end: position }
  })
}

const handleImageUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  uploadingImage.value = true
  try {
    const uploaded = await uploadImageFile(file, { purpose: 'email-reach' })
    const snippet = `<p></p><img src="${uploaded.url}" alt="template-image" style="max-width:100%;height:auto;border-radius:12px;" /><p></p>`
    if (editorMode.value === 'code') {
      insertIntoCodeAtCursor(snippet)
    } else if (editor.value) {
      const selection = lastEditorSelection.value
      editor.value
        .chain()
        .focus()
        .setTextSelection({
          from: selection.from || editor.value.state.selection.from,
          to: selection.to || editor.value.state.selection.to
        })
        .insertContent([
          {
            type: 'image',
            attrs: {
              src: uploaded.url,
              alt: file.name || 'template-image',
              style: 'width:360px;max-width:100%;height:auto;border-radius:12px;'
            }
          },
          {
            type: 'paragraph'
          }
        ])
        .run()
    }
    editorMode.value = 'rich'
    await revealInsertedImage(uploaded.url)
    showMessage('图片已按当前位置插入正文', 'success')
  } catch (error) {
    showMessage(error?.message || '图片上传失败', 'error')
  } finally {
    uploadingImage.value = false
    if (event.target) event.target.value = ''
  }
}

const handleGenerate = async () => {
  generating.value = true
  try {
    const res = await emailReachApi.generateTemplate({
      scene: form.name || form.scene || '邮件通知',
      helper_prompt: form.helper_prompt,
      existing_subject: form.subject,
      existing_content: form.content,
      variables: customVariables.value
    })
    if (res.code === 0) {
      form.subject = res.data.subject || form.subject
      form.content = String(res.data.content || form.content).trim()
      customVariables.value = [
        ...new Set([
          ...customVariables.value,
          ...(Array.isArray(res.data.variables) ? res.data.variables : []),
          ...extractTemplateVariables(`${form.subject || ''}\n${form.content || ''}`)
        ].filter(Boolean))
      ]
      htmlSource.value = form.content
      if (editor.value) {
        syncingContent.value = true
        editor.value.commands.setContent(form.content || '<p></p>', false)
        syncingContent.value = false
      }
      aiModalVisible.value = false
      showMessage('AI生成成功', 'success')
      return
    }
    showMessage(res.message || 'AI生成失败', 'error')
  } finally {
    generating.value = false
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    syncVariablesFromContent()
    const payload = {
      name: form.name || '未命名模板',
      scene: form.name || form.scene,
      subject: form.subject,
      content: buildManagedContent(),
      variables: customVariables.value,
      auto_review: true
    }
    const res = form.id
      ? await emailReachApi.updateTemplate(form.id, payload)
      : await emailReachApi.createTemplate(payload)
    if (res.code === 0) {
      showMessage('模板已保存', 'success')
      router.push('/user/email-reach/templates')
      return
    }
    reviewResult.value = res.data?.review_result || null
    if (reviewResult.value?.approved === false) {
      reviewFailModalVisible.value = true
      return
    }
    showMessage(res.message || '保存失败', 'error')
  } finally {
    saving.value = false
  }
}

const loadAccess = async () => {
  const accessRes = await emailReachApi.getAccessSummary()
  accessLoaded.value = true
  if (accessRes.code === 0) {
    access.value = accessRes.data
  } else {
    showMessage(accessRes.message || '加载权限失败', 'error')
  }
}

const loadTemplate = async () => {
  if (!isEdit.value) {
    syncForm()
    return
  }
  const res = await emailReachApi.getTemplates()
  if (res.code !== 0) {
    showMessage(res.message || '加载模板失败', 'error')
    return
  }
  const item = (res.data.items || []).find((row) => String(row.template_id || '') === templateId.value)
  if (!item) {
    showMessage('模板不存在', 'warning')
    router.push('/user/email-reach/templates')
    return
  }
  syncForm(item)
}

onMounted(async () => {
  await loadAccess()
  if (!canOperate.value) return
  await loadTemplate()
  nextTick(() => {
    editorWrapRef.value?.addEventListener('click', syncImageResizeBox)
    editorWrapRef.value?.addEventListener('scroll', syncImageResizeBox, { passive: true })
    window.addEventListener('resize', syncImageResizeBox)
  })
})

onBeforeUnmount(() => {
  stopImageResize()
  editorWrapRef.value?.removeEventListener('click', syncImageResizeBox)
  editorWrapRef.value?.removeEventListener('scroll', syncImageResizeBox)
  window.removeEventListener('resize', syncImageResizeBox)
  editor.value?.destroy()
})
</script>

<style scoped>
:deep(.mail-template-editor-wrap) {
  position: relative;
  min-height: 500px;
}

:deep(.mail-template-code) {
  min-height: 500px;
  height: 500px;
  width: 100%;
  border: 0;
  padding: 16px;
  resize: none;
  outline: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 13px;
  line-height: 1.8;
  color: rgb(55 65 81);
}

:deep(.mail-template-preview) {
  min-height: 500px;
  padding: 16px;
  background: white;
}

:deep(.mail-template-editor .ProseMirror) {
  min-height: 500px;
  padding: 14px 16px;
  color: rgb(55 65 81);
  font-size: 14px;
  line-height: 1.8;
  background: white;
}

:deep(.mail-template-editor .ProseMirror:focus) {
  outline: none;
}

:deep(.mail-template-editor .ProseMirror p) {
  margin: 0 0 0.85rem;
}

:deep(.mail-template-editor .ProseMirror p:last-child) {
  margin-bottom: 0;
}

:deep(.mail-template-editor .ProseMirror ul),
:deep(.mail-template-editor .ProseMirror ol) {
  margin: 0.75rem 0 0.75rem 1.25rem;
}

:deep(.mail-template-editor .ProseMirror img) {
  max-width: 100%;
  height: auto;
  border-radius: 12px;
}

:deep(.mail-template-editor .ProseMirror .ProseMirror-selectednode) {
  outline: 2px solid rgb(34 197 94);
  outline-offset: 2px;
}

:deep(.mail-template-editor .ProseMirror img.mail-template-image-inserted) {
  outline: 3px solid rgb(34 197 94 / 0.45);
  outline-offset: 4px;
  transition: outline 0.2s ease;
}

:deep(.mail-template-editor .ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  color: rgb(148 163 184);
  pointer-events: none;
}

:deep(.mail-image-resize-box) {
  position: absolute;
  border: 1px solid rgb(34 197 94);
  pointer-events: none;
  box-sizing: border-box;
}

:deep(.mail-image-resize-handle) {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  background: rgb(34 197 94);
  border: 2px solid #fff;
  pointer-events: auto;
}

:deep(.mail-image-resize-handle--nw) {
  top: -6px;
  left: -6px;
  cursor: nwse-resize;
}

:deep(.mail-image-resize-handle--ne) {
  top: -6px;
  right: -6px;
  cursor: nesw-resize;
}

:deep(.mail-image-resize-handle--sw) {
  bottom: -6px;
  left: -6px;
  cursor: nesw-resize;
}

:deep(.mail-image-resize-handle--se) {
  right: -6px;
  bottom: -6px;
  cursor: nwse-resize;
}
</style>
