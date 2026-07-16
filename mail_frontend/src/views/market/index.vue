<template>
  <div class="min-h-screen bg-slate-50">
    <PageHeader title="资源市场" />

    <div class="border-b border-primary-100 bg-white">
      <div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="relative lg:w-[420px]">
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="搜索资源"
              class="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-100"
              @keyup.enter="searchWorkflows"
            />
            <svg class="absolute left-3.5 top-3 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div class="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            <button
              v-for="category in primaryCategories"
              :key="category.value"
              type="button"
              class="shrink-0 rounded-full px-4 py-2 text-sm font-medium transition"
              :class="selectedPrimaryCategory === category.value ? 'bg-primary-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-primary-50 hover:text-primary-700'"
              @click="selectPrimaryCategory(category.value)"
            >
              {{ category.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div class="mb-5 flex items-center justify-between">
        <h2 class="text-xl font-bold text-slate-950">{{ activeCategoryTitle }}</h2>
        <div class="hidden text-sm text-slate-500 sm:block">
          {{ total || workflows.length }} 个结果
        </div>
      </div>

      <div v-if="loading" class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <div v-for="i in 6" :key="i" class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div class="h-44 animate-pulse rounded-md bg-slate-200"></div>
          <div class="mt-4 h-4 w-2/3 animate-pulse rounded bg-slate-200"></div>
          <div class="mt-3 h-4 w-full animate-pulse rounded bg-slate-100"></div>
          <div class="mt-2 h-4 w-1/2 animate-pulse rounded bg-slate-100"></div>
        </div>
      </div>

      <div v-else-if="displayProducts.length > 0" class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="product in displayProducts"
          :key="product.id"
          class="group cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
          @click="viewResource(product)"
        >
          <div class="relative h-48 overflow-hidden bg-slate-100">
            <img
              v-if="product.cover_url"
              :src="product.cover_url"
              :alt="product.name"
              class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              @error="handleCardImageError"
            />
            <div v-else class="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100">
              <div class="rounded-lg border border-primary-200 bg-white/80 px-4 py-3 text-center shadow-sm">
                <div class="text-sm font-medium text-primary-700">{{ product.primary_category_label }}</div>
                <div class="mt-1 text-lg font-bold text-slate-950">{{ product.short_name }}</div>
              </div>
            </div>
            <div v-if="product.stock_status === 'sold_out'" class="absolute right-3 top-3">
              <span
                class="rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-white shadow"
              >
                {{ product.stock_status_label }}
              </span>
            </div>
          </div>

          <div class="p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="line-clamp-1 text-base font-bold text-slate-950">{{ product.name }}</h3>
                <p class="mt-1 text-xs text-slate-500">
                  {{ product.primary_category_label }} / {{ product.secondary_category_label }}
                </p>
              </div>
              <div class="shrink-0 text-right">
                <div class="text-lg font-black text-primary-600">{{ product.price_text }}</div>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="rounded-lg border border-dashed border-slate-300 bg-white py-16 text-center">
        <svg class="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V7a2 2 0 00-2-2h-3.5a2 2 0 01-1.6-.8l-.8-1.1A2 2 0 0010.5 2H6a2 2 0 00-2 2v9m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
        </svg>
        <h3 class="mt-3 text-sm font-semibold text-slate-900">没有找到资源</h3>
        <p class="mt-1 text-sm text-slate-500">换个分类或关键词试试。</p>
      </div>

      <div v-if="total > pageSize" class="mt-8 flex justify-center">
        <nav class="inline-flex overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
          <button
            type="button"
            class="px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="page === 1"
            @click="changePage(page - 1)"
          >
            上一页
          </button>
          <button
            v-for="p in visiblePages"
            :key="p"
            type="button"
            class="border-l border-slate-200 px-4 py-2 text-sm font-medium"
            :class="p === page ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-primary-50 hover:text-primary-700'"
            @click="changePage(p)"
          >
            {{ p }}
          </button>
          <button
            type="button"
            class="border-l border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="page === totalPages"
            @click="changePage(page + 1)"
          >
            下一页
          </button>
        </nav>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getMarketWorkflows } from '@/api/workflowMarket'
import PageHeader from '@/components/PageHeader/index.vue'

const router = useRouter()

const categoryTree = [
  {
    label: '全部资源',
    value: '',
    children: [{ label: '全部二级分类', value: '' }]
  },
  {
    label: '餐饮饮品',
    value: 'food_drink',
    legacyCategory: 'other',
    children: [
      { label: '全部餐饮', value: '' },
      { label: '咖啡饮品', value: 'coffee' },
      { label: '奶茶甜品', value: 'milk_tea' },
      { label: '快餐小吃', value: 'fast_food' },
      { label: '外卖代下', value: 'delivery' },
      { label: '商超餐券', value: 'meal_coupon' }
    ]
  },
  {
    label: '视频会员',
    value: 'video_member',
    legacyCategory: 'other',
    children: [
      { label: '全部会员', value: '' },
      { label: '长视频会员', value: 'long_video' },
      { label: '短视频权益', value: 'short_video' },
      { label: '音乐会员', value: 'music' },
      { label: '网盘会员', value: 'cloud_drive' },
      { label: '联合会员', value: 'bundle' }
    ]
  },
  {
    label: '出行打车',
    value: 'travel',
    legacyCategory: 'other',
    children: [
      { label: '全部出行', value: '' },
      { label: '打车券', value: 'taxi_coupon' },
      { label: '加油洗车', value: 'car_service' },
      { label: '停车权益', value: 'parking' },
      { label: '骑行权益', value: 'bike' },
      { label: '出行月卡', value: 'travel_monthly_card' }
    ]
  },
  {
    label: '娱乐游戏',
    value: 'entertainment_game',
    legacyCategory: 'other',
    children: [
      { label: '全部娱乐', value: '' },
      { label: '游戏点卡', value: 'game_card' },
      { label: '游戏会员', value: 'game_member' },
      { label: '直播会员', value: 'live_member' },
      { label: '电影票券', value: 'movie_ticket' },
      { label: '演出娱乐', value: 'show_entertainment' }
    ]
  },
  {
    label: '办公会员',
    value: 'office_member',
    legacyCategory: 'other',
    children: [
      { label: '全部办公', value: '' },
      { label: '文档办公', value: 'document' },
      { label: '网盘存储', value: 'storage' },
      { label: 'AI 工具', value: 'ai_tools' },
      { label: '设计工具', value: 'design' },
      { label: '开发工具', value: 'dev_tools' }
    ]
  },
  {
    label: '生活权益',
    value: 'life_rights',
    legacyCategory: 'other',
    children: [
      { label: '全部生活', value: '' },
      { label: '商超购物', value: 'shopping' },
      { label: '话费流量', value: 'phone_data' },
      { label: '本地生活', value: 'local_life' },
      { label: '充值缴费', value: 'recharge_payment' },
      { label: '生活服务', value: 'life_service' }
    ]
  },
  {
    label: '邮箱资源',
    value: 'mail_resource',
    legacyCategory: 'outlook',
    children: [
      { label: '全部邮箱', value: '' },
      { label: 'Outlook 邮箱', value: 'outlook_mail' },
      { label: 'Gmail 邮箱', value: 'gmail' },
      { label: '企业邮箱', value: 'enterprise_mail' },
      { label: '三方邮箱', value: 'external_mail' },
      { label: '邮箱辅助服务', value: 'mail_service' }
    ]
  },
  {
    label: '自动化工具',
    value: 'automation_tool',
    legacyCategory: 'automation',
    children: [
      { label: '全部工具', value: '' },
      { label: '工作流', value: 'workflow' },
      { label: '插件', value: 'plugin' },
      { label: '脚本工具', value: 'script' },
      { label: '邮箱自动化', value: 'mail_automation' },
      { label: '数据处理', value: 'data_processing' }
    ]
  }
]

const resourceTypeOptions = [
  { label: '全部资源类型', value: '' },
  { label: '权益商品', value: 'rights' },
  { label: '代下单商品', value: 'proxy_order' },
  { label: '账号库存商品', value: 'account' },
  { label: '自动化工作流', value: 'workflow' },
  { label: '虚拟服务', value: 'service' }
]

const priceRangeOptions = [
  { label: '全部价格', value: '' },
  { label: '0-10 奶片', value: '0-10' },
  { label: '10-50 奶片', value: '10-50' },
  { label: '50-100 奶片', value: '50-100' },
  { label: '100+ 奶片', value: '100-' }
]

const stockStatusOptions = [
  { label: '全部状态', value: '' },
  { label: '在售', value: 'available' },
  { label: '暂时无货', value: 'sold_out' }
]

const sortOptions = [
  { label: '推荐排序', value: 'popular' },
  { label: '销量最高', value: 'popularity' },
  { label: '最新上架', value: 'newest' },
  { label: '价格从低到高', value: 'price_low' },
  { label: '价格从高到低', value: 'price_high' },
  { label: '评分最高', value: 'rating' }
]

const searchKeyword = ref('')
const selectedPrimaryCategory = ref('')
const selectedSubCategory = ref('')
const filters = ref({
  resourceType: '',
  priceRange: '',
  stockStatus: ''
})
const sortBy = ref('popular')
const workflows = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(18)
const total = ref(0)

const primaryCategories = computed(() => categoryTree)

const primaryCategoryLabels = categoryTree.reduce((acc, category) => {
  acc[category.value] = category.label
  return acc
}, {})

const secondaryCategoryLabels = categoryTree.reduce((acc, category) => {
  ;(category.children || []).forEach((child) => {
    if (child.value) acc[child.value] = child.label
  })
  return acc
}, {})

const activePrimary = computed(
  () => categoryTree.find((item) => item.value === selectedPrimaryCategory.value) || categoryTree[0]
)

const activeSubCategories = computed(() => activePrimary.value.children || [])

const activeCategoryTitle = computed(() => {
  const subCategory = activeSubCategories.value.find((item) => item.value === selectedSubCategory.value)
  if (subCategory?.value) {
    return subCategory.label
  }
  return activePrimary.value.label || '全部资源'
})

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

const visiblePages = computed(() => {
  const pages = []
  const maxVisible = 5
  let start = Math.max(1, page.value - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages.value, start + maxVisible - 1)

  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1)
  }

  for (let i = start; i <= end; i += 1) {
    pages.push(i)
  }
  return pages
})

