<template>
  <div class="space-y-5">
    <div class="grid gap-4 md:grid-cols-3">
      <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-gray-500">供货商</p>
        <p class="mt-2 text-3xl font-semibold text-gray-900">{{ sources.length }}</p>
        <p class="mt-1 text-xs text-gray-500">已接入的货源账号</p>
      </div>
      <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-gray-500">货源池</p>
        <p class="mt-2 text-3xl font-semibold text-gray-900">{{ poolPagination.total }}</p>
        <p class="mt-1 text-xs text-gray-500">第三方同步来的原始货源</p>
      </div>
      <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-gray-500">待处理预警</p>
        <p class="mt-2 text-3xl font-semibold text-gray-900">{{ alertPagination.total }}</p>
        <p class="mt-1 text-xs text-gray-500">成本变化和亏损风险</p>
      </div>
    </div>

    <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div class="flex flex-wrap items-center gap-3">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="rounded-full px-4 py-2 text-sm font-medium transition-colors"
          :class="activeTab === tab.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
        <div class="ml-auto flex flex-wrap items-center gap-2">
          <input
            v-if="activeTab === 'pool' || activeTab === 'mappings' || activeTab === 'alerts'"
            v-model.trim="filters.keyword"
            class="h-10 w-64 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="搜商品名 / 供货商编号"
            @keyup.enter="reloadActiveList"
          />
          <button
            v-if="activeTab === 'pool' || activeTab === 'mappings' || activeTab === 'alerts'"
            class="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
            @click="reloadActiveList"
          >
            查询
          </button>
          <button
            class="h-10 rounded-lg bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="syncing"
            @click="syncBanfang"
          >
            {{ syncing ? '同步中...' : '同步半方商品' }}
          </button>
        </div>
      </div>
    </div>

    <AdminDataTable
      v-if="activeTab === 'pool'"
      :loading="poolLoading"
      :pagination="{ ...poolPagination, totalPages: poolTotalPages }"
      :column-count="5"
      @page-change="changePoolPage"
    >
      <template #header>
        <div class="space-y-3">
          <h2 class="text-xl font-semibold text-black">供货商商品池</h2>
          <div class="flex flex-wrap gap-2">
            <button
              class="rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
              :class="!filters.providerCategoryId ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
              @click="selectProviderCategory('')"
            >
              全部
            </button>
            <button
              v-for="category in rootProviderCategories"
              :key="category.provider_category_id"
              class="rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
              :class="filters.providerCategoryId === category.provider_category_id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
              @click="selectProviderCategory(category.provider_category_id)"
            >
              {{ category.name }}
            </button>
          </div>
        </div>
      </template>
      <template #thead>
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">供货商商品</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">编号</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">供货商类目</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">成本</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">参数</th>
        </tr>
      </template>
      <template #tbody>
        <template v-if="providerProducts.length > 0">
          <tr v-for="item in providerProducts" :key="item.id" class="hover:bg-gray-50">
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <img
                  v-if="item.provider_image_url"
                  :src="item.provider_image_url"
                  class="h-11 w-11 shrink-0 rounded-xl border border-gray-100 object-cover"
                />
                <div v-else class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xs text-gray-400">无图</div>
                <div class="min-w-0">
                  <div class="max-w-[320px] truncate text-sm font-medium text-gray-900">{{ item.provider_product_title }}</div>
                  <div class="text-xs text-gray-500">{{ item.source_name }}</div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-700">{{ item.provider_product_no }}</td>
            <td class="px-6 py-4">
              <div class="max-w-[320px] truncate text-sm text-gray-700">{{ item.provider_category_path || '-' }}</div>
            </td>
            <td class="px-6 py-4 text-sm">
              <div class="font-semibold text-orange-600">{{ money(item.cost_price) }} 奶片</div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-700">
              <span v-if="item.order_fields?.length">{{ item.order_fields.map(field => field.label || field.name).join('、') }}</span>
              <span v-else class="text-gray-400">无需参数</span>
            </td>
          </tr>
        </template>
        <tr v-else>
          <td colspan="5" class="px-6 py-12 text-center text-sm text-gray-500">暂无可售候选货源</td>
        </tr>
      </template>
    </AdminDataTable>

    <AdminDataTable
      v-if="activeTab === 'alerts'"
      :loading="alertLoading"
      :pagination="{ ...alertPagination, totalPages: alertTotalPages }"
      :column-count="6"
      @page-change="changeAlertPage"
    >
      <template #header>
        <h2 class="text-xl font-semibold text-black">成本预警</h2>
        <p class="mt-1 text-sm text-gray-500">只记录供货成本变化，不计算利润。</p>
      </template>
      <template #thead>
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">商品</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">编号</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">供货商商品</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">供货商编号</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">成本变化</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">提醒</th>
        </tr>
      </template>
      <template #tbody>
        <template v-if="alerts.length > 0">
          <tr v-for="item in alerts" :key="item.id" class="hover:bg-gray-50">
            <td class="px-6 py-4">
              <div class="max-w-[260px] truncate text-sm font-medium text-gray-900">{{ item.workflow_name }}</div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-700">{{ skuNo(item.local_sku_id) }}</td>
            <td class="px-6 py-4">
              <div class="max-w-[220px] truncate text-sm text-gray-900">{{ item.provider_product_title }}</div>
              <div class="text-xs text-gray-500">{{ item.source_name }}</div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-700">{{ item.provider_product_no }}</td>
            <td class="px-6 py-4 text-sm">
              <div class="font-semibold text-gray-900">{{ money(item.old_cost) }} → {{ money(item.new_cost) }}</div>
              <div class="text-xs" :class="Number(item.cost_change_rate) >= 0 ? 'text-orange-600' : 'text-green-600'">
                {{ Number(item.cost_change_rate) >= 0 ? '+' : '' }}{{ Number(item.cost_change_rate || 0).toFixed(2) }}%
              </div>
            </td>
            <td class="px-6 py-4">
              <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="alertLevelClass(item.alert_level)">
                {{ costAlertText(item) }}
              </span>
            </td>
          </tr>
        </template>
        <tr v-else>
          <td colspan="6" class="px-6 py-12 text-center text-sm text-gray-500">暂无成本预警</td>
        </tr>
      </template>
    </AdminDataTable>

    <AdminDataTable
      v-if="activeTab === 'mappings'"
      :loading="mappingLoading"
      :pagination="{ ...pagination, totalPages }"
      :column-count="5"
      @page-change="changePage"
    >
      <template #header>
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-semibold text-black">SKU 货源</h2>
          </div>
          <span class="rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700">
            默认规则：最低成本
          </span>
        </div>
      </template>
      <template #thead>
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">本地 SKU</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">编号</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">对应货源</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">价格</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">下单参数</th>
        </tr>
      </template>
      <template #tbody>
        <template v-if="visibleMappings.length > 0">
          <tr v-for="item in visibleMappings" :key="item.id" class="hover:bg-gray-50">
            <td class="px-6 py-4">
              <div class="max-w-[280px] truncate text-sm font-medium text-gray-900">{{ item.workflow_name }}</div>
              <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span>{{ categoryText(item.primary_category, item.secondary_category) }}</span>
              </div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-700">{{ skuNo(item.local_sku_id) }}</td>
            <td class="px-6 py-4">
              <div class="max-w-[280px] truncate text-sm font-medium text-gray-900">{{ item.provider_product_title }}</div>
              <div class="text-xs text-gray-500">{{ item.source_name }} / 编号 {{ item.provider_product_no }}</div>
            </td>
            <td class="px-6 py-4 text-sm">
              <div class="font-semibold text-orange-600">{{ money(item.cost_price) }} 奶片</div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-700">
              <span v-if="item.order_fields?.length">{{ item.order_fields.map(field => field.label || field.name).join('、') }}</span>
              <span v-else class="text-gray-400">无需参数</span>
            </td>
          </tr>
        </template>
        <tr v-else>
          <td colspan="5" class="px-6 py-12 text-center text-sm text-gray-500">
            {{ mappings.length > 0 ? '本页货源均为 0 成本或异常，已隐藏' : '暂无 SKU 货源' }}
          </td>
        </tr>
      </template>
    </AdminDataTable>

    <AdminDataTable
      v-if="activeTab === 'sources'"
      :column-count="4"
      :pagination="null"
    >
      <template #header>
        <h2 class="text-xl font-semibold text-black">供货商</h2>
        <p class="mt-1 text-sm text-gray-500">已接入的供货账号和接口网关。</p>
      </template>
      <template #thead>
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">供货商</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">接口网关</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">用户 ID</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">优先级</th>
        </tr>
      </template>
      <template #tbody>
        <template v-if="sources.length > 0">
          <tr v-for="source in sources" :key="source.id" class="hover:bg-gray-50">
            <td class="px-6 py-4">
              <div class="text-sm font-medium text-gray-900">{{ source.name }}</div>
              <div class="text-xs text-gray-500">{{ source.code }} / {{ source.provider_type }}</div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-700">
              <div class="max-w-[360px] truncate">{{ source.base_url || '-' }}</div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-700">{{ source.api_key || '-' }}</td>
            <td class="px-6 py-4 text-sm text-gray-700">{{ source.priority }}</td>
          </tr>
        </template>
        <tr v-else>
          <td colspan="4" class="px-6 py-12 text-center text-sm text-gray-500">暂无供货商</td>
        </tr>
      </template>
    </AdminDataTable>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  getResourceCostAlerts,
  getResourceProviderCategories,
  getResourceProviderProducts,
  getResourceSkuMappings,
  getResourceSources,
  syncBanfangProducts
} from '@/api/resourceMarket'
import { showMessage } from '@/utils/message'
import AdminDataTable from '@/components/AdminDataTable/index.vue'

