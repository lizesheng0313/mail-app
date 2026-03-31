<template>
  <div class="min-h-screen bg-white">
    <!-- 顶部导航栏 -->
    <div class="h-14 px-6 flex items-center justify-between border-b">
      <div class="flex items-center gap-3">
        <button @click="handleCancel" class="text-gray-600 hover:text-gray-900">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 class="text-sm font-medium">{{ isEditMode ? t('publishWorkflow.titleEdit') : t('publishWorkflow.titleCreate') }}</h1>
          <p class="text-xs text-gray-500">{{ workflowName }}</p>
        </div>
      </div>
      <div class="flex gap-2">
        <button
          @click="generateWithAI"
          :disabled="generating"
          class="px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
        >
          {{ generating ? t('publishWorkflow.generating') : t('publishWorkflow.generateWithAI') }}
        </button>
        <button
          @click="handleSubmit"
          :disabled="submitting"
          class="px-4 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
        >
          {{ submitting ? (isEditMode ? t('publishWorkflow.saving') : t('publishWorkflow.submitting')) : (isEditMode ? t('publishWorkflow.save') : t('publishWorkflow.submit')) }}
        </button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="flex" style="height: calc(100vh - 3.5rem)">
      <!-- 左侧：富文本编辑器 -->
      <div class="flex-1 flex flex-col border-r">
        <!-- 工具栏 -->
        <div v-if="editor" class="flex items-center gap-1 px-4 py-2 border-b flex-wrap">
          <!-- 标题 -->
          <div class="w-28">
            <CustomSelect
              v-model="headingLevel"
              :options="headingOptions"
              :placeholder="t('publishWorkflow.body')"
              @update:modelValue="setHeading"
            />
          </div>

          <div class="w-px h-4 bg-gray-300 mx-1"></div>

          <!-- 加粗 -->
          <button
            @click="editor.chain().focus().toggleBold().run()"
            :class="{ 'bg-blue-100': editor.isActive('bold') }"
            class="p-1.5 hover:bg-gray-100 rounded"
            :title="t('publishWorkflow.bold')"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11 5H7v10h4a5 5 0 000-10zm-1 8H9V7h1a3 3 0 010 6z"/>
            </svg>
          </button>

          <!-- 斜体 -->
          <button
            @click="editor.chain().focus().toggleItalic().run()"
            :class="{ 'bg-blue-100': editor.isActive('italic') }"
            class="p-1.5 hover:bg-gray-100 rounded"
            :title="t('publishWorkflow.italic')"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M12 3l-2 14h2l2-14h-2z"/>
            </svg>
          </button>

          <!-- 删除线 -->
          <button
            @click="editor.chain().focus().toggleStrike().run()"
            :class="{ 'bg-blue-100': editor.isActive('strike') }"
            class="p-1.5 hover:bg-gray-100 rounded"
            :title="t('publishWorkflow.strike')"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 3v2H6v2h8V5h-4V3h4a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h4zm0 8a2 2 0 100 4 2 2 0 000-4z"/>
            </svg>
          </button>

          <div class="w-px h-4 bg-gray-300 mx-1"></div>

          <!-- 无序列表 -->
          <button
            @click="editor.chain().focus().toggleBulletList().run()"
            :class="{ 'bg-blue-100': editor.isActive('bulletList') }"
            class="p-1.5 hover:bg-gray-100 rounded"
            :title="t('publishWorkflow.bulletList')"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4h1v1H3V4zm3 0h11v1H6V4zM3 9h1v1H3V9zm3 0h11v1H6V9zm-3 5h1v1H3v-1zm3 0h11v1H6v-1z"/>
            </svg>
          </button>

          <!-- 有序列表 -->
          <button
            @click="editor.chain().focus().toggleOrderedList().run()"
            :class="{ 'bg-blue-100': editor.isActive('orderedList') }"
            class="p-1.5 hover:bg-gray-100 rounded"
            :title="t('publishWorkflow.orderedList')"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4h1v3H3V4zm0 5h1v3H3V9zm0 5h1v3H3v-3zm3-9h11v1H6V5zm0 5h11v1H6v-1zm0 5h11v1H6v-1z"/>
            </svg>
          </button>

          <div class="w-px h-4 bg-gray-300 mx-1"></div>

          <!-- 引用 -->
          <button
            @click="editor.chain().focus().toggleBlockquote().run()"
            :class="{ 'bg-blue-100': editor.isActive('blockquote') }"
            class="p-1.5 hover:bg-gray-100 rounded"
            :title="t('publishWorkflow.quote')"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z"/>
            </svg>
          </button>

          <!-- 代码块 -->
          <button
            @click="editor.chain().focus().toggleCodeBlock().run()"
            :class="{ 'bg-blue-100': editor.isActive('codeBlock') }"
            class="p-1.5 hover:bg-gray-100 rounded"
            :title="t('publishWorkflow.codeBlock')"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13.707 3.293a1 1 0 010 1.414L9.414 9l4.293 4.293a1 1 0 01-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z"/>
            </svg>
          </button>

          <div class="w-px h-4 bg-gray-300 mx-1"></div>

          <!-- 分割线 -->
          <button
            @click="editor.chain().focus().setHorizontalRule().run()"
            class="p-1.5 hover:bg-gray-100 rounded"
            :title="t('publishWorkflow.divider')"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 10h14v1H3v-1z"/>
            </svg>
          </button>

          <!-- 撤销 -->
          <button
            @click="editor.chain().focus().undo().run()"
            :disabled="!editor.can().undo()"
            class="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30"
            :title="t('publishWorkflow.undo')"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"/>
            </svg>
          </button>

          <!-- 重做 -->
          <button
            @click="editor.chain().focus().redo().run()"
            :disabled="!editor.can().redo()"
            class="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30"
            :title="t('publishWorkflow.redo')"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M12.293 3.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 9H9a5 5 0 00-5 5v2a1 1 0 11-2 0v-2a7 7 0 017-7h5.586l-2.293-2.293a1 1 0 010-1.414z"/>
            </svg>
          </button>
        </div>

        <editor-content :editor="editor" class="flex-1 overflow-y-auto p-6" />
      </div>

      <!-- 右侧：配置面板 -->
      <div class="w-80 border-l p-6 overflow-y-auto">
        <div class="space-y-4">


          <!-- 分类 -->
          <div>
            <label class="block text-xs text-gray-700 mb-1.5">{{ t('publishWorkflow.category') }} <span class="text-red-500">*</span></label>
            <CustomSelect v-model="formData.category" :options="categoryOptions" :placeholder="t('publishWorkflow.select')" />
          </div>

          <!-- 定价模式 -->
          <div>
            <label class="block text-xs text-gray-700 mb-1.5">{{ t('publishWorkflow.pricingMode') }} <span class="text-red-500">*</span></label>
            <div class="space-y-1.5">
              <label
                v-for="option in pricingOptions"
                :key="option.value"
                class="flex items-start p-2 border rounded cursor-pointer hover:bg-gray-50"
                :class="formData.pricingModel === option.value ? 'border-blue-500 bg-blue-50' : ''"
              >
                <input type="radio" v-model="formData.pricingModel" :value="option.value" class="mt-0.5" />
                <div class="ml-2">
                  <div class="text-xs font-medium">{{ option.label }}</div>
                  <p class="text-xs text-gray-500">{{ option.desc }}</p>
                </div>
              </label>
            </div>
          </div>

          <!-- 价格 -->
          <div v-if="formData.pricingModel !== 'free'">
            <label class="block text-xs text-gray-700 mb-1.5">{{ t('publishWorkflow.price') }} <span class="text-red-500">*</span></label>
            <div class="relative">
              <input
                v-model.number="formData.milkCoinPrice"
                type="number"
                min="0"
                placeholder="0"
                class="w-full px-3 py-2 pr-12 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span class="absolute right-3 top-2 text-sm text-gray-500">{{ t('publishWorkflow.coins') }}</span>
            </div>
            <div v-if="platformFeeRate > 0" class="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
              <p class="text-xs text-amber-800">
                {{ t('publishWorkflow.platformFeeNote', { rate: platformFeeRate }) }}
              </p>
              <p v-if="formData.milkCoinPrice > 0" class="text-xs text-amber-700 mt-1">
                {{ t('publishWorkflow.actualIncome', { amount: (formData.milkCoinPrice * (1 - platformFeeRate / 100)).toFixed(2) }) }}
              </p>
            </div>
          </div>

          <!-- 订阅周期 -->
          <div v-if="formData.pricingModel === 'subscription'">
            <label class="block text-xs text-gray-700 mb-1.5">{{ t('publishWorkflow.subscriptionPeriod') }} <span class="text-red-500">*</span></label>
            <CustomSelect v-model="formData.subscriptionPeriod" :options="periodOptions" :placeholder="t('publishWorkflow.select')" />
          </div>

          <!-- 启用库存管理 -->
          <div>
            <div class="flex items-start justify-between">
              <div class="flex-1 pr-3">
                <span class="text-xs font-medium text-gray-700">{{ t('publishWorkflow.inventoryEnabled') }}</span>
                <p class="text-xs text-gray-500 mt-0.5">{{ t('publishWorkflow.inventoryEnabledDesc') }}</p>
              </div>
              <!-- Switch Toggle -->
              <div 
                class="relative flex-shrink-0 inline-block w-11 h-6 cursor-pointer"
                @click="toggleInventory"
              >
                <div
                  class="block w-11 h-6 rounded-full transition-colors duration-200 ease-in-out"
                  :class="formData.inventoryEnabled ? 'bg-primary-600' : 'bg-gray-300'"
                >
                  <div
                    class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out shadow"
                    :class="{ 'translate-x-5': formData.inventoryEnabled }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 标签 -->
          <div>
            <label class="block text-xs text-gray-700 mb-1.5">{{ t('publishWorkflow.tags') }}</label>
            <div v-if="formData.tags.length" class="flex flex-wrap gap-1.5 mb-2">
              <span v-for="tag in formData.tags" :key="tag" class="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 rounded">
                {{ tag }}
                <button @click="removeTag(tag)" class="ml-1 text-gray-500">×</button>
              </span>
            </div>
            <div class="flex gap-1.5">
              <input
                v-model="tagInput"
                type="text"
                :placeholder="t('publishWorkflow.tagPlaceholder')"
                class="flex-1 px-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                @keyup.enter="addTag"
              />
              <button @click="addTag" class="px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200">{{ t('publishWorkflow.addTag') }}</button>
            </div>
          </div>

          <!-- 封面图 -->
          <div>
            <label class="block text-xs text-gray-700 mb-1.5">{{ t('publishWorkflow.coverImage') }}</label>
            <div v-if="formData.iconUrl" class="mb-2 text-center">
              <img :src="formData.iconUrl" class="w-full h-32 object-cover mx-auto rounded" />
            </div>
            <input ref="iconInput" type="file" accept="image/*" class="hidden" @change="handleIconUpload" />
            <button
              @click="$refs.iconInput.click()"
              :disabled="uploadingIcon"
              class="w-full px-3 py-2 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              {{ uploadingIcon ? t('publishWorkflow.uploading') : formData.iconUrl ? t('publishWorkflow.replace') : t('publishWorkflow.upload') }}
            </button>
          </div>

          <!-- 截图 -->
          <div>
            <label class="block text-xs text-gray-700 mb-1.5">{{ t('publishWorkflow.screenshots', { count: formData.screenshots.length }) }}</label>
            <div v-if="formData.screenshots.length" class="grid grid-cols-3 gap-2 mb-2">
              <div v-for="(url, index) in formData.screenshots" :key="index" class="relative group">
                <img :src="url" class="w-full h-16 object-cover rounded" />
                <button
                  @click="removeScreenshot(index)"
                  class="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-bl opacity-0 group-hover:opacity-100"
                >×</button>
              </div>
            </div>
            <input ref="screenshotInput" type="file" accept="image/*" multiple class="hidden" @change="handleScreenshotsUpload" />
            <button
              @click="$refs.screenshotInput.click()"
              :disabled="uploadingScreenshot || formData.screenshots.length >= 20"
              class="w-full px-3 py-2 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              {{ uploadingScreenshot ? t('publishWorkflow.uploading') : t('publishWorkflow.add') }}
            </button>
          </div>

        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { showMessage } from '@/utils/message'