const hasActiveFilters = computed(
  () =>
    selectedPrimaryCategory.value ||
    selectedSubCategory.value ||
    filters.value.resourceType ||
    filters.value.priceRange ||
    filters.value.stockStatus ||
    searchKeyword.value
)

const getCategoryMeta = (item) => {
  if (item.primary_category && item.secondary_category) {
    return {
      primaryLabel: item.primary_category_name || primaryCategoryLabels[item.primary_category] || item.primary_category,
      secondaryLabel: item.secondary_category_name || secondaryCategoryLabels[item.secondary_category] || item.secondary_category
    }
  }

  if (item.category === 'outlook') {
    return { primaryLabel: '邮箱资源', secondaryLabel: 'Outlook 邮箱' }
  }

  if (item.category === 'automation') {
    return { primaryLabel: '自动化工具', secondaryLabel: '工作流' }
  }

  if (item.category === 'mailbox') {
    return { primaryLabel: '邮箱资源', secondaryLabel: '三方邮箱' }
  }

  return { primaryLabel: '自动化工具', secondaryLabel: '工作流' }
}

const getResourceType = (item) => {
  if (item.resource_type) {
    return item.resource_type
  }
  if (item.category === 'outlook') {
    return 'account'
  }
  return 'workflow'
}

const resourceTypeLabels = {
  rights: '权益商品',
  proxy_order: '代下单',
  account: '账号库存',
  workflow: '工作流',
  service: '虚拟服务'
}

