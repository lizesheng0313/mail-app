<template>
  <div class="min-h-screen bg-slate-50">
    <PageHeader />

    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div class="relative mb-5">
        <label for="help-search" class="sr-only">{{ t('about.helpSearchLabel') }}</label>
        <div class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 transition-colors focus-within:border-primary-500">
          <svg class="h-5 w-5 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <input
            id="help-search"
            v-model="searchQuery"
            type="search"
            class="h-12 min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-0 focus:outline-none focus:ring-0"
            :placeholder="t('about.helpSearchPlaceholder')"
            autocomplete="off"
            @keydown.enter.prevent="openFirstSearchResult"
            @keydown.esc="searchQuery = ''"
          />
          <button v-if="searchQuery" type="button" class="shrink-0 text-sm text-slate-500 hover:text-slate-900" @click="searchQuery = ''">{{ t('about.helpClear') }}</button>
        </div>
      </div>

      <section v-if="normalizedSearchQuery" class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7" :aria-label="t('about.helpSearchResults')">
        <div class="mb-4 flex items-baseline justify-between gap-3">
          <h1 class="text-lg font-semibold text-slate-900">{{ t('about.helpSearchResults') }}</h1>
          <p class="text-sm text-slate-500" aria-live="polite">{{ t('about.helpResultsCount', { count: searchResults.length }) }}</p>
        </div>
        <div v-if="searchResults.length" class="divide-y divide-slate-100">
          <a
            v-for="result in searchResults"
            :key="result.article_key"
            :href="`/about?help=${result.article_key}`"
            class="block rounded-lg px-3 py-4 transition-colors hover:bg-primary-50 focus-visible:bg-primary-50 focus-visible:outline-none"
            @click.prevent="goHelp(result.article_key)"
          >
            <p class="text-xs text-slate-500">{{ result.breadcrumb }}</p>
            <h2 class="mt-1 text-base font-semibold text-slate-900">{{ result.title }}</h2>
            <p v-if="result.snippet" class="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{{ result.snippet }}</p>
          </a>
        </div>
        <p v-else class="py-8 text-center text-sm text-slate-500">{{ t('about.helpNoResults') }}</p>
      </section>

      <div v-else class="grid grid-cols-1 gap-6 lg:h-[calc(100vh-11.5rem)] lg:grid-cols-[252px_minmax(0,1fr)]">
        <aside class="help-toc max-h-[60vh] self-start overflow-y-auto rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:h-full lg:max-h-none lg:self-stretch">
          <div class="border-b border-slate-100 px-3 pb-4">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{{ t('about.helpContents') }}</p>
            <a href="/about" class="mt-2 block text-base font-semibold text-slate-900 hover:text-primary-700" @click.prevent="goHome">
              {{ t('about.title') }}
            </a>
          </div>

          <div v-if="menuTree.length" class="space-y-2 px-1 pt-4">
            <div v-for="root in menuTree" :key="root.article_key" class="space-y-1">
              <a
                :href="`/about?help=${root.article_key}`"
                class="block rounded-lg px-3 py-2 text-sm font-semibold leading-5 transition-colors hover:bg-slate-50 hover:text-slate-900"
                :class="currentHelpKey === root.article_key ? 'bg-primary-50 text-primary-700' : selectedRoot?.article_key === root.article_key ? 'text-primary-700' : 'text-slate-800'"
                :aria-current="currentHelpKey === root.article_key ? 'page' : undefined"
                @click.prevent="goHelp(root.article_key)"
              >
                {{ root.title }}
              </a>
              <div v-if="root.children?.length" class="space-y-1 pl-2">
                <div v-for="item in root.children" :key="item.article_key">
                  <a
                  :href="`/about?help=${item.article_key}`"
                  class="block rounded-lg px-3 py-1.5 text-[13px] font-medium leading-5 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  :class="currentHelpKey === item.article_key ? 'bg-primary-50 text-primary-700' : selectedPath[1]?.article_key === item.article_key ? 'text-primary-700' : 'text-slate-600'"
                  :aria-current="currentHelpKey === item.article_key ? 'page' : undefined"
                  @click.prevent="goHelp(item.article_key)"
                  >{{ item.title }}</a>
                  <div v-if="item.children?.length" class="space-y-0.5 pl-2">
                    <a
                      v-for="child in item.children"
                      :key="child.article_key"
                      :href="`/about?help=${child.article_key}`"
                      class="block rounded-lg px-3 py-1.5 text-[13px] font-normal leading-5 transition-colors hover:bg-slate-50 hover:text-slate-900"
                      :class="currentHelpKey === child.article_key ? 'bg-primary-50 text-primary-700' : 'text-slate-600'"
                      :aria-current="currentHelpKey === child.article_key ? 'page' : undefined"
                      @click.prevent="goHelp(child.article_key)"
                    >{{ child.title }}</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="px-3 py-4 text-sm text-slate-400">{{ t('about.helpNoMenu') }}</div>
        </aside>

        <main ref="contentPanelRef" class="help-content-panel space-y-6 lg:min-h-0 lg:overflow-y-auto">
          <article
            v-if="selectedArticle"
            :id="selectedArticle.article_key"
            class="scroll-mt-28 rounded-2xl bg-white px-8 py-8 shadow-sm ring-1 ring-slate-200"
          >
            <div v-if="selectedPath.length > 1" class="mb-5 text-sm text-slate-500">
              <template v-for="ancestor in selectedPath.slice(0, -1)" :key="ancestor.article_key">
                <a :href="`/about?help=${ancestor.article_key}`" class="hover:text-primary-700" @click.prevent="goHelp(ancestor.article_key)">{{ ancestor.title }}</a>
                <span class="mx-2">/</span>
              </template>
              {{ selectedArticle.title }}
            </div>
            <h2 class="text-2xl font-semibold text-slate-900">{{ selectedArticle.title }}</h2>
            <p v-if="selectedArticle.translation_missing" class="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{{ t('about.helpTranslationPending') }}</p>
            <div
              v-if="selectedArticle.content_html"
              class="help-rich-content mt-4 text-sm leading-7 text-slate-600"
              v-html="selectedArticle.content_html"
            ></div>
            <p v-else class="mt-4 text-sm leading-7 text-slate-400">{{ t('about.helpNoContent') }}</p>
            <div v-if="relatedArticles.length" class="mt-8 border-t border-slate-100 pt-6">
              <h3 class="text-sm font-semibold text-slate-900">{{ t('about.helpRelated', { name: relatedTitle }) }}</h3>
              <div class="mt-3 grid gap-2 sm:grid-cols-2">
                <a
                  v-for="item in relatedArticles"
                  :key="item.article_key"
                  :href="`/about?help=${item.article_key}`"
                  class="rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700 transition-colors hover:border-primary-300 hover:text-primary-700"
                  :class="currentHelpKey === item.article_key ? 'border-primary-300 bg-primary-50 text-primary-700' : ''"
                  @click.prevent="goHelp(item.article_key)"
                >{{ item.title }} →</a>
              </div>
            </div>
          </article>

          <template v-else>
            <div class="rounded-2xl bg-white px-8 py-8 shadow-sm ring-1 ring-slate-200">
              <h1 class="text-2xl font-semibold text-slate-900">{{ t('about.title') }}</h1>
              <p class="mt-3 text-sm leading-7 text-slate-600">{{ t('about.helpIntro') }}</p>
            </div>
            <div v-if="menuTree.length" class="grid gap-4 sm:grid-cols-2">
              <a
                v-for="root in menuTree"
                :key="root.article_key"
                :href="`/about?help=${root.article_key}`"
                class="rounded-2xl bg-white px-6 py-6 shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-primary-300"
                @click.prevent="goHelp(root.article_key)"
              >
                <h2 class="text-lg font-semibold text-slate-900">{{ root.title }}</h2>
                <p class="mt-2 text-sm text-slate-500">{{ root.children?.length ? t('about.helpGuideCount', { count: root.children.length }) : t('about.helpViewGuide') }}</p>
              </a>
            </div>
            <p v-else class="rounded-2xl bg-white px-8 py-8 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">{{ t('about.helpUnavailable') }}</p>
          </template>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader/index.vue'