const tabs = [
  { key: 'alerts', label: '成本预警' },
  { key: 'pool', label: '货源池' },
  { key: 'mappings', label: 'SKU 货源' },
  { key: 'sources', label: '供货商' }
]

const activeTab = ref('alerts')
const sources = ref<any[]>([])
const providerCategories = ref<any[]>([])
const providerProducts = ref<any[]>([])
const mappings = ref<any[]>([])
const alerts = ref<any[]>([])
const poolLoading = ref(false)
const mappingLoading = ref(false)
const alertLoading = ref(false)
const syncing = ref(false)

const filters = reactive({
  keyword: '',
  providerCategoryId: ''
})

const pagination = reactive({
  page: 1,
  page_size: 20,
  total: 0
})

const poolPagination = reactive({
  page: 1,
  page_size: 20,
  total: 0
})

const alertPagination = reactive({
  page: 1,
  page_size: 20,
  total: 0
})

const totalPages = computed(() => Math.max(1, Math.ceil(pagination.total / pagination.page_size)))
const poolTotalPages = computed(() => Math.max(1, Math.ceil(poolPagination.total / poolPagination.page_size)))
const alertTotalPages = computed(() => Math.max(1, Math.ceil(alertPagination.total / alertPagination.page_size)))
const hasUsefulCost = (item: any) => Number(item?.cost_price || 0) > 0
const visibleMappings = computed(() => mappings.value.filter(hasUsefulCost))
const rootProviderCategories = computed(() => providerCategories.value.filter(item => Number(item.level || 0) === 1))

