<template>
  <div>
    <!-- 顶部导航 -->
    <PageHeader v-if="!isWorkspaceView" />
    
    <div class="min-h-screen bg-gray-50">
    <!-- 页面头部 -->
    <div class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center space-x-4">
            <button
              @click="handleBack"
              class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              返回
            </button>
            <h1 style="font-size: 14px;" class="font-bold text-black">插件商店</h1>
          </div>
          
          <!-- 搜索框 -->
          <div class="flex-1 max-w-lg mx-8">
            <BaseInput
              v-model="searchQuery"
              @enter="handleSearch"
              type="text"
              placeholder="搜索插件..."
              size="sm"
            >
              <template #left-icon>
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </template>
            </BaseInput>
          </div>
        </div>
      </div>
    </div>

    <!-- 主要内容 -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- 筛选和排序 -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
        <div class="flex flex-wrap items-center gap-4">
          <!-- 分类筛选 -->
          <div class="min-w-32">
            <CustomSelect
              v-model="selectedCategory"
              :options="categoryOptions"
              placeholder="所有分类"
              @update:modelValue="handleCategoryChange"
            />
          </div>

          <!-- 类型筛选 -->
          <div class="min-w-32">
            <CustomSelect
              v-model="selectedType"
              :options="typeOptions"
              placeholder="所有类型"
              @update:modelValue="handleTypeChange"
            />
          </div>

          <!-- 价格筛选 -->
          <div class="min-w-32">
            <CustomSelect
              v-model="priceFilter"
              :options="priceOptions"
              placeholder="所有价格"
              @update:modelValue="handlePriceChange"
            />
          </div>
        </div>

        <!-- 排序 -->
        <div class="flex items-center space-x-2">
          <span class="text-sm text-black">排序:</span>
          <div class="min-w-32">
            <CustomSelect
              v-model="sortBy"
              :options="sortOptions"
              @update:modelValue="handleSortChange"
            />
          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span class="ml-2 text-black">加载中...</span>
      </div>

      <!-- 插件网格 -->
      <div v-else-if="plugins.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        <PluginCard
          v-for="plugin in plugins"
          :key="plugin.plugin_id"
          :plugin="plugin"
          :show-price="true"
          @click="showPluginDetail(plugin)"
          class="cursor-pointer hover:shadow-lg transition-shadow"
        >
          <template #actions="{ plugin }">
            <div class="mt-4">
              <!-- 已安装的插件 -->
              <button
                v-if="isPluginInstalled(plugin.plugin_id)"
                disabled
                class="w-full bg-gray-100 text-black font-medium py-2 px-4 rounded-lg cursor-not-allowed text-sm"
              >
                已安装
              </button>
              <!-- 未安装的插件 -->
              <button
                v-else
                @click.stop="handlePluginAction(plugin)"
                :disabled="installing === plugin.plugin_id"
                class="w-full btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="installing === plugin.plugin_id">处理中...</span>
                <span v-else-if="plugin.is_free">免费安装</span>
                <span v-else-if="plugin.user_has_authorization">立即安装</span>
                <span v-else>立即购买</span>
              </button>
            </div>
          </template>
        </PluginCard>
      </div>

      <!-- 空状态 -->
      <div v-else class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2m13-8l-4 4m0 0l-4-4m4 4V3" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-black">暂无插件</h3>
        <p class="mt-1 text-sm text-black">没有找到符合条件的插件</p>
      </div>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="mt-8 flex items-center justify-between">
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            @click="changePage(currentPage - 1)"
            :disabled="currentPage <= 1"
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-black bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <button
            @click="changePage(currentPage + 1)"
            :disabled="currentPage >= totalPages"
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-black bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-black">
              显示第 <span class="font-medium">{{ (currentPage - 1) * pageSize + 1 }}</span> 到 
              <span class="font-medium">{{ Math.min(currentPage * pageSize, totalCount) }}</span> 项，
              共 <span class="font-medium">{{ totalCount }}</span> 项
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                @click="changePage(currentPage - 1)"
                :disabled="currentPage <= 1"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-black hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </button>
              
              <button
                v-for="page in visiblePages"
                :key="page"
                @click="changePage(page)"
                :class="[
                  'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                  page === currentPage
                    ? 'z-10 bg-primary-50 border-primary-500 text-primary-700'
                    : 'bg-white border-gray-300 text-black hover:bg-gray-50'
                ]"
              >
                {{ page }}
              </button>
              
              <button
                @click="changePage(currentPage + 1)"
                :disabled="currentPage >= totalPages"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-black hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- 插件详情对话框 -->
    <PluginStoreDetailModal
      v-if="showDetailDialog && selectedPlugin"
      :plugin="selectedPlugin"
      @close="showDetailDialog = false"
      @install="handlePluginInstall"
      @show-plans="handleShowPlans"
    />

    <!-- 套餐选择对话框 -->
    <PluginPlansModal
      v-if="showPlansDialog && selectedPluginForPlans"
      :plugin="selectedPluginForPlans"
      :plans="pluginPlans"
      @close="closePlansDialog"
      @purchase="handlePlanPurchase"
    />

    <!-- 授权码输入对话框 -->
    <AuthCodeModal
      v-if="showAuthCodeDialog"
      :plugin="selectedPluginForInstall"
      :loading="installing === selectedPluginForInstall?.plugin_id"
      @close="showAuthCodeDialog = false"
      @confirm="confirmInstallWithAuthCode"
    />

    <!-- 插件购买对话框 -->
    <PluginPurchaseModal
      v-if="showPurchaseDialog && selectedPluginForPurchase"
      :plugin="selectedPluginForPurchase"
      @close="closePurchaseDialog"
      @success="handlePurchaseSuccess"
    />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import PluginCard from './components/PluginCard/index.vue'