const getStockStatus = (item) => {
  if (item.stock_status) {
    return item.stock_status
  }
  if (item.inventory_enabled && Number(item.inventory_count || 0) <= 0) {
    return 'sold_out'
  }
  return 'available'
}

const normalizeImageList = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean)
  }
  if (typeof value !== 'string' || !value.trim()) {
    return []
  }
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch (error) {
    return value.trim() ? [value.trim()] : []
  }
}

const getProductCover = (item) => {
  const screenshots = normalizeImageList(item.screenshots)
  return item.icon_url || item.cover_url || screenshots[0] || ''
}

const displayProducts = computed(() =>
  workflows.value.map((item) => {
    const categoryMeta = getCategoryMeta(item)
    const resourceType = getResourceType(item)
    const stockStatus = getStockStatus(item)
    const skus = Array.isArray(item.skus) ? item.skus : []
    const skuPrices = skus.map((sku) => Number(sku.sell_price ?? sku.price ?? sku.milk_coin_price ?? 0)).filter((price) => price > 0)
    const price = Number(item.min_price ?? (skuPrices.length ? Math.min(...skuPrices) : item.milk_coin_price) ?? 0)
    const tags = [
      item.pricing_model === 'per_use' ? '按次购买' : '',
      item.trial_enabled ? '可试用' : '',
      resourceType === 'workflow' ? '自动化' : '自动发货'
    ].filter(Boolean)

    return {
      ...item,
      cover_url: getProductCover(item),
      short_name: String(item.name || '资源').slice(0, 4),
      primary_category_label: categoryMeta.primaryLabel,
      secondary_category_label: categoryMeta.secondaryLabel,
      resource_type: resourceType,
      resource_type_label: resourceTypeLabels[resourceType] || '资源',
      stock_status: stockStatus,
      stock_status_label: stockStatus === 'sold_out' ? '暂时无货' : '在售',
      price_text: item.pricing_model === 'free' ? '免费' : `${price} 奶片`,
      price_suffix: item.pricing_model === 'free' ? '' : resourceType === 'workflow' ? '起' : '起售',
      tags,
      sales_text: `${Number(item.purchase_count || item.total_calls || 0)} 次购买`
    }
  })
)