const loadBaseData = async () => {
  const sourceRes = await getResourceSources()
  if (sourceRes.code === 0) sources.value = sourceRes.data || []
}

const loadProviderCategories = async () => {
  const res = await getResourceProviderCategories({ level: 1 })
  if (res.code === 0) providerCategories.value = res.data || []
}

const loadProviderProducts = async () => {
  poolLoading.value = true
  try {
    const res = await getResourceProviderProducts({
      keyword: filters.keyword || undefined,
      provider_category_id: filters.providerCategoryId || undefined,
      only_saleable: true,
      page: poolPagination.page,
      page_size: poolPagination.page_size
    })
    if (res.code === 0 && res.data) {
      providerProducts.value = res.data.items || []
      poolPagination.total = res.data.total || 0
      poolPagination.page = res.data.page || poolPagination.page
      poolPagination.page_size = res.data.page_size || poolPagination.page_size
    } else {
      showMessage(res.message || '加载货源池失败', 'error')
    }
  } finally {
    poolLoading.value = false
  }
}

const loadMappings = async () => {
  mappingLoading.value = true
  try {
    const res = await getResourceSkuMappings({
      keyword: filters.keyword || undefined,
      page: pagination.page,
      page_size: pagination.page_size
    })
    if (res.code === 0 && res.data) {
      mappings.value = res.data.items || []
      pagination.total = res.data.total || 0
      pagination.page = res.data.page || pagination.page
      pagination.page_size = res.data.page_size || pagination.page_size
    } else {
      showMessage(res.message || '加载 SKU 货源失败', 'error')
    }
  } finally {
    mappingLoading.value = false
  }
}

const loadAlerts = async () => {
  alertLoading.value = true
  try {
    const res = await getResourceCostAlerts({
      keyword: filters.keyword || undefined,
      status: 'pending',
      page: alertPagination.page,
      page_size: alertPagination.page_size
    })
    if (res.code === 0 && res.data) {
      alerts.value = res.data.items || []
      alertPagination.total = res.data.total || 0
      alertPagination.page = res.data.page || alertPagination.page
      alertPagination.page_size = res.data.page_size || alertPagination.page_size
    } else {
      showMessage(res.message || '加载成本预警失败', 'error')
    }
  } finally {
    alertLoading.value = false
  }
}

