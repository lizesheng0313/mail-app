<template>
  <div class="min-w-0 p-0 sm:p-6">
    <div class="mb-4 flex flex-wrap items-start justify-between gap-3 sm:mb-6">
      <div class="min-w-0">
        <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl">帮助中心管理</h1>
        <p class="mt-1 text-sm text-gray-500">左侧菜单可新增、删除、排序，前台目录完全按这里配置显示。</p>
      </div>
      <a
        :href="previewUrl"
        target="_blank"
        class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        打开前台链接
      </a>
    </div>

    <div class="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-6">
      <aside class="max-h-64 min-w-0 overflow-y-auto rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200 lg:max-h-none">
        <div class="mb-3 grid grid-cols-2 gap-2">
          <button class="rounded-lg bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700" @click="createArticle('')">
            新增一级
          </button>
          <button class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" @click="createArticle(selectedRootKey)">
            新增子菜单
          </button>
        </div>

        <div v-if="menuTree.length" class="space-y-2">
          <div v-for="root in menuTree" :key="root.article_key" class="rounded-lg">
            <button
              type="button"
              class="w-full rounded-lg px-3 py-2 text-left text-sm transition"
              :class="selectedKey === root.article_key ? 'bg-primary-50 font-medium text-primary-700' : 'text-gray-800 hover:bg-gray-50'"
              @click="selectArticle(root.article_key)"
            >
              <div>{{ root.title || root.article_key }}</div>
              <div class="mt-0.5 truncate text-xs text-gray-400">{{ root.article_key }}</div>
            </button>
            <div class="ml-4 mt-1 space-y-1 border-l border-gray-100 pl-2">
              <button
                v-for="child in root.children"
                :key="child.article_key"
                type="button"
                class="w-full rounded-lg px-3 py-2 text-left text-sm transition"
                :class="selectedKey === child.article_key ? 'bg-primary-50 font-medium text-primary-700' : 'text-gray-600 hover:bg-gray-50'"
                @click="selectArticle(child.article_key)"
              >
                <div>{{ child.title || child.article_key }}</div>
                <div class="mt-0.5 truncate text-xs text-gray-400">{{ child.article_key }}</div>
              </button>
            </div>
          </div>
        </div>
        <div v-else class="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-400">
          暂无菜单，先点新增一级
        </div>
      </aside>

      <main class="min-w-0 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-5">
        <div class="mb-4 flex flex-wrap items-center gap-2 border-b border-gray-200 pb-4">
          <button
            v-for="language in languages"
            :key="language.value"
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-medium"
            :class="selectedLocale === language.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            :disabled="!selectedKey && language.value !== 'zh-CN'"
            @click="changeLocale(language.value)"
          >
            {{ language.label }}
            <span v-if="language.value !== 'zh-CN' && translationDrafts[language.value].stale" class="ml-1 text-amber-600">待更新</span>
          </button>
          <span class="text-xs text-gray-500">先保存简体原文；原文修改后，旧译文需重新确认，前台不会继续使用旧译文。</span>
        </div>
        <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="text-sm font-medium text-gray-700">菜单 Key</span>
            <input
              v-model.trim="form.article_key"
              :disabled="selectedLocale !== 'zh-CN'"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              placeholder="例如 help-login"
            />
          </label>
          <label class="block">
            <span class="text-sm font-medium text-gray-700">父级 Key</span>
            <input
              v-model.trim="form.parent_key"
              :disabled="selectedLocale !== 'zh-CN'"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              placeholder="空着就是一级菜单"
            />
          </label>
          <label class="block">
            <span class="text-sm font-medium text-gray-700">{{ selectedLocale === 'zh-CN' ? '标题' : '翻译标题' }}</span>
            <input
              v-model="editingTitle"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
          </label>
          <label class="block">
            <span class="text-sm font-medium text-gray-700">排序</span>
            <input
              v-model.number="form.sort_order"
              :disabled="selectedLocale !== 'zh-CN'"
              type="number"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
          </label>
        </div>

        <div class="mb-4 flex flex-wrap items-center gap-3">
          <label class="inline-flex items-center gap-2 text-sm text-gray-700">
            <input v-model="form.enabled" type="checkbox" :disabled="selectedLocale !== 'zh-CN'" class="rounded border-gray-300" />
            启用
          </label>
          <div class="inline-flex rounded-lg border border-gray-300 p-1">
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-sm"
              :class="editMode === 'text' ? 'bg-primary-600 text-white' : 'text-gray-700 hover:bg-gray-50'"
              @click="switchEditMode('text')"
            >
              普通文本
            </button>
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-sm"
              :class="editMode === 'html' ? 'bg-primary-600 text-white' : 'text-gray-700 hover:bg-gray-50'"
              @click="switchEditMode('html')"
            >
              HTML
            </button>
          </div>
          <label class="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            上传图片
            <input type="file" accept="image/*" class="hidden" @change="handleImageUpload" />
          </label>
          <button
            type="button"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            :disabled="saving"
            @click="saveArticle"
          >
            {{ saving ? '保存中...' : '保存' }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            @click="insertTemplate"
          >
            插入模板
          </button>
          <button
            type="button"
            class="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            :disabled="!selectedKey || selectedLocale !== 'zh-CN'"
            @click="deleteArticle"
          >
            删除
          </button>
        </div>

        <textarea
          v-model="editorContent"
          class="h-64 w-full rounded-xl border border-gray-300 p-3 font-mono text-sm leading-6 outline-none focus:border-primary-500 sm:h-[460px] sm:p-4"
          :placeholder="editorPlaceholder"
        />

        <div class="mt-5 rounded-xl border border-gray-200 p-4">
          <div class="mb-3 text-sm font-medium text-gray-700">预览</div>
          <div class="help-preview max-w-none text-sm leading-7 text-gray-700" v-html="previewContent || '<p class=&quot;text-gray-400&quot;>暂无内容</p>'"></div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { showMessage } from '@/utils/message'
import helpCenterAPI from '@/api/helpCenter'

const articles = ref([])
const selectedKey = ref('')
const saving = ref(false)
const editMode = ref('text')
const editorContent = ref('')
const selectedLocale = ref('zh-CN')
const languages = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en', label: 'English' },
]
const translationDrafts = reactive({
  'zh-TW': { title: '', content_html: '', stale: false },
  en: { title: '', content_html: '', stale: false },
})

