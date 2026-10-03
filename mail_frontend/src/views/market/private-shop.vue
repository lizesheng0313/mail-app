<template>
  <div class="min-h-screen bg-slate-50">
    <PageHeader title="私人店铺" />
    <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div v-if="loading && !storeName" class="rounded-xl border bg-white p-10 text-center text-sm text-slate-500">店铺加载中…</div>
      <div v-else-if="error" class="rounded-xl border bg-white p-10 text-center">
        <h1 class="text-lg font-semibold text-slate-900">店铺链接不可用</h1>
        <p class="mt-2 text-sm text-slate-500">{{ error }}</p>
      </div>
      <template v-else>
        <header class="rounded-xl border border-primary-100 bg-white p-5 shadow-sm sm:p-7">
          <img v-if="storeCoverUrl" :src="storeCoverUrl" :alt="`${storeName}封面`" class="mb-5 h-40 w-full rounded-lg object-cover sm:h-56" />
          <div class="text-xs font-medium text-primary-700">私人店铺</div>
          <h1 class="mt-2 text-2xl font-bold text-slate-900">{{ storeName }}</h1>
          <p v-if="storeIntro" class="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-600">{{ storeIntro }}</p>
          <p class="mt-3 text-xs text-slate-500">本店通过店主自行分享的链接访问；购买后可在账户订单中查看交易和申请售后。</p>
        </header>

        <div class="mb-4 mt-7 flex items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-slate-900">店铺商品</h2>
          <span class="text-sm text-slate-500">共 {{ total }} 件</span>
        </div>
        <div v-if="loading" class="rounded-xl border bg-white p-10 text-center text-sm text-slate-500">商品加载中…</div>
        <div v-else-if="!products.length" class="rounded-xl border bg-white p-10 text-center text-sm text-slate-500">暂无在售商品</div>
        <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <router-link
            v-for="product in products"
            :key="product.id"
            :to="{ name: 'workflow-detail', params: { id: product.id }, query: { share_token: token } }"
            class="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-primary-300 hover:shadow-md"
          >
            <div class="flex h-40 items-center justify-center bg-primary-50">
              <img v-if="product.icon_url" :src="product.icon_url" :alt="product.name" class="h-full w-full object-cover" />
              <span v-else class="text-3xl font-semibold text-primary-300">{{ (product.name || '商品').slice(0, 2) }}</span>
            </div>
            <div class="p-4">
              <h3 class="truncate font-semibold text-slate-900">{{ product.name }}</h3>
              <p class="mt-1 line-clamp-2 min-h-10 text-sm text-slate-500">{{ product.description || '查看商品详情' }}</p>
              <div class="mt-4 flex items-center justify-between">
                <span class="font-semibold text-primary-700">{{ product.pricing_model === 'free' ? '免费' : `${product.milk_coin_price || 0} 奶片起` }}</span>
                <span class="text-xs text-primary-700">查看详情 →</span>
              </div>
            </div>
          </router-link>
        </div>

        <div v-if="total > pageSize" class="mt-7 flex justify-center gap-3 pb-6">
          <button class="rounded-md border bg-white px-4 py-2 text-sm disabled:opacity-40" :disabled="page <= 1 || loading" @click="page--">上一页</button>
          <span class="self-center text-sm text-slate-500">{{ page }} / {{ totalPages }}</span>
          <button class="rounded-md border bg-white px-4 py-2 text-sm disabled:opacity-40" :disabled="page >= totalPages || loading" @click="page++">下一页</button>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader/index.vue'
import { getMarketShare } from '@/api/workflowMarket'

const route = useRoute()
const router = useRouter()
const token = computed(() => String(route.params.token || ''))
const page = ref(1)
const pageSize = 20
const total = ref(0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const products = ref([])
const storeName = ref('')
const storeIntro = ref('')
const storeCoverUrl = ref('')
const error = ref('')
const loading = ref(false)

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await getMarketShare(token.value, { page: page.value, page_size: pageSize })
    if (response.code !== 0) throw new Error(response.message || '店铺链接不可用')
    const data = response.data || {}
    if (data.share_type === 'product') {
      await router.replace({ name: 'workflow-detail', params: { id: data.workflow?.id }, query: { share_token: token.value } })
      return
    }
    storeName.value = data.store_name || '私人店铺'
    storeIntro.value = data.store_intro || ''
    storeCoverUrl.value = data.store_cover_url || ''
    products.value = data.items || []
    total.value = Number(data.total || 0)
  } catch (cause) {
    products.value = []
    error.value = cause?.message || '店铺链接已失效或店铺已暂停'
  } finally {
    loading.value = false
  }
}

watch(token, () => { page.value = 1; storeName.value = ''; load() })
watch(page, load)
onMounted(load)
</script>
