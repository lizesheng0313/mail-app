<template>
  <BaseModal
    :model-value="visible"
    :title="form.id ? '编辑模板' : '新建模板'"
    size="full"
    content-class="rounded-[28px] border border-slate-200 shadow-2xl"
    body-class="overflow-y-auto px-6 py-5"
    :confirm-text="saving ? '保存中...' : '确定'"
    :confirm-loading="saving"
    :confirm-disabled="!canOperate"
    @update:modelValue="handleVisibleChange"
    @confirm="handleSave"
    @cancel="handleClose"
    @close="handleClose"
  >
    <div class="space-y-5">
      <div class="grid gap-4 md:grid-cols-2">
        <BaseInput v-model="form.name" label="模板名称" placeholder="例如：订单支付通知" />
        <BaseInput v-model="form.scene" label="场景" placeholder="例如：下单成功、发货提醒、会员活动" />
        <div>
          <label class="mb-2 block text-sm font-medium text-slate-900">收件人来源</label>
          <CustomSelect v-model="form.recipient_source" :options="recipientSourceOptions" placeholder="选择收件人来源" />
        </div>
      </div>

      <BaseInput v-model="form.subject" label="邮件主题" placeholder="输入邮件主题" />

      <div class="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
        <div class="border-b border-slate-100 bg-white px-4 py-3">
          <div class="mb-2 flex items-center justify-between gap-3">
            <div class="text-sm font-medium text-slate-900">邮件内容</div>
            <div class="text-xs text-slate-500">系统变量自动带，自定义变量自己加</div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <BaseInput
              v-model="customVariableInput"
              placeholder="例如：活动名称"
              class="w-56"
            />
            <button
              type="button"
              :class="secondaryButtonClass"
              @click="addCustomVariable"
            >
              添加变量
            </button>
            <span
              v-for="item in customVariables"
              :key="item"
              class="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200"
            >
              {{ item }}
              <button type="button" class="text-gray-400 hover:text-red-500" @click="removeCustomVariable(item)">×</button>
            </span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-4 py-3">
          <button
            v-for="item in variableButtons"
            :key="item.value"
            type="button"
            :class="tokenButtonClass"
            @click="insertAtCursor(item.value)"
          >
            {{ item.label }}
            </button>

          <div class="ml-auto flex items-center gap-2">
            <input
              ref="imageInputRef"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleImageUpload"
            />
            <button
              type="button"
              @click="toggleBold"
              :class="toolbarButtonClass(editor?.isActive('bold'))"
            >
              加粗
            </button>
            <button
              type="button"
              @click="toggleItalic"
              :class="toolbarButtonClass(editor?.isActive('italic'))"
            >
              斜体
            </button>
            <button
              type="button"
              @click="toggleBulletList"
              :class="toolbarButtonClass(editor?.isActive('bulletList'))"
            >
              列表
            </button>
            <button
              type="button"
              @click="toggleOrderedList"
              :class="toolbarButtonClass(editor?.isActive('orderedList'))"
            >
              编号
            </button>
            <button
              type="button"
              @click="insertDivider"
              :class="toolbarButtonClass(false)"
            >
              分割线
            </button>
            <button
              type="button"
              :class="toolbarButtonClass(false)"
              :disabled="uploadingImage"
              @click="triggerImageUpload"
            >
              {{ uploadingImage ? '上传中...' : '上传图片' }}
            </button>
            <button
              type="button"
              :class="toolbarButtonClass(false)"
              @click="clearContent"
            >
              清空
            </button>
          </div>
        </div>

        <EditorContent
          v-if="editor"
          :editor="editor"
          class="mail-template-editor"
        />

        <div class="border-t border-slate-100 bg-slate-50 px-4 py-3">
          <label class="mb-2 block text-sm font-medium text-slate-900">AI辅助说明</label>
          <div class="flex items-start gap-3">
            <textarea
              v-model="form.helper_prompt"
              rows="3"
              class="min-h-[88px] flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-700 focus:border-primary-500 focus:outline-none"
              placeholder="例如：语气更正式、突出优惠、适合老客户、保留下单变量"
            />
            <button
              type="button"
              class="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!canOperate || generating"
              @click="handleGenerate"
            >
              {{ generating ? 'AI生成中...' : 'AI辅助生成' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="reviewResult" class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div class="flex items-center justify-between gap-3">
          <div class="text-sm font-medium text-slate-900">审核结果</div>
          <span class="rounded-full px-2 py-1 text-xs" :class="reviewResult.approved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
            {{ reviewResult.approved ? '通过' : '未通过' }}
          </span>
        </div>
        <div class="mt-2 text-sm text-slate-700">{{ reviewResult.summary || '-' }}</div>
        <div v-if="reviewRows.length" class="mt-3 space-y-2">
          <div v-for="item in reviewRows" :key="item.key" class="rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
            <span class="font-medium text-slate-900">{{ item.type }}：</span>{{ item.content }}
          </div>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import BaseModal from '@/components/BaseModal/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import emailReachApi from '@/api/emailReach'
import { uploadImageFile } from '@/utils/imageUpload'
import { showMessage } from '@/utils/message'

const props = defineProps({
  visible: { type: Boolean, default: false },
  template: { type: Object, default: null },
  canOperate: { type: Boolean, default: false }
})

const emit = defineEmits(['update:visible', 'saved'])

const saving = ref(false)
const generating = ref(false)
const uploadingImage = ref(false)
const reviewResult = ref(null)
const imageInputRef = ref(null)
const customVariableInput = ref('')
const customVariables = ref([])
const syncingContent = ref(false)
const secondaryButtonClass = 'rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50'
const tokenButtonClass = 'rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100'

const toolbarButtonClass = (active = false) =>
  active
    ? 'rounded-xl border border-primary-500 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-50'
    : 'rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'

const recipientSourceOptions = [
  { label: '注册用户', value: 'registered_users' },
  { label: '订阅用户', value: 'subscribed_users' },
  { label: '已有客户', value: 'customers' }
]

const createDefaultForm = () => ({
  id: null,
  name: '',
  scene: '',
  subject: '',
  content: '',
  helper_prompt: '',
  recipient_source: 'registered_users',
  variables: []
})

const form = reactive(createDefaultForm())

const allVariables = computed(() => {
  const custom = customVariables.value.map((item) => `{{${item}}}`)
  return [...new Set(custom)]
})

const extractTemplateVariables = (text) => {
  const source = String(text || '')
  const doubleMatches = [...source.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)]
    .map((item) => String(item[1] || '').trim())
  const singleMatches = [...source.matchAll(/(^|[^{])\{\s*([\u4e00-\u9fa5a-zA-Z_][\u4e00-\u9fa5a-zA-Z0-9_]{0,48})\s*\}(?!})/g)]
    .map((item) => String(item[2] || '').trim())
  return [...new Set([...doubleMatches, ...singleMatches].filter(Boolean))]
}

const mergeVariables = (...groups) => [
  ...new Set(groups.flat().map((item) => String(item || '').trim()).filter(Boolean))
]

const variableButtons = computed(() =>
  allVariables.value.map((item) => ({
    label: item.replace(/[{}]/g, ''),
    value: item
  }))
)

const buildManagedContent = () => {
  const text = String(form.content || '').trim()
  if (!text) {
    return '<p></p><p style="margin-top:24px;font-size:12px;color:#6b7280;">如不想继续接收邮件，请点击退订：<a href=\"{{unsubscribe_url}}\">{{unsubscribe_url}}</a></p>'
  }
  if (text.includes('{{unsubscribe_url}}')) {
    return text
  }
  return `${text}<p style="margin-top:24px;font-size:12px;color:#6b7280;">如不想继续接收邮件，请点击退订：<a href="{{unsubscribe_url}}">{{unsubscribe_url}}</a></p>`
}

const editor = useEditor({
  extensions: [
    StarterKit,
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
  }
})

const syncForm = () => {
  const item = props.template || {}
  Object.assign(form, createDefaultForm(), {
    id: item.id || null,
    name: item.name || '',
    scene: item.scene || '',
    subject: item.subject || '',
    content: String(item.content || '').trim() || '<p></p>',
    recipient_source: item.recipient_source || 'registered_users',
    variables: item.variables || []
  })
  customVariables.value = (item.variables || []).filter(Boolean)
  customVariableInput.value = ''
  reviewResult.value = item.last_review || null
  if (editor.value) {
    syncingContent.value = true
    editor.value.commands.setContent(form.content || '<p></p>', false)
    syncingContent.value = false
  }
}

watch(() => props.visible, (value) => {
  if (value) syncForm()
})

watch(() => props.template, () => {
  if (props.visible) syncForm()
})

const reviewRows = computed(() => {
  if (!reviewResult.value) return []
  const rows = []
  ;(reviewResult.value.issues || []).forEach((item, index) => rows.push({ key: `issue-${index}`, type: '问题', content: item }))
  ;(reviewResult.value.required_fixes || []).forEach((item, index) => rows.push({ key: `fix-${index}`, type: '必须修改', content: item }))
  ;(reviewResult.value.suggestions || []).forEach((item, index) => rows.push({ key: `suggestion-${index}`, type: '建议', content: item }))
  return rows
})

const handleVisibleChange = (value) => emit('update:visible', value)
const handleClose = () => emit('update:visible', false)

const addCustomVariable = () => {
  const normalized = String(customVariableInput.value || '').trim().replace(/[{}]/g, '')
  if (!normalized) return
  if (!/^[\u4e00-\u9fa5a-zA-Z][\u4e00-\u9fa5a-zA-Z0-9_]*$/.test(normalized)) {
    showMessage('变量名可用中文、英文、数字、下划线，不能用空格和符号', 'warning')
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

const insertAtCursor = (text) => {
  if (!editor.value) return
  editor.value.chain().focus().insertContent(text).run()
}

const triggerImageUpload = () => {
  imageInputRef.value?.click?.()
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

const clearContent = () => {
  editor.value?.commands.setContent('<p></p>', false)
  form.content = '<p></p>'
}

const handleImageUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  uploadingImage.value = true
  try {
    const uploaded = await uploadImageFile(file, { purpose: 'email-reach' })
    editor.value?.chain().focus().insertContent(`<div style="margin:0 0 16px;"><img src="${uploaded.url}" alt="${file.name || 'template-image'}" style="max-width:100%;height:auto;border-radius:12px;" /></div>`).run()
    showMessage('图片已插入正文', 'success')
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
      scene: form.scene || form.name || '邮件通知',
      recipient_source: form.recipient_source,
      helper_prompt: form.helper_prompt,
      existing_subject: form.subject,
      existing_content: form.content,
      variables: allVariables.value.map((item) => item.replace(/[{}]/g, ''))
    })
    if (res.code === 0) {
      form.subject = res.data.subject || form.subject
      form.content = String(res.data.content || form.content).trim()
      customVariables.value = mergeVariables(
        customVariables.value,
        Array.isArray(res.data.variables) ? res.data.variables : [],
        extractTemplateVariables(`${form.subject || ''}\n${form.content || ''}`)
      )
      form.variables = customVariables.value
      if (editor.value) {
        syncingContent.value = true
        editor.value.commands.setContent(form.content || '<p></p>', false)
        syncingContent.value = false
      }
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
    const managedContent = buildManagedContent()
    const variables = mergeVariables(
      customVariables.value,
      extractTemplateVariables(`${form.subject || ''}\n${managedContent || ''}`)
    )
    const payload = {
      name: form.name || '未命名模板',
      scene: form.scene,
      subject: form.subject,
      content: managedContent,
      recipient_source: form.recipient_source,
      variables,
      auto_review: true
    }
    const res = form.id
      ? await emailReachApi.updateTemplate(form.id, payload)
      : await emailReachApi.createTemplate(payload)
    if (res.code === 0) {
      showMessage(form.id ? '模板已保存' : '模板创建成功', 'success')
      emit('saved')
      handleClose()
      return
    }
    reviewResult.value = res.data?.review_result || null
    if (reviewResult.value?.approved === false) {
      showMessage(res.message || '审核未通过，请按提示修改', 'error')
      return
    }
    showMessage(res.message || '保存失败', 'error')
  } finally {
    saving.value = false
  }
}

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<style scoped>
:deep(.mail-template-editor .ProseMirror) {
  min-height: 420px;
  padding: 16px;
  color: rgb(55 65 81);
  font-size: 14px;
  line-height: 1.8;
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

:deep(.mail-template-editor .ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  color: rgb(148 163 184);
  pointer-events: none;
}
</style>