const form = reactive({
  article_key: '',
  parent_key: '',
  title: '',
  content_html: '',
  sort_order: 0,
  enabled: true,
})

const editingTitle = computed({
  get: () => selectedLocale.value === 'zh-CN' ? form.title : translationDrafts[selectedLocale.value].title,
  set: (title) => {
    if (selectedLocale.value === 'zh-CN') form.title = title
    else translationDrafts[selectedLocale.value].title = title
  },
})
const currentDraftContent = () => selectedLocale.value === 'zh-CN'
  ? form.content_html
  : translationDrafts[selectedLocale.value].content_html
const storeEditorContent = () => {
  if (selectedLocale.value === 'zh-CN') form.content_html = previewContent.value
  else translationDrafts[selectedLocale.value].content_html = previewContent.value
}
const changeLocale = (nextLocale) => {
  if (selectedLocale.value === nextLocale || (!selectedKey.value && nextLocale !== 'zh-CN')) return
  storeEditorContent()
  selectedLocale.value = nextLocale
  syncEditorFromHtml(currentDraftContent())
}

const articleMap = computed(() => Object.fromEntries(articles.value.map((item) => [item.article_key, item])))
const menuTree = computed(() => {
  const roots = articles.value
    .filter((item) => !item.parent_key)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  return roots.map((root) => ({
    ...root,
    children: articles.value
      .filter((item) => item.parent_key === root.article_key)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
  }))
})
const selectedRootKey = computed(() => {
  const current = articleMap.value[selectedKey.value]
  return current?.parent_key || current?.article_key || ''
})
const previewUrl = computed(() => form.article_key ? `/about?help=${encodeURIComponent(form.article_key)}` : '/about')
const previewContent = computed(() => (editMode.value === 'text' ? textToHtml(editorContent.value) : editorContent.value))
const editorPlaceholder = computed(() => (
  editMode.value === 'text'
    ? '直接写文字即可，换行会自动保留。'
    : '这里写 HTML，例如：<p>说明文字</p><img src="..." />'
))

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const textToHtml = (value) => String(value || '')
  .split(/\n{2,}/)
  .map((block) => block.trim())
  .filter(Boolean)
  .map((block) => {
    const imageMatch = block.match(/^\[图片\]\s*(\S+)$/)
    if (imageMatch) {
      return `<p><img src="${escapeHtml(imageMatch[1])}" alt="" style="max-width: 100%; border-radius: 8px;" /></p>`
    }
    return `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`
  })
  .join('\n')