import { getFeeConfig } from '@/api/milkCoin'
import { workflowApi } from '@/api/workflow'
import api from '@/services/api'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { t } = useI18n()

// 判断是否是管理员
const isAdmin = computed(() => userStore.user?.is_admin)

// Tiptap 编辑器
const editor = useEditor({
  extensions: [
    StarterKit,
    Placeholder.configure({
      placeholder: t('publishWorkflow.editorPlaceholder')
    })
  ],
  content: '',
  editorProps: {
    attributes: {
      class: 'prose prose-sm max-w-none focus:outline-none'
    }
  },
  onUpdate: ({ editor }) => {
    formData.value.longDescription = editor.getHTML()
  },
  onCreate: ({ editor }) => {
    console.log('✅ 编辑器已创建')
    // 如果表单数据中已经有内容，立即设置
    if (formData.value.longDescription) {
      editor.commands.setContent(formData.value.longDescription)
      console.log('✏️ 编辑器创建后立即设置内容')
    }
  }
})

// 标题选项
const headingLevel = ref('')
const headingOptions = [
  { label: t('publishWorkflow.body'), value: '' },
  { label: t('publishWorkflow.heading1'), value: '1' },
  { label: t('publishWorkflow.heading2'), value: '2' },
  { label: t('publishWorkflow.heading3'), value: '3' }
]

