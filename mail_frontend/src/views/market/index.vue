<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 页面标题 -->
    <PageHeader title="资源市场" subtitle="浏览和购买各类数字资源" />

    <!-- 顶部搜索和筛选 -->
    <div class="bg-white shadow-sm sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <!-- 搜索框 -->
        <div class="mb-4">
          <div class="relative">
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="搜索资源名称、描述、关键词..."
              class="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              @keyup.enter="searchWorkflows"
            />
            <svg class="absolute left-4 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <!-- 筛选条件 -->
        <div class="flex flex-wrap gap-4">
          <!-- 分类 -->
          <CustomSelect
            v-model="filters.category"
            :options="categoryOptions"
            placeholder="全部分类"
          />

          <!-- 计费模式 -->
          <CustomSelect
            v-model="filters.pricingModel"
            :options="pricingModelOptions"
            placeholder="全部类型"
          />

          <!-- 价格范围 -->
          <CustomSelect
            v-model="filters.priceRange"
            :options="priceRangeOptions"
            placeholder="全部价格"
          />

          <!-- 排序 -->
          <CustomSelect
            v-model="sortBy"
            :options="sortOptions"
            placeholder="排序方式"
          />

          <!-- 清空筛选 -->
          <button
            v-if="hasActiveFilters"
            @click="clearFilters"
            class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            清空筛选
          </button>
        </div>
      </div>
    </div>

    <!-- 工作流列表 -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- 加载状态 -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="i in 6" :key="i" class="bg-white rounded-lg shadow p-6 animate-pulse">
          <div class="h-40 bg-gray-200 rounded mb-4"></div>
          <div class="h-4 bg-gray-200 rounded mb-2"></div>
          <div class="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>

      <!-- 工作流卡片 -->
      <div v-else-if="workflows.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="workflow in workflows"
          :key="workflow.id"
          class="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
          @click="viewWorkflow(workflow.id)"
        >
          <!-- 封面图 -->
          <div class="relative h-48 rounded-t-lg overflow-hidden">
            <!-- 默认渐变背景 - 使用主题色 -->
            <div v-if="!workflow.icon_url" class="absolute inset-0 bg-gradient-workflow flex items-center justify-center">
              <svg class="w-20 h-20 text-white opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <!-- 用户上传的封面图 -->
            <img
              v-else
              :src="workflow.icon_url"
              :alt="workflow.name"
              class="w-full h-full object-cover"
              @error="$event.target.style.display='none'"
            />
            <!-- 标签 -->
            <div class="absolute top-3 left-3 flex gap-2">
              <span
                v-if="workflow.pricing_model === 'free'"
                class="px-2 py-1 text-xs bg-green-500 text-white rounded shadow-lg"
              >
                免费
              </span>
              <span
                v-if="workflow.trial_enabled"
                class="px-2 py-1 text-xs bg-blue-500 text-white rounded shadow-lg"
              >
                可试用
              </span>
            </div>
          </div>

          <!-- 内容 -->
          <div class="p-4">
            <!-- 标题和评分 -->
            <div class="flex justify-between items-start mb-2">
              <h3 class="text-lg font-semibold text-gray-900 line-clamp-1">{{ workflow.name }}</h3>
              <div class="flex items-center ml-2">
                <svg class="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span class="ml-1 text-sm text-gray-600">{{ workflow.rating || 0 }}</span>
              </div>
            </div>

            <!-- 描述 -->
            <p class="text-sm text-gray-600 mb-3 line-clamp-2">{{ workflow.description }}</p>

            <!-- 统计信息 -->
            <div class="flex items-center text-xs text-gray-500 mb-3">
              <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{{ workflow.total_calls || 0 }} 次使用</span>
            </div>

            <!-- 作者和价格 -->
            <div class="flex justify-between items-center pt-3 border-t border-gray-200">
              <div class="flex items-center">
                <!-- 作者头像 - 默认使用主题色 -->
                <div v-if="!workflow.author_avatar" class="h-6 w-6 rounded-full bg-gradient-workflow flex items-center justify-center mr-2">
                  <span class="text-white text-xs font-semibold">{{ workflow.author_name?.charAt(0)?.toUpperCase() || 'A' }}</span>
                </div>
                <img
                  v-else
                  :src="workflow.author_avatar"
                  :alt="workflow.author_name"
                  class="h-6 w-6 rounded-full mr-2"
                  @error="$event.target.style.display='none'"
                />
                <span class="text-sm text-gray-600">{{ workflow.author_name }}</span>
              </div>

              <div class="text-right">
                <div v-if="workflow.pricing_model === 'free'" class="text-green-600 font-semibold">
                  免费
                </div>
                <div v-else>
                  <div class="text-lg font-bold text-primary-600">
                    {{ workflow.milk_coin_price }}奶片
                    <span class="text-xs font-normal text-gray-500">
                      {{ getPricingModelText(workflow.pricing_model) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">没有找到工作流</h3>
        <p class="mt-1 text-sm text-gray-500">试试调整筛选条件</p>
      </div>

      <!-- 分页 -->
      <div v-if="total > pageSize" class="flex justify-center mt-8">
        <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
          <button
            @click="changePage(page - 1)"
            :disabled="page === 1"
            class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <button
            v-for="p in visiblePages"
            :key="p"
            @click="changePage(p)"
            :class="[
              p === page
                ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50',
              'relative inline-flex items-center px-4 py-2 border text-sm font-medium'
            ]"
          >
            {{ p }}
          </button>
          <button
            @click="changePage(page + 1)"
            :disabled="page === totalPages"
            class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </nav>
      </div>
    </div>
  </div>

</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getMarketWorkflows } from '@/api/workflowMarket'
import PageHeader from '@/components/PageHeader/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'