const htmlToText = (value) => {
  const source = String(value || '')
    .replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, '\n\n[图片] $1\n\n')
    .replace(/<\s*li[^>]*>/gi, '\n')
    .replace(/<\s*\/li\s*>/gi, '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/p\s*>/gi, '\n\n')
    .replace(/<\s*\/h[1-6]\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
  return source
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const syncEditorFromHtml = (content) => {
  editorContent.value = editMode.value === 'text' ? htmlToText(content) : (content || '')
}

const switchEditMode = (mode) => {
  if (mode === editMode.value) return
  editorContent.value = mode === 'html' ? textToHtml(editorContent.value) : htmlToText(editorContent.value)
  editMode.value = mode
}

const resetForm = (parentKey = '') => {
  selectedLocale.value = 'zh-CN'
  selectedKey.value = ''
  form.article_key = ''
  form.parent_key = parentKey
  form.title = ''
  form.content_html = ''
  form.sort_order = articles.value.length
  form.enabled = true
  for (const language of ['zh-TW', 'en']) {
    translationDrafts[language].title = ''
    translationDrafts[language].content_html = ''
    translationDrafts[language].stale = false
  }
  editorContent.value = ''
}

const createArticle = (parentKey) => {
  resetForm(parentKey || '')
}

const loadArticles = async () => {
  const res = await helpCenterAPI.listAdminArticles()
  articles.value = res.data?.articles || []
  if (selectedKey.value && articleMap.value[selectedKey.value]) {
    selectArticle(selectedKey.value)
  } else if (articles.value.length) {
    selectArticle(articles.value[0].article_key)
  } else {
    resetForm()
  }
}

const selectArticle = (key) => {
  const article = articleMap.value[key]
  if (!article) return
  selectedKey.value = key
  form.article_key = article.article_key
  form.parent_key = article.parent_key || ''
  form.title = article.title || ''
  form.content_html = article.content_html || ''
  form.sort_order = article.sort_order || 0
  form.enabled = article.enabled ?? true
  for (const language of ['zh-TW', 'en']) {
    translationDrafts[language].title = article.translations?.[language]?.title || ''
    translationDrafts[language].content_html = article.translations?.[language]?.content_html || ''
    translationDrafts[language].stale = Boolean(article.translations?.[language]?.stale)
  }
  syncEditorFromHtml(currentDraftContent())
}

const saveArticle = async () => {
  if (!form.article_key) {
    showMessage('请填写菜单 Key', 'error')
    return
  }
  if (!editingTitle.value.trim()) {
    showMessage('请填写标题', 'error')
    return
  }
  if (selectedLocale.value !== 'zh-CN' && !selectedKey.value) {
    showMessage('请先保存简体中文原文', 'error')
    return
  }
  saving.value = true
  try {
    storeEditorContent()
    const oldKey = selectedKey.value
    await helpCenterAPI.saveArticle(oldKey || form.article_key, {
      ...form,
      locale: selectedLocale.value,
      title: editingTitle.value,
      content_html: currentDraftContent(),
    })
    selectedKey.value = oldKey || form.article_key
    await loadArticles()
    showMessage('保存成功', 'success')
  } finally {
    saving.value = false
  }
}

const deleteArticle = async () => {
  if (!selectedKey.value) return
  if (!window.confirm('确定删除这个菜单吗？子菜单也会一起删除。')) return
  await helpCenterAPI.deleteArticle(selectedKey.value)
  showMessage('删除成功', 'success')
  selectedKey.value = ''
  await loadArticles()
}

const handleImageUpload = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  const res = await helpCenterAPI.uploadImage(file)
  const url = res.data?.url
  if (!url) return
  if (editMode.value === 'html') {
    editorContent.value += `\n<p><img src="${url}" alt="" style="max-width: 100%; border-radius: 8px;" /></p>\n`
  } else {
    editorContent.value += `\n\n[图片] ${url}\n`
  }
  showMessage('图片已插入', 'success')
}

const insertTemplate = () => {
  if (editMode.value === 'html') {
    editorContent.value += '\n<h3>小标题</h3>\n<p>这里填写说明文字。</p>\n<ol>\n  <li>第一步</li>\n  <li>第二步</li>\n</ol>\n'
    return
  }
  editorContent.value += '\n\n小标题\n这里填写说明文字。\n1. 第一步\n2. 第二步\n'
}

onMounted(loadArticles)
</script>

<style scoped>
.help-preview :deep(img) {
  max-width: 100%;
  border-radius: 8px;
}

.help-preview :deep(p) {
  margin: 0.5rem 0;
}

.help-preview :deep(h3) {
  margin-top: 1rem;
  font-weight: 600;
  color: #111827;
}

.help-preview :deep(ol) {
  list-style: decimal;
  padding-left: 1.25rem;
}
</style>