const reloadMappings = () => {
  pagination.page = 1
  return loadMappings()
}

const reloadProviderProducts = () => {
  poolPagination.page = 1
  return loadProviderProducts()
}

const selectProviderCategory = (categoryId: string) => {
  filters.providerCategoryId = categoryId
  reloadProviderProducts()
}

const reloadAlerts = () => {
  alertPagination.page = 1
  return loadAlerts()
}

const reloadActiveList = () => {
  if (activeTab.value === 'alerts') return reloadAlerts()
  if (activeTab.value === 'pool') return reloadProviderProducts()
  if (activeTab.value === 'mappings') return reloadMappings()
}

const changePoolPage = (page: number) => {
  poolPagination.page = page
  loadProviderProducts()
}

const changePage = (page: number) => {
  pagination.page = page
  loadMappings()
}

const changeAlertPage = (page: number) => {
  alertPagination.page = page
  loadAlerts()
}

const syncBanfang = async () => {
  syncing.value = true
  try {
    const res = await syncBanfangProducts({
      limit: 10,
      page_size: 50,
      product_type: 0,
      supply_goods: false,
      use_provider_categories: true
    })
    if (res.code === 0) {
      showMessage(`同步成功：${res.data?.category_count || 0} 个类目，${res.data?.product_count || 0} 个商品`, 'success')
      await Promise.all([loadBaseData(), loadProviderCategories(), reloadProviderProducts(), reloadMappings(), reloadAlerts()])
    } else {
      showMessage(res.message || '同步失败', 'error')
    }
  } catch (error) {
    console.error('同步半方商品失败:', error)
    showMessage('同步半方商品失败', 'error')
  } finally {
    syncing.value = false
  }
}

const money = (value: any) => {
  const amount = Number(value || 0)
  return amount.toFixed(2)
}

const primaryCategoryLabels: Record<string, string> = {
  food_drink: '餐饮饮品',
  video_member: '视频会员',
  travel_ride: '出行打车',
  entertainment_game: '娱乐游戏',
  office_member: '办公会员',
  life_rights: '生活权益',
  mail_resource: '邮箱资源',
  automation_tool: '自动化工具'
}

const secondaryCategoryLabels: Record<string, string> = {
  coffee_drink: '咖啡饮品',
  milk_tea: '奶茶饮品',
  fast_food: '快餐小吃',
  long_video: '长视频会员',
  music_audio: '音乐音频',
  learning_member: '学习会员',
  ride_coupon: '打车券',
  travel_coupon: '出行权益',
  game_card: '游戏点卡',
  entertainment_coupon: '娱乐权益',
  cloud_storage: '网盘存储',
  office_suite: '办公套件',
  design_tool: '设计工具',
  life_service: '生活服务',
  recharge_payment: '充值缴费',
  outlook_mail: 'Outlook 邮箱',
  mail_account: '邮箱账号',
  automation_script: '自动化脚本',
  account_acquire: '账号获取',
  document_convert: '文档转换',
  other: '其它'
}

const categoryText = (primary?: string, secondary?: string) => {
  const primaryText = primaryCategoryLabels[primary || ''] || primary || '未分类'
  const secondaryText = secondaryCategoryLabels[secondary || ''] || secondary || '未分类'
  return `${primaryText} / ${secondaryText}`
}

const skuNo = (skuId?: string) => {
  if (!skuId) return '-'
  const parts = String(skuId).split('-')
  return parts[parts.length - 1] || skuId
}

const costAlertText = (item: any) => {
  const oldCost = Number(item.old_cost || 0)
  const newCost = Number(item.new_cost || 0)
  if (newCost > oldCost) return '成本上涨'
  if (newCost < oldCost) return '成本下降'
  return '成本变化'
}

const alertLevelClass = (level: string) => {
  if (level === 'danger') return 'bg-red-50 text-red-700'
  if (level === 'warning') return 'bg-orange-50 text-orange-700'
  return 'bg-blue-50 text-blue-700'
}

watch(activeTab, async (tab) => {
  if (tab === 'alerts') {
    await loadAlerts()
  }
  if (tab === 'pool') {
    await loadProviderCategories()
    await loadProviderProducts()
  }
  if (tab === 'sources') {
    await loadBaseData()
  }
})

onMounted(async () => {
  await Promise.all([loadBaseData(), loadProviderCategories(), loadProviderProducts(), loadMappings(), loadAlerts()])
})
</script>