const router = useRouter()

// 选项数据
const categoryOptions = [
  { label: '全部分类', value: '' },
  { label: '数据处理', value: 'data' },
  { label: '文档转换', value: 'document' },
  { label: '图片处理', value: 'image' },
  { label: 'Outlook 邮箱', value: 'outlook' },
  { label: '数据采集', value: 'scraping' },
  { label: '自动化', value: 'automation' },
  { label: '其他', value: 'other' }
]

const pricingModelOptions = [
  { label: '全部类型', value: '' },
  { label: '免费', value: 'free' },
  { label: '一次性购买', value: 'one_time' },
  { label: '订阅制', value: 'subscription' },
  { label: '按次计费', value: 'per_use' }
]

const priceRangeOptions = [
  { label: '全部价格', value: '' },
  { label: '0-50 奶片', value: '0-50' },
  { label: '50-100 奶片', value: '50-100' },
  { label: '100-200 奶片', value: '100-200' },
  { label: '200+ 奶片', value: '200-' }
]

const sortOptions = [
  { label: '最热门', value: 'popular' },
  { label: '最新上架', value: 'latest' },
  { label: '价格从低到高', value: 'price_asc' },
  { label: '价格从高到低', value: 'price_desc' },
  { label: '评分最高', value: 'rating' }
]

// 搜索和筛选
const searchKeyword = ref('')
const filters = ref({
  category: '',
  pricingModel: '',
  priceRange: ''
})
const sortBy = ref('popular')

// 工作流列表
const workflows = ref([])
const loading = ref(false)

// 分页
const page = ref(1)
const pageSize = ref(18)
const total = ref(0)

// 计算总页数
const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

// 可见页码
const visiblePages = computed(() => {
  const pages = []
  const maxVisible = 5
  let start = Math.max(1, page.value - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages.value, start + maxVisible - 1)

  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

// 是否有筛选条件
const hasActiveFilters = computed(() => {
  return filters.value.category || filters.value.pricingModel || filters.value.priceRange || searchKeyword.value
})

// 加载工作流列表
const loadWorkflows = async () => {
  loading.value = true

  try {
    // 解析价格范围
    let minPrice = null
    let maxPrice = null
    if (filters.value.priceRange) {
      const [min, max] = filters.value.priceRange.split('-')
      minPrice = min ? parseFloat(min) : null
      maxPrice = max ? parseFloat(max) : null
    }

    // 调用API
    const params = {
      category: filters.value.category || null,
      pricing_model: filters.value.pricingModel || null,
      min_price: minPrice,
      max_price: maxPrice,
      keyword: searchKeyword.value || null,
      sort_by: sortBy.value,
      page: page.value,
      page_size: pageSize.value
    }

    const res = await getMarketWorkflows(params)

    console.log('Market workflows response:', res)

    if (res.code === 0) {
      workflows.value = res.data.items || []
      total.value = res.data.total || 0
    }
  } catch (error) {
    console.error('加载工作流列表失败:', error)
    workflows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 搜索工作流
const searchWorkflows = () => {
  page.value = 1
  loadWorkflows()
}

// 清空筛选
const clearFilters = () => {
  searchKeyword.value = ''
  filters.value = {
    category: '',
    pricingModel: '',
    priceRange: ''
  }
  sortBy.value = 'popular'
  page.value = 1
  loadWorkflows()
}

// 切换页码
const changePage = (newPage) => {
  if (newPage < 1 || newPage > totalPages.value) return
  page.value = newPage
  loadWorkflows()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 查看工作流详情
const viewWorkflow = (id) => {
  router.push(`/market/workflow/${id}`)
}

// 获取计费模式文本
const getPricingModelText = (model) => {
  const texts = {
    'free': '',
    'one_time': '买断',
    'subscription': '/月',
    'per_use': '/次'
  }
  return texts[model] || ''
}

// 监听筛选条件变化
watch([filters, sortBy], () => {
  page.value = 1
  loadWorkflows()
}, { deep: true })

onMounted(() => {
  loadWorkflows()
})
</script>