import PluginStoreDetailModal from './components/PluginStoreDetailModal/index.vue'
import PluginPlansModal from './components/PluginPlansModal/index.vue'
import AuthCodeModal from './components/AuthCodeModal/index.vue'
import PluginPurchaseModal from './components/PluginPurchaseModal/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import { pluginApi } from '@/api/plugin'
import { showMessage } from '@/utils/message'

const router = useRouter()
const route = useRoute()
const isWorkspaceView = computed(() => route.path.startsWith('/user/'))

// 响应式数据
const loading = ref(false)
const plugins = ref([])
const installedPlugins = ref([])
const installing = ref(null)

// 搜索和筛选
const searchQuery = ref('')
const selectedCategory = ref('')
const selectedType = ref('')
const priceFilter = ref('')
const sortBy = ref('install_count')

// 分页
const currentPage = ref(1)
const pageSize = 20
const totalPages = ref(0)
const totalCount = ref(0)

// 对话框
const showDetailDialog = ref(false)
const selectedPlugin = ref(null)
const showPlansDialog = ref(false)
const selectedPluginForPlans = ref(null)
const pluginPlans = ref([])
const showAuthCodeDialog = ref(false)
const selectedPluginForInstall = ref(null)
const showPurchaseDialog = ref(false)
const selectedPluginForPurchase = ref(null)

// 选项数据
const categoryOptions = [
  { label: '所有分类', value: '' },
  { label: '网页抓取', value: 'web_scraping' },
  { label: '数据处理', value: 'data_processing' },
  { label: '网络工具', value: 'network' },
  { label: '安全工具', value: 'security' },
  { label: '自动化', value: 'automation' },
  { label: '集成工具', value: 'integration' }
]

const typeOptions = [
  { label: '所有类型', value: '' },
  { label: '网页助手', value: 'crawler' },
  { label: '代理', value: 'proxy' },
  { label: '邮件', value: 'email' },
  { label: '安全', value: 'security' },
  { label: '工具', value: 'utility' }
]

const priceOptions = [
  { label: '所有价格', value: '' },
  { label: '免费', value: 'free' },
  { label: '付费', value: 'paid' }
]