// 设置标题
const setHeading = (level) => {
  if (!editor.value) return
  if (level === '') {
    editor.value.chain().focus().setParagraph().run()
  } else {
    editor.value.chain().focus().toggleHeading({ level: parseInt(level) }).run()
  }
  headingLevel.value = level
}

// 工作流信息（从 history.state 获取）
const workflowId = ref(history.state.workflow_id || '')
const workflowName = ref(history.state.workflow_name || '')
const isEditMode = ref(history.state.edit_mode === true)

// 选项（管理员可以看到邮箱套餐分类）
const baseCategoryOptions = [
  { label: t('publishWorkflow.categoryAutomation'), value: 'automation' },
  { label: t('publishWorkflow.categoryAccount'), value: 'account' },
  { label: t('publishWorkflow.categoryDocument'), value: 'document' },
  { label: t('publishWorkflow.categoryOther'), value: 'other' }
]

const adminCategoryOptions = [
  { label: t('publishWorkflow.categoryMailbox'), value: 'mailbox' }
]

const categoryOptions = computed(() => {
  if (isAdmin.value) {
    return [...adminCategoryOptions, ...baseCategoryOptions]
  }
  return baseCategoryOptions
})

const pricingOptions = [
  {
    label: t('publishWorkflow.pricingFree'),
    value: 'free',
    desc: t('publishWorkflow.pricingFreeDesc'),
    badge: t('publishWorkflow.pricingFreeBadge'),
    badgeClass: 'bg-green-100 text-green-700'
  },
  {
    label: t('publishWorkflow.pricingPerUse'),
    value: 'per_use',
    desc: t('publishWorkflow.pricingPerUseDesc')
  },
  {
    label: t('publishWorkflow.pricingSubscription'),
    value: 'subscription',
    desc: t('publishWorkflow.pricingSubscriptionDesc')
  }
]

