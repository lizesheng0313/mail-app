<template>
  <div>
    <!-- 顶部导航 -->
    <PageHeader v-if="!isWorkspaceView" />
    
    <div class="min-h-screen bg-gray-50">
    <!-- 页面头部 -->
    <div class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 style="font-size: 14px;" class="font-bold text-black">我的插件</h1>
            <p class="mt-1 text-sm text-black">管理和配置您的插件</p>
          </div>
          <div class="flex space-x-3">
            <button
              @click="router.push(pluginStorePath)"
              class="inline-flex items-center btn-primary text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              插件商店
            </button>

          </div>
        </div>
      </div>
    </div>

    <!-- 主要内容 -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- 我的插件 -->
      <div class="bg-white shadow rounded-lg">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h2 style="font-size: 14px;" class="font-medium text-black">我的插件</h2>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-success-800">
              {{ myPlugins.length }} 个插件
            </span>
          </div>
        </div>

        <div class="p-6">
          <!-- 加载状态 -->
          <div v-if="loading" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>

          <!-- 空状态 -->
          <div v-else-if="myPlugins.length === 0" class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-black">暂无插件</h3>
            <p class="mt-1 text-sm text-black">开始安装您的第一个插件</p>
            <div class="mt-6">
              <router-link
                :to="pluginStorePath"
                class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                去插件商店看看
              </router-link>
            </div>
          </div>

          <!-- 插件网格 -->
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            <PluginCard
              v-for="plugin in myPlugins"
              :key="plugin.plugin_id"
              :plugin="plugin"
              :show-status="true"
              :show-expiry="true"
              :show-renew-button="true"
              @click="showPluginDetail(plugin)"
              @renew="handleRenew"
            />
          </div>
        </div>
      </div>
    </div>
  </div>

    <!-- 插件详情对话框 -->
    <PluginStoreDetailModal
      v-if="showDetailDialog && selectedPlugin"
      :plugin="selectedPlugin"
      :from-my-plugins="true"
      @close="showDetailDialog = false"
      @install="handlePluginInstall"
      @toggle="handleToggleFromDetail"
      @uninstall="handleUninstallFromDetail"
    />

    <!-- 使用统计对话框 -->
    <PluginUsageModal
      v-if="showUsageDialog && selectedPluginId"
      :plugin-id="selectedPluginId"
      @close="showUsageDialog = false"
    />

    <!-- 禁用/启用插件确认对话框 -->
    <ConfirmDialog
      v-model:visible="showDisableConfirm"
      :title="pluginToToggle?.is_enabled ? '禁用插件' : '启用插件'"
      :message="`确定要${pluginToToggle?.is_enabled ? '禁用' : '启用'}插件 '${pluginToToggle?.name}' 吗？`"
      :type="pluginToToggle?.is_enabled ? 'warning' : 'info'"
      :confirm-text="pluginToToggle?.is_enabled ? '禁用' : '启用'"
      :loading="toggling"
      :loading-text="pluginToToggle?.is_enabled ? '禁用中' : '启用中'"
      :show-warning="false"
      @confirm="confirmTogglePlugin"
      @cancel="cancelToggle"
    />

    <!-- 卸载插件确认对话框 -->
    <ConfirmDialog
      v-model:visible="showUninstallConfirm"
      title="卸载插件"
      :message="`确定要卸载插件 '${pluginToUninstall?.name}' 吗？`"
      type="danger"
      confirm-text="卸载"
      :loading="uninstalling"
      loading-text="卸载中"
      @confirm="confirmUninstallPlugin"
      @cancel="cancelUninstall"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader/index.vue'
import PluginCard from './components/PluginCard/index.vue'
import PluginStoreDetailModal from '../plugin-store/components/PluginStoreDetailModal/index.vue'
import PluginUsageModal from './components/PluginUsageModal/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import { pluginApi } from '@/api/plugin'
import { showMessage } from '@/utils/message'

const router = useRouter()
const route = useRoute()
const isWorkspaceView = computed(() => route.path.startsWith('/user/'))
const pluginStorePath = computed(() => (isWorkspaceView.value ? '/user/automation/plugin-store' : '/plugin-store'))
const loading = ref(false)
const myPlugins = ref([])

const showDetailDialog = ref(false)
const showUsageDialog = ref(false)
const selectedPlugin = ref(null)
const selectedPluginId = ref('')

