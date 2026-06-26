<template>
  <div class="min-h-screen bg-slate-50">
    <PageHeader />

    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[220px,1fr]">
        <aside class="self-start rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <div class="border-b border-slate-100 px-3 pb-4">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">目录</p>
            <h2 class="mt-2 text-base font-semibold text-slate-900">{{ t('about.title') }}</h2>
          </div>

          <div v-if="menuTree.length" class="space-y-3 px-1 pt-4">
            <div v-for="root in menuTree" :key="root.article_key" class="space-y-1">
              <a
                :href="`/about?help=${root.article_key}`"
                class="block rounded-xl px-3 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 hover:text-slate-900"
                @click.prevent="goHelp(root.article_key)"
              >
                {{ root.title }}
              </a>
              <div v-if="root.children.length" class="space-y-1 pl-3">
                <a
                  v-for="item in root.children"
                  :key="item.article_key"
                  :href="`/about?help=${item.article_key}`"
                  class="block rounded-lg px-3 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  @click.prevent="goHelp(item.article_key)"
                >
                  {{ item.title }}
                </a>
              </div>
            </div>
          </div>
          <div v-else class="px-3 py-4 text-sm text-slate-400">暂无菜单</div>
        </aside>

        <main class="space-y-6">
          <article
            v-if="selectedArticle"
            :id="selectedArticle.article_key"
            class="scroll-mt-28 rounded-2xl bg-white px-8 py-8 shadow-sm ring-1 ring-slate-200"
          >
            <h2 class="text-2xl font-semibold text-slate-900">{{ selectedArticle.title }}</h2>
            <div
              v-if="selectedArticle.content_html"
              class="help-rich-content mt-4 text-sm leading-7 text-slate-600"
              v-html="selectedArticle.content_html"
            ></div>
            <p v-else class="mt-4 text-sm leading-7 text-slate-400">暂无内容</p>
          </article>

          <template v-else>
            <article
              v-for="root in menuTree"
              :id="root.article_key"
              :key="root.article_key"
              class="scroll-mt-28 rounded-2xl bg-white px-8 py-8 shadow-sm ring-1 ring-slate-200"
            >
              <h2 class="text-2xl font-semibold text-slate-900">{{ root.title }}</h2>
              <div
                v-if="root.content_html"
                class="help-rich-content mt-4 text-sm leading-7 text-slate-600"
                v-html="root.content_html"
              ></div>

              <div v-if="root.children.length" class="mt-6 space-y-6">
                <section
                  v-for="item in root.children"
                  :id="item.article_key"
                  :key="item.article_key"
                  class="scroll-mt-28"
                >
                  <h3 class="text-base font-medium text-slate-900">{{ item.title }}</h3>
                  <div
                    v-if="item.content_html"
                    class="help-rich-content mt-2 text-sm leading-7 text-slate-600"
                    v-html="item.content_html"
                  ></div>
                  <p v-else class="mt-2 text-sm leading-7 text-slate-400">暂无内容</p>
                </section>
              </div>
            </article>
          </template>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader/index.vue'
import helpCenterAPI from '@/api/helpCenter'

type HelpArticle = {
  article_key: string
  parent_key: string
  title: string
  content_html: string
  sort_order: number
  enabled: boolean
  children?: HelpArticle[]
}

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const articles = ref<HelpArticle[]>([])

const articleMap = computed<Record<string, HelpArticle>>(() => Object.fromEntries(
  articles.value.map((item) => [item.article_key, item])
))

const menuTree = computed<HelpArticle[]>(() => {
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

const currentHelpKey = computed(() => String(route.query.help || '').trim())
const selectedArticle = computed(() => articleMap.value[currentHelpKey.value] || null)

const loadHelpArticles = async () => {
  try {
    const res: any = await helpCenterAPI.listPublicArticles()
    articles.value = (res.data?.articles || []).filter((item: HelpArticle) => item.article_key && item.enabled)
  } catch (error) {
    console.warn('加载帮助中心内容失败', error)
    articles.value = []
  }
}

const goHelp = async (key: string) => {
  await router.push({ path: '/about', query: { ...route.query, help: key } })
}

onMounted(loadHelpArticles)

watch(
  () => route.query.help,
  () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
)
</script>

<style scoped>
.help-rich-content :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 12px 0;
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
</style>