const periodOptions = [
  { label: t('publishWorkflow.periodMonthly'), value: 'monthly' },
  { label: t('publishWorkflow.periodYearly'), value: 'yearly' },
  { label: t('publishWorkflow.periodLifetime'), value: 'lifetime' }
]

// 表单数据
const formData = ref({
  category: '',
  tags: [],
  pricingModel: 'free',
  milkCoinPrice: 0,
  subscriptionPeriod: 'monthly', // monthly 或 yearly
  inventoryEnabled: false, // 是否启用库存管理
  iconUrl: '',
  screenshots: [],
  longDescription: ''
})

// 文件大小限制
const MAX_ICON_SIZE = 2 * 1024 * 1024 // 2MB
const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_SCREENSHOTS = 20

// 输入框
const tagInput = ref('')

// 状态
const generating = ref(false)
const submitting = ref(false)
const uploadingIcon = ref(false)
const uploadingScreenshot = ref(false)

// 费率配置
const feeConfig = ref(null)
const platformFeeRate = computed(() => {
  if (!feeConfig.value) return 0
  return feeConfig.value.platform_fee_rate * 100 // 转换为百分比
})

// Refs
const iconInput = ref(null)
const screenshotInput = ref(null)

// 添加标签
const addTag = () => {
  const tag = tagInput.value.trim()
  if (tag && !formData.value.tags.includes(tag)) {
    formData.value.tags.push(tag)
    tagInput.value = ''
  }
}