import helpCenterAPI from '@/api/helpCenter'
import fallbackArticles from '@/data/helpCenterFallback.json'
import traditionalArticles from '@/data/helpCenterFallback.zh-TW.json'
import { helpCenterEnglish } from '@/data/helpCenterEnglish'
import { normalizeLocale } from '@/i18n'

type HelpArticle = {
  article_key: string
  parent_key: string
  title: string
  content_html: string
  sort_order: number
  enabled: boolean
  translation_missing?: boolean
  children?: HelpArticle[]
}

type SearchEntry = {
  article_key: string
  title: string
  breadcrumb: string
  body: string
  order: number
}

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const defaultArticles = fallbackArticles as HelpArticle[]
const apiArticles = ref<HelpArticle[] | null>(null)
const traditionalByKey = new Map((traditionalArticles as HelpArticle[]).map((article) => [article.article_key, article]))
const englishImages = (html: string, title: string) => {
  const images = [...String(html || '').matchAll(/<img\b[^>]*>/gi)]
  return images.map(([tag]) => {
    const src = tag.match(/\bsrc="([^"]+)"/i)?.[1]
    const width = tag.match(/\bwidth="(\d+)"/i)?.[1]
    if (!src || !src.startsWith('/help-center/')) return ''
    const image = `<img src="${src}"${width ? ` width="${width}"` : ''} alt="${title}" loading="lazy">`
    return `<p><a href="${src}" target="_blank" rel="noopener noreferrer">${image}</a></p>`
  }).join('')
}
const articles = computed<HelpArticle[]>(() => {
  if (apiArticles.value) return apiArticles.value
  const selectedLocale = normalizeLocale(locale.value)
  if (selectedLocale === 'zh-CN') return defaultArticles
  return defaultArticles.map((article) => {
    if (selectedLocale === 'zh-TW') {
      const translation = traditionalByKey.get(article.article_key)
      return translation
        ? { ...article, title: translation.title, content_html: translation.content_html }
        : { ...article, translation_missing: true }
    }
    const translation = helpCenterEnglish[article.article_key]
    return translation
      ? { ...article, title: translation.title, content_html: translation.content_html + englishImages(article.content_html, translation.title) }
      : { ...article, translation_missing: true }
  })
})
const searchQuery = ref('')
const contentPanelRef = ref<HTMLElement | null>(null)