const sortOptions = [
  { label: '安装量', value: 'install_count' },
  { label: '评分', value: 'rating' },
  { label: '发布时间', value: 'created_at' },
  { label: '名称', value: 'name' }
]

// 计算可见页码
const visiblePages = computed(() => {
  const pages = []
  const start = Math.max(1, currentPage.value - 2)
  const end = Math.min(totalPages.value, start + 4)
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

const handleBack = () => {
  if (isWorkspaceView.value) {
    router.push('/user/automation/plugins')
    return
  }
  router.go(-1)
}

// 获取插件列表
const fetchPlugins = async () => {
  try {
    loading.value = true
    const params = {
      page: currentPage.value,
      page_size: pageSize,
      sort_by: sortBy.value
    }
    
    if (searchQuery.value) params.search = searchQuery.value
    if (selectedCategory.value) params.category = selectedCategory.value
    if (selectedType.value) params.plugin_type = selectedType.value
    if (priceFilter.value === 'free') params.is_free = true
    if (priceFilter.value === 'paid') params.is_free = false
    
    const response = await pluginApi.getStorePlugins(params)
    
    if (response.code === 0) {
      plugins.value = response.data.plugins
      totalPages.value = Math.ceil(response.data.total / pageSize)
      totalCount.value = response.data.total
    } else {
      showMessage(response.message, 'error')
    }
  } catch (error) {
    showMessage('获取插件列表失败', 'error')
  } finally {
    loading.value = false
  }
}

// 获取已安装插件列表
const fetchInstalledPlugins = async () => {
  try {
    const response = await pluginApi.getMyPlugins()
    if (response.code === 0) {
      installedPlugins.value = response.data.map(p => p.plugin_id)
    }
  } catch (error) {
    console.error('获取已安装插件失败:', error)
  }
}

// 检查插件是否已安装
const isPluginInstalled = (pluginId) => {
  return installedPlugins.value.includes(pluginId)
}

// 搜索处理
const handleSearch = () => {
  currentPage.value = 1
  fetchPlugins()
}

// 分类变更处理
const handleCategoryChange = () => {
  currentPage.value = 1
  fetchPlugins()
}

// 类型变更处理
const handleTypeChange = () => {
  currentPage.value = 1
  fetchPlugins()
}

// 价格变更处理
const handlePriceChange = () => {
  currentPage.value = 1
  fetchPlugins()
}

// 排序变更处理
const handleSortChange = () => {
  currentPage.value = 1
  fetchPlugins()
}

// 切换页面
const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    fetchPlugins()
  }
}

// 显示插件详情
const showPluginDetail = (plugin) => {
  selectedPlugin.value = {
    ...plugin,
    is_installed: isPluginInstalled(plugin.plugin_id)
  }
  showDetailDialog.value = true
}

// 处理插件操作（免费安装 or 购买）
const handlePluginAction = (plugin) => {
  if (plugin.is_free || plugin.user_has_authorization) {
    // 免费插件或已购买的插件，直接安装
    installPlugin(plugin)
  } else {
    // 付费插件且未购买，跳转到统一购买页面
    router.push({
      path: '/purchase',
      query: {
        type: 'plugin',
        id: plugin.plugin_id
      }
    })
  }
}

// 安装插件
const installPlugin = async (plugin) => {
  // 免费插件或已购买的插件，直接安装
  if (plugin.is_free || plugin.user_has_authorization) {
    if (plugin.user_has_authorization && !plugin.is_free) {
      showMessage('检测到您已购买，正在安装插件...', 'success')
    }
    await performInstall(plugin.plugin_id)
  } else {
    // 付费插件且未购买，提示先购买
    showMessage('请先购买插件', 'warning')
  }
}

// 关闭购买对话框
const closePurchaseDialog = () => {
  showPurchaseDialog.value = false
  selectedPluginForPurchase.value = null
}

// 购买成功处理
const handlePurchaseSuccess = async () => {
  showMessage('购买成功，插件已自动开通！', 'success')
  closePurchaseDialog()
  
  // 重新获取已安装插件列表
  await fetchInstalledPlugins()
  // 刷新插件列表
  await fetchPlugins()
}