// 移除标签
const removeTag = (tag) => {
  formData.value.tags = formData.value.tags.filter(t => t !== tag)
}

// 移除截图
const removeScreenshot = (index) => {
  formData.value.screenshots.splice(index, 1)
}

// 添加特性
const addFeature = () => {
  formData.value.features.push({ icon: 'check', text: '' })
}

// 移除特性
const removeFeature = (index) => {
  formData.value.features.splice(index, 1)
}

// 上传图标
const handleIconUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  // 验证文件大小
  if (file.size > MAX_ICON_SIZE) {
    showMessage(t('publishWorkflow.iconTooLarge', { size: MAX_ICON_SIZE / 1024 / 1024 }), 'error')
    event.target.value = ''
    return
  }

  uploadingIcon.value = true
  try {
    const uploadFormData = new FormData()
    uploadFormData.append('file', file)

    const res = await api.post('/upload/image', uploadFormData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    if (res.code === 0) {
      // 后端已返回完整URL，直接使用
      formData.value.iconUrl = res.data.url
      showMessage(t('publishWorkflow.iconUploadSuccess'), 'success')
    }
  } catch (error) {
    console.error('上传图标失败:', error)
    showMessage(t('publishWorkflow.uploadFailed'), 'error')
  } finally {
    uploadingIcon.value = false
    event.target.value = ''
  }
}