const menuTree = computed<HelpArticle[]>(() => {
  const byParent = new Map<string, HelpArticle[]>()
  for (const article of articles.value) {
    const siblings = byParent.get(article.parent_key || '') || []
    siblings.push(article)
    byParent.set(article.parent_key || '', siblings)
  }
  const build = (parentKey: string, ancestors: Set<string>): HelpArticle[] =>
    (byParent.get(parentKey) || [])
      .filter((item) => !ancestors.has(item.article_key))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((item) => ({
        ...item,
        children: build(item.article_key, new Set([...ancestors, item.article_key]))
      }))
  return build('', new Set())
})

const plainText = (html: string) => String(html || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

const searchIndex = computed<SearchEntry[]>(() => {
  const entries: SearchEntry[] = []
  const visit = (nodes: HelpArticle[], ancestors: string[]) => {
    for (const node of nodes) {
      entries.push({
        article_key: node.article_key,
        title: node.title,
        breadcrumb: ancestors.length ? ancestors.join(' › ') : t('about.title'),
        body: plainText(node.content_html),
        order: entries.length
      })
      visit(node.children || [], [...ancestors, node.title])
    }
  }
  visit(menuTree.value, [])
  return entries
})

const normalizedSearchQuery = computed(() => searchQuery.value.trim().toLocaleLowerCase())
const searchResults = computed(() => {
  if (!normalizedSearchQuery.value) return []
  const terms = normalizedSearchQuery.value.split(/\s+/)
  const results: Array<SearchEntry & { rank: number; snippet: string }> = []
  for (const entry of searchIndex.value) {
    const title = entry.title.toLocaleLowerCase()
    const breadcrumb = entry.breadcrumb.toLocaleLowerCase()
    const body = entry.body.toLocaleLowerCase()
    if (!terms.every((term) => title.includes(term) || breadcrumb.includes(term) || body.includes(term))) continue
    const rank = (title === normalizedSearchQuery.value ? 100 : 0)
      + terms.reduce((score, term) => score + (title.includes(term) ? 20 : breadcrumb.includes(term) ? 5 : 0), 0)
    const positions = terms.map((term) => body.indexOf(term)).filter((position) => position >= 0)
    const start = positions.length ? Math.max(0, Math.min(...positions) - 24) : 0
    const end = start + 90
    results.push({
      ...entry,
      rank,
      snippet: `${start ? '…' : ''}${entry.body.slice(start, end)}${end < entry.body.length ? '…' : ''}`
    })
  }
  return results.sort((left, right) => right.rank - left.rank || left.order - right.order)
})

const currentHelpKey = computed(() => String(route.query.help || '').trim())
const findPath = (nodes: HelpArticle[], key: string, ancestors: HelpArticle[] = []): HelpArticle[] => {
  for (const node of nodes) {
    const path = [...ancestors, node]
    if (node.article_key === key) return path
    const childPath = findPath(node.children || [], key, path)
    if (childPath.length) return childPath
  }
  return []
}
const selectedPath = computed(() => findPath(menuTree.value, currentHelpKey.value))
const selectedArticle = computed(() => selectedPath.value[selectedPath.value.length - 1] || null)
const selectedRoot = computed(() => selectedPath.value[0] || null)
const relatedArticles = computed(() => {
  if (selectedArticle.value?.children?.length) return selectedArticle.value.children
  return selectedPath.value.length > 1
    ? selectedPath.value[selectedPath.value.length - 2].children || []
    : []
})
const relatedTitle = computed(() => selectedArticle.value?.children?.length
  ? selectedArticle.value.title
  : selectedPath.value[selectedPath.value.length - 2]?.title || '')

// 已导入旧版帮助数据时，也不再展示此前生成的流程示意图。
const removeGeneratedIllustrations = (contentHtml: string) =>
  String(contentHtml || '')
    .replace(/<figure class="help-illustration">[\s\S]*?<\/figure>/g, '')
    .replace(/<p>\s*<img[^>]*src="\/help-center\/guide\/[^"]+"[^>]*>\s*<\/p>/gi, '')
    .replace(/<img[^>]*src="\/help-center\/guide\/[^"]+"[^>]*>/gi, '')

let loadSequence = 0
const loadHelpArticles = async () => {
  const sequence = ++loadSequence
  try {
    const res: any = await helpCenterAPI.listPublicArticles(normalizeLocale(locale.value))
    if (sequence !== loadSequence) return
    if (!Array.isArray(res.data?.articles)) throw new Error('Invalid help center response')
    const loadedArticles: HelpArticle[] = res.data.articles
      .filter((item: HelpArticle) => item.article_key && item.enabled)
      .map((item: HelpArticle) => ({
        ...item,
        content_html: removeGeneratedIllustrations(item.content_html)
      }))
    apiArticles.value = loadedArticles
  } catch (error) {
    if (sequence !== loadSequence) return
    console.warn('加载帮助中心内容失败', error)
    apiArticles.value = null
  }
}

const goHelp = async (key: string) => {
  searchQuery.value = ''
  await router.push({ path: '/about', query: { ...route.query, help: key } })
}

const goHome = async () => {
  searchQuery.value = ''
  const query = { ...route.query }
  delete query.help
  await router.push({ path: '/about', query })
}

const openFirstSearchResult = () => {
  const first = searchResults.value[0]
  if (first) void goHelp(first.article_key)
}

onMounted(loadHelpArticles)

watch(locale, () => {
  searchQuery.value = ''
  apiArticles.value = null
  void loadHelpArticles()
})

watch(
  () => route.query.help,
  async () => {
    await nextTick()
    const panel = contentPanelRef.value
    if (!panel) return
    if (window.innerWidth >= 1024) {
      panel.scrollTop = 0
    } else {
      panel.scrollIntoView?.({ block: 'start', behavior: 'auto' })
    }
  }
)
</script>

<style scoped>
#help-search,
#help-search:focus,
#help-search:focus-visible {
  border: 0;
  outline: 0;
  box-shadow: none;
}