// 确认对话框状态
const showDisableConfirm = ref(false)
const showUninstallConfirm = ref(false)
const pluginToToggle = ref(null)
const pluginToUninstall = ref(null)
const toggling = ref(false)
const uninstalling = ref(false)


// 获取我的插件列表
const fetchMyPlugins = async () => {
  try {
    loading.value = true
    const response = await pluginApi.getMyPlugins()
    if (response.code === 0) {
      myPlugins.value = response.data
    } else {
      showMessage(response.message, 'error')
    }
  } catch (error) {
    showMessage('获取插件列表失败', 'error')
    console.error('获取插件列表失败:', error)
  } finally {
    loading.value = false
  }
}



// 显示切换插件确认对话框
const togglePlugin = (plugin) => {
  pluginToToggle.value = plugin
  showDisableConfirm.value = true
}

// 确认切换插件状态
const confirmTogglePlugin = async () => {
  if (!pluginToToggle.value) return

  toggling.value = true
  try {
    const action = pluginToToggle.value.is_enabled ? 'disable' : 'enable'
    const response = await pluginApi.togglePlugin(pluginToToggle.value.plugin_id, action)
    
    if (response.code === 0) {
      pluginToToggle.value.is_enabled = !pluginToToggle.value.is_enabled
      showMessage(response.message, 'success')
    } else {
      showMessage(response.message, 'error')
    }
  } catch (error) {
    showMessage('操作失败', 'error')
  } finally {
    toggling.value = false
    showDisableConfirm.value = false
    pluginToToggle.value = null
  }
}

// 取消切换
const cancelToggle = () => {
  showDisableConfirm.value = false
  pluginToToggle.value = null
}

// 显示插件详情
const showPluginDetail = (plugin) => {
  selectedPlugin.value = plugin
  showDetailDialog.value = true
}

// 处理插件安装（子组件已经完成安装，这里只需要刷新列表）
const handlePluginInstall = async (plugin) => {
  // 刷新插件列表
  await fetchMyPlugins()
}

// 从详情弹窗切换插件状态
const handleToggleFromDetail = async (plugin) => {
  toggling.value = true
  try {
    const action = plugin.is_enabled ? 'disable' : 'enable'
    const response = await pluginApi.togglePlugin(plugin.plugin_id, action)
    
    if (response.code === 0) {
      showMessage(response.message, 'success')
      await fetchMyPlugins()
      // 更新弹窗中的插件状态
      if (selectedPlugin.value) {
        selectedPlugin.value.is_enabled = !selectedPlugin.value.is_enabled
      }
    } else {
      showMessage(response.message, 'error')
    }
  } catch (error) {
    showMessage('操作失败', 'error')
  } finally {
    toggling.value = false
  }
}

// 从详情弹窗卸载插件（子组件已经完成卸载，这里只需要刷新列表）
const handleUninstallFromDetail = async (plugin) => {
  // 刷新插件列表
  await fetchMyPlugins()
}

// 显示卸载插件确认对话框
const uninstallPlugin = (plugin) => {
  pluginToUninstall.value = plugin
  showUninstallConfirm.value = true
}

// 确认卸载插件
const confirmUninstallPlugin = async () => {
  if (!pluginToUninstall.value) return

  uninstalling.value = true
  try {
    const response = await pluginApi.uninstallPlugin(pluginToUninstall.value.plugin_id)
    if (response.code === 0) {
      showMessage('插件卸载成功', 'success')
      showDetailDialog.value = false
      await fetchMyPlugins()
    } else {
      showMessage(response.message || '插件卸载失败', 'error')
    }
  } catch (error) {
    console.error('卸载插件失败:', error)
    showMessage('插件卸载失败', 'error')
  } finally {
    uninstalling.value = false
    showUninstallConfirm.value = false
    pluginToUninstall.value = null
  }
}

// 取消卸载
const cancelUninstall = () => {
  showUninstallConfirm.value = false
  pluginToUninstall.value = null
}

// 处理续费
const handleRenew = (plugin) => {
  // 跳转到购买页面
  router.push({
    path: '/purchase',
    query: {
      type: 'plugin',
      id: plugin.plugin_id
    }
  })
}

onMounted(() => {
  fetchMyPlugins()
})
</script>