// 执行安装
const performInstall = async (pluginId) => {
  try {
    installing.value = pluginId
    
    const response = await pluginApi.installPlugin({ plugin_id: pluginId })

    if (response.code === 0) {
      showMessage('插件安装成功', 'success')
      // 重新获取已安装插件列表
      await fetchInstalledPlugins()
      // 更新插件列表中的安装状态
      const plugin = plugins.value.find(p => p.plugin_id === pluginId)
      if (plugin) {
        plugin.install_count += 1
      }
    } else {
      showMessage(response.message, 'error')
    }
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message || '插件安装失败'
    showMessage(errorMsg, 'error')
  } finally {
    installing.value = null
  }
}

// 使用授权码确认安装
const confirmInstallWithAuthCode = async (authCodeData) => {
  if (selectedPluginForInstall.value) {
    const authCode = typeof authCodeData === 'string' ? authCodeData : authCodeData.authCode
    
    try {
      installing.value = selectedPluginForInstall.value.plugin_id
      
      const data = { 
        plugin_id: selectedPluginForInstall.value.plugin_id,
        auth_code: authCode 
      }
      
      const response = await pluginApi.installPlugin(data)

      if (response.code === 0) {
        showMessage('插件安装成功')
        // 更新插件列表中的安装状态
        const plugin = plugins.value.find(p => p.plugin_id === selectedPluginForInstall.value?.plugin_id)
        if (plugin) {
          plugin.install_count += 1
        }
        // 安装成功才关闭弹窗
        showAuthCodeDialog.value = false
        selectedPluginForInstall.value = null
        // 重新获取已安装插件列表
        await fetchInstalledPlugins()
      } else {
        // 安装失败立即重置installing状态
        installing.value = null
        // 安装失败不关闭弹窗
        showMessage(response.message || '插件安装失败', 'error')
      }
    } catch (error) {
      // 出错立即重置installing状态
      installing.value = null
      // 安装失败不关闭弹窗
      const errorMsg = error.response?.data?.message || error.message || '插件安装失败'
      showMessage(errorMsg, 'error')
    } finally {
      // 确保installing状态总是被重置
      if (installing.value) {
        installing.value = null
      }
    }
  }
}

// 处理插件安装（从详情对话框）- 子组件已经完成安装，这里只需要刷新列表
const handlePluginInstall = async (plugin) => {
  // 刷新已安装插件列表
  await fetchInstalledPlugins()
  // 刷新商店插件列表以更新安装状态
  await fetchPlugins()
}

// 显示套餐选择
const handleShowPlans = async (plugin) => {
  try {
    // 获取插件套餐
    const response = await pluginApi.getPluginPlans(plugin.plugin_id)
    if (response.code === 0) {
      selectedPluginForPlans.value = plugin
      pluginPlans.value = response.data.plans
      showDetailDialog.value = false
      showPlansDialog.value = true
    } else {
      showMessage(response.message, 'error')
    }
  } catch (error) {
    showMessage('获取套餐信息失败', 'error')
  }
}

// 关闭套餐对话框
const closePlansDialog = () => {
  showPlansDialog.value = false
  selectedPluginForPlans.value = null
  pluginPlans.value = []
}

// 处理套餐购买
const handlePlanPurchase = async (purchaseData) => {
  try {
    const response = await pluginApi.purchasePluginPlan(
      purchaseData.plugin_id,
      purchaseData.plan_id,
      purchaseData.auth_code
    )
    
    if (response.code === 0) {
      showMessage('套餐激活成功')
      closePlansDialog()
      // 重新获取已安装插件列表
      await fetchInstalledPlugins()
    } else {
      showMessage(response.message, 'error')
    }
  } catch (error) {
    showMessage('套餐激活失败', 'error')
  }
}

// 组件挂载时获取数据
onMounted(() => {
  fetchPlugins()
  fetchInstalledPlugins()
})
</script>