@media (min-width: 1024px) {
  .help-toc,
  .help-content-panel {
    scrollbar-gutter: stable;
  }
}

.help-rich-content :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 12px 0;
}

.help-rich-content :deep(figcaption) {
  margin-top: 4px;
  color: #64748b;
  font-size: 0.75rem;
  line-height: 1.5;
}

.help-rich-content :deep(p) {
  margin: 8px 0;
}

.help-rich-content :deep(ol) {
  list-style: decimal;
  padding-left: 1.25rem;
}

.help-rich-content :deep(ul) {
  list-style: disc;
  padding-left: 1.25rem;
}

.help-rich-content :deep(h3) {
  margin-top: 16px;
  font-weight: 600;
  color: #0f172a;
}

.help-rich-content :deep(.help-table-wrap) {
  margin: 12px 0;
  overflow-x: auto;
}

.help-rich-content :deep(table) {
  min-width: 700px;
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  line-height: 1.5;
}

.help-rich-content :deep(th),
.help-rich-content :deep(td) {
  border: 1px solid #e2e8f0;
  padding: 10px 12px;
  text-align: left;
  vertical-align: top;
}

.help-rich-content :deep(th) {
  background: #f8fafc;
  color: #334155;
  font-weight: 600;
}

.help-rich-content :deep(a) {
  color: #15803d;
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