// 上传截图
const handleScreenshotsUpload = async (event) => {
  const files = Array.from(event.target.files)
  if (files.length === 0) return

  // 检查数量限制
  const remaining = MAX_SCREENSHOTS - formData.value.screenshots.length
  if (remaining <= 0) {
    showMessage(t('publishWorkflow.screenshotLimit'), 'warning')
    event.target.value = ''
    return
  }

  const filesToUpload = files.slice(0, remaining)

  // 验证文件大小
  for (const file of filesToUpload) {
    if (file.size > MAX_SCREENSHOT_SIZE) {
      showMessage(t('publishWorkflow.fileTooLarge', { name: file.name, size: MAX_SCREENSHOT_SIZE / 1024 / 1024 }), 'error')
      event.target.value = ''
      return
    }
  }

  uploadingScreenshot.value = true
  try {
    for (const file of filesToUpload) {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const res = await api.post('/upload/image', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (res.code === 0) {
        // 后端已返回完整URL，直接使用
        formData.value.screenshots.push(res.data.url)
      }
    }
    showMessage(t('publishWorkflow.screenshotUploadSuccess'), 'success')
  } catch (error) {
    console.error('上传截图失败:', error)
    showMessage(t('publishWorkflow.uploadFailed'), 'error')
  } finally {
    uploadingScreenshot.value = false
    event.target.value = ''
  }
}

// MD编辑器内上传图片
const handleUploadImage = async (file) => {
  // 验证文件大小
  if (file.size > MAX_SCREENSHOT_SIZE) {
    throw new Error(t('publishWorkflow.imageTooLarge', { size: MAX_SCREENSHOT_SIZE / 1024 / 1024 }))
  }

  try {
    const uploadFormData = new FormData()
    uploadFormData.append('file', file)

    const res = await api.post('/upload/image', uploadFormData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    if (res.code === 0) {
      // 后端已返回完整URL，直接使用
      return res.data.url
    }
    throw new Error(res.message || t('publishWorkflow.uploadFailed'))
  } catch (error) {
    console.error('上传图片失败:', error)
    throw error
  }
}

// AI生成
const generateWithAI = async () => {
  if (!workflowId.value) {
    showMessage(t('publishWorkflow.workflowIdMissing'), 'error')
    return
  }

  generating.value = true
  try {
    const res = await workflowApi.generateWorkflowDescription(workflowId.value)
    if (res.code === 0 && res.data?.long_description) {
      formData.value.longDescription = res.data.long_description
      // 设置 Tiptap 编辑器内容
      if (editor.value) {
        editor.value.commands.setContent(res.data.long_description)
      }
      showMessage(t('publishWorkflow.aiSuccess'), 'success')
    } else {
      showMessage(res.message || t('publishWorkflow.aiFailed'), 'error')
    }
  } catch (error) {
    console.error('AI生成失败:', error)
    showMessage(t('publishWorkflow.aiFailed'), 'error')
  } finally {
    generating.value = false
  }
}

// 提交表单
const handleSubmit = async () => {
  // 验证
  if (!formData.value.category) {
    showMessage(t('publishWorkflow.selectCategoryWarning'), 'warning')
    return
  }
  if (formData.value.pricingModel !== 'free' && formData.value.milkCoinPrice <= 0) {
    showMessage(t('publishWorkflow.priceWarning'), 'warning')
    return
  }
  if (formData.value.pricingModel === 'subscription' && !formData.value.subscriptionPeriod) {
    showMessage(t('publishWorkflow.periodWarning'), 'warning')
    return
  }
  if (!formData.value.longDescription) {
    showMessage(t('publishWorkflow.descriptionWarning'), 'warning')
    return
  }

  submitting.value = true
  try {
    const data = {
      category: formData.value.category,
      tags: formData.value.tags,
      milk_coin_price: formData.value.milkCoinPrice,
      pricing_model: formData.value.pricingModel,
      inventory_enabled: formData.value.inventoryEnabled,
      icon_url: formData.value.iconUrl || null,
      screenshots: formData.value.screenshots,
      long_description: formData.value.longDescription
    }

    // 如果是订阅模式，添加订阅周期
    if (formData.value.pricingModel === 'subscription') {
      data.subscription_period = formData.value.subscriptionPeriod
    }

    // 根据是否编辑模式调用不同API
    let res
    if (isEditMode.value) {
      // 编辑模式：直接更新市场信息，不需要审核
      res = await workflowApi.updateWorkflowMarketInfo(workflowId.value, data)
    } else {
      // 新发布：提交审核
      res = await workflowApi.publishWorkflowToMarket(workflowId.value, data)
    }

    if (res.code === 0) {
      const message = isEditMode.value ? t('publishWorkflow.updateSuccess') : t('publishWorkflow.publishSuccess')
      showMessage(message, 'success')
      setTimeout(() => {
        router.push('/automation/workflows')
      }, 1500)
    }
  } catch (error) {
    console.error('发布失败:', error)
  } finally {
    submitting.value = false
  }
}

// 取消
const handleCancel = () => {
  router.push('/automation/workflows')
}

// 切换库存开关
const toggleInventory = () => {
  formData.value.inventoryEnabled = !formData.value.inventoryEnabled
}


// 加载工作流信息
const loadWorkflowInfo = async () => {
  if (!workflowId.value) {
    console.warn('⚠️ workflowId 为空，无法加载工作流信息')
    return
  }

  console.log('📥 开始加载工作流信息:', workflowId.value)

  try {
    const res = await workflowApi.getWorkflow(workflowId.value)
    console.log('📦 获取工作流信息响应:', res)
    
    if (res.code === 0 && res.data) {
      const wf = res.data
      console.log('✅ 成功获取工作流数据:', wf)
      
      // 回显表单数据
      formData.value = {
        category: wf.category || '',
        tags: wf.keywords || [],
        pricingModel: wf.pricing_model || 'free',
        milkCoinPrice: wf.milk_coin_price || 0,
        subscriptionPeriod: wf.subscription_period || 'monthly',
        inventoryEnabled: Boolean(wf.inventory_enabled),
        iconUrl: wf.icon_url || '',
        screenshots: wf.screenshots || [],
        longDescription: wf.long_description || ''
      }

      console.log('📝 表单数据已设置:', formData.value)

      // 设置富文本编辑器内容（需要等待编辑器初始化完成）
      if (wf.long_description) {
        // 使用 nextTick 确保编辑器已经初始化
        await new Promise(resolve => setTimeout(resolve, 100))
        if (editor.value) {
          editor.value.commands.setContent(wf.long_description)
          console.log('✏️ 编辑器内容已设置')
        } else {
          console.warn('⚠️ 编辑器尚未初始化，稍后重试')
          // 如果编辑器还未初始化，等待一段时间后重试
          setTimeout(() => {
            if (editor.value) {
              editor.value.commands.setContent(wf.long_description)
              console.log('✏️ 编辑器内容已设置（延迟）')
            }
          }, 500)
        }
      }
      
      // 如果已有市场信息且已发布，进入编辑模式
      // 被拒绝的工作流需要重新提交审核，不进入编辑模式
      if (wf.market_status && wf.market_status !== 'draft' && wf.market_status !== 'rejected') {
        isEditMode.value = true
        console.log('📝 已切换到编辑模式')
      }
    } else {
      console.error('❌ 获取工作流信息失败:', res.message)
      showMessage(res.message || t('publishWorkflow.workflowInfoFailed'), 'error')
    }
  } catch (error) {
    console.error('❌ 加载工作流信息异常:', error)
    showMessage(t('publishWorkflow.workflowInfoFailed'), 'error')
  }
}

// 加载费率配置
const loadFeeConfig = async () => {
  try {
    const response = await getFeeConfig()
    if (response.code === 0) {
      feeConfig.value = response.data
    }
  } catch (error) {
    console.error('获取费率配置失败:', error)
  }
}

onMounted(async () => {
  console.log('🔍 发布页面挂载，检查参数:')
  console.log('  - history.state:', history.state)
  console.log('  - workflowId:', workflowId.value)
  console.log('  - workflowName:', workflowName.value)
  console.log('  - isEditMode:', isEditMode.value)

  if (!workflowId.value) {
    showMessage(t('publishWorkflow.workflowIdMissing'), 'error')
    setTimeout(() => {
      router.push('/automation/workflows')
    }, 2000)
    return
  }

  // 加载工作流数据和费率配置
  await Promise.all([
    loadWorkflowInfo(),
    loadFeeConfig()
  ])
})

onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy()
  }
})
</script>