const loadWorkflows = async () => {
  loading.value = true

  try {
    let minPrice = null
    let maxPrice = null
    if (filters.value.priceRange) {
      const [min, max] = filters.value.priceRange.split('-')
      minPrice = min ? Number(min) : null
      maxPrice = max ? Number(max) : null
    }

    const params = {
      category: activePrimary.value.legacyCategory || selectedPrimaryCategory.value || null,
      primary_category: selectedPrimaryCategory.value || null,
      resource_type: filters.value.resourceType || null,
      secondary_category: selectedSubCategory.value || null,
      min_price: minPrice,
      max_price: maxPrice,
      stock_status: filters.value.stockStatus || null,
      keyword: searchKeyword.value || null,
      sort_by: sortBy.value,
      page: page.value,
      page_size: pageSize.value
    }

    const res = await getMarketWorkflows(params)
    if (res.code === 0) {
      workflows.value = res.data.items || []
      total.value = res.data.total || 0
    }
  } catch (error) {
    console.error('加载资源市场失败:', error)
    workflows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const selectPrimaryCategory = (value) => {
  selectedPrimaryCategory.value = value
  selectedSubCategory.value = ''
  page.value = 1
  loadWorkflows()
}

const selectSubCategory = (value) => {
  selectedSubCategory.value = value
  page.value = 1
  loadWorkflows()
}

const searchWorkflows = () => {
  page.value = 1
  loadWorkflows()
}

const clearFilters = () => {
  searchKeyword.value = ''
  selectedPrimaryCategory.value = ''
  selectedSubCategory.value = ''
  filters.value = {
    resourceType: '',
    priceRange: '',
    stockStatus: ''
  }
  sortBy.value = 'popular'
  page.value = 1
  loadWorkflows()
}

const changePage = (newPage) => {
  if (newPage < 1 || newPage > totalPages.value) return
  page.value = newPage
  loadWorkflows()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const viewResource = (resource) => {
  router.push(resource.detail_path || `/market/workflow/${resource.id}`)
}

const handleCardImageError = (event) => {
  event.target.style.display = 'none'
}

watch([filters, sortBy], () => {
  page.value = 1
  loadWorkflows()
}, { deep: true })

onMounted(() => {
  loadWorkflows()
})
</script>