<style>
/* Tiptap 编辑器基础样式 */
.ProseMirror {
  min-height: 100%;
}

.ProseMirror:focus {
  outline: none;
}

/* placeholder 样式 */
.ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #9ca3af;
  pointer-events: none;
  height: 0;
}

/* 基本排版样式 */
.ProseMirror h1 {
  font-size: 1.875rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  line-height: 1.2;
}

.ProseMirror h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 1.25rem;
  margin-bottom: 0.75rem;
  line-height: 1.3;
}

.ProseMirror h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.ProseMirror p {
  margin-bottom: 0.75rem;
  line-height: 1.6;
}

.ProseMirror ul,
.ProseMirror ol {
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}

.ProseMirror li {
  margin-bottom: 0.25rem;
}

.ProseMirror strong {
  font-weight: 600;
}

.ProseMirror em {
  font-style: italic;
}

.ProseMirror code {
  background-color: #f3f4f6;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
}

.ProseMirror pre {
  background-color: #1f2937;
  color: #e5e7eb;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
  overflow-x: auto;
}

.ProseMirror pre code {
  background-color: transparent;
  padding: 0;
  color: inherit;
}

.ProseMirror blockquote {
  border-left: 3px solid #d1d5db;
  padding-left: 1rem;
  margin-left: 0;
  margin-bottom: 0.75rem;
  color: #6b7280;
}
</style>
