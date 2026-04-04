<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-0 border max-w-4xl shadow-lg rounded-lg bg-white">
      <!-- 头部 -->
      <div class="flex items-center justify-between p-6 border-b">
        <h3 class="text-xl font-semibold text-black">
          插件详情
        </h3>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-black"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 内容 -->
      <div class="p-6">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- 左侧：插件信息 -->
          <div class="lg:col-span-2">
            <!-- 基本信息 -->
            <div class="flex items-start space-x-4 mb-6">
              <div class="w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div class="flex-1">
                <div class="flex items-center space-x-2 mb-2">
                  <h2 class="text-2xl font-bold text-black">{{ plugin.name }}</h2>
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    v{{ plugin.version }}
                  </span>
                </div>
                <p class="text-black mb-2">作者: {{ plugin.author }}</p>
                <p class="text-black">{{ plugin.description }}</p>
              </div>
            </div>

            <!-- 统计信息 -->
            <div class="grid grid-cols-3 gap-4 mb-6">
              <div class="text-center p-3 bg-gray-50 rounded-lg">
                <div class="text-2xl font-bold text-black">{{ formatNumber(plugin.install_count) }}</div>
                <div class="text-sm text-black">安装量</div>
              </div>
              <div class="text-center p-3 bg-gray-50 rounded-lg">
                <div class="text-2xl font-bold text-yellow-600">{{ plugin.rating ? plugin.rating.toFixed(1) : '0.0' }}</div>
                <div class="text-sm text-black">评分</div>
              </div>
              <div class="text-center p-3 bg-gray-50 rounded-lg">
                <div class="text-2xl font-bold text-black">{{ plugin.rating_count || 0 }}</div>
                <div class="text-sm text-black">评价数</div>
              </div>
            </div>

            <!-- 详细描述 -->
            <div class="mb-6">
              <h3 class="text-lg font-semibold text-black mb-3">详细介绍</h3>
              <div class="prose prose-sm max-w-none text-black" v-html="formatDescription(plugin.long_description)"></div>
            </div>

            <!-- 权限 -->
            <div v-if="plugin.permissions && plugin.permissions.length > 0" class="mb-6">
              <h3 class="text-lg font-semibold text-black mb-3">所需权限</h3>
              <div class="space-y-2">
                <div
                  v-for="permission in plugin.permissions"
                  :key="permission"
                  class="flex items-center space-x-2 text-sm text-black"
                >
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{{ getPermissionName(permission) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧：操作面板 -->
          <div class="lg:col-span-1">
            <div class="sticky top-6">
              <!-- 安装/授权面板 -->
              <div class="bg-gray-50 rounded-lg p-4 mb-4">
                <!-- 免费插件或已有授权 -->
                <div v-if="plugin.is_free || plugin.user_has_authorization">
                  <div class="text-center mb-4">
                    <h4 class="text-lg font-semibold text-black mb-2">
                      {{ plugin.is_free ? '免费插件' : '已授权插件' }}
                    </h4>
                    <p v-if="plugin.user_has_authorization && !plugin.is_free" class="text-sm text-black">
                      授权有效期至：{{ formatDate(plugin.authorization_expires_at) }}
                    </p>
                  </div>
                  
                  <!-- 从我的插件打开 - 显示管理按钮 -->
                  <div v-if="fromMyPlugins" class="space-y-3">
                    <div class="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <svg class="w-5 h-5 text-green-600 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span class="text-sm text-green-700 font-medium">已安装</span>
                    </div>
                    <div class="flex gap-2">
                      <button
                        @click="confirmToggle"
                        :disabled="toggling"
                        :class="[
                          'flex-1 flex items-center justify-center font-medium py-3 px-4 rounded-lg transition-colors relative group',
                          plugin.is_enabled 
                            ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        ]"
                      >
                        <svg v-if="!toggling" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <!-- 禁用图标：关闭眼睛 -->
                          <path v-if="plugin.is_enabled" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          <!-- 启用图标：睁开眼睛 -->
                          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <!-- Loading 图标 -->
                        <svg v-else class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <!-- Tooltip -->
                        <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {{ plugin.is_enabled ? '禁用插件' : '启用插件' }}
                        </div>
                      </button>
                      <button
                        @click="confirmUninstall"
                        :disabled="uninstalling"
                        class="flex-1 flex items-center justify-center bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors relative group"
                      >
                        <svg v-if="!uninstalling" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <!-- Loading 图标 -->
                        <svg v-else class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <!-- Tooltip -->
                        <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          卸载插件
                        </div>
                      </button>
                    </div>
                  </div>
                  <!-- 从插件商店打开 - 未安装 -->
                  <div v-else-if="!plugin.is_installed">
                    <button
                      @click="handleInstall"
                      :disabled="installing"
                      class="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      {{ installing ? '安装中...' : '立即安装' }}
                    </button>
                  </div>
                  <!-- 从插件商店打开 - 已安装 -->
                  <div v-else>
                    <button
                      disabled
                      class="w-full bg-gray-400 text-white font-medium py-2 px-4 rounded-lg cursor-not-allowed text-sm"
                    >
                      已安装
                    </button>
                  </div>
                </div>
                
                <!-- 付费插件 - 需要购买 -->
                <div v-else>
                  <div class="text-center mb-4">
                    <h4 class="text-lg font-semibold text-black mb-2">付费插件</h4>
                    <p class="text-sm text-black">购买后即可安装使用</p>
                  </div>

                  <!-- 从我的插件打开 - 显示管理按钮 -->
                  <div v-if="fromMyPlugins" class="space-y-3">
                    <div class="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <svg class="w-5 h-5 text-green-600 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span class="text-sm text-green-700 font-medium">已安装</span>
                    </div>
                    <div class="flex gap-2">
                      <button
                        @click="confirmToggle"
                        :disabled="toggling"
                        :class="[
                          'flex-1 flex items-center justify-center font-medium py-3 px-4 rounded-lg transition-colors relative group',
                          plugin.is_enabled 
                            ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        ]"
                      >
                        <svg v-if="!toggling" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <!-- 禁用图标：关闭眼睛 -->
                          <path v-if="plugin.is_enabled" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          <!-- 启用图标：睁开眼睛 -->
                          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <!-- Loading 图标 -->
                        <svg v-else class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <!-- Tooltip -->
                        <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {{ plugin.is_enabled ? '禁用插件' : '启用插件' }}
                        </div>
                      </button>
                      <button
                        @click="confirmUninstall"
                        :disabled="uninstalling"
                        class="flex-1 flex items-center justify-center bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors relative group"
                      >
                        <svg v-if="!uninstalling" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <!-- Loading 图标 -->
                        <svg v-else class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <!-- Tooltip -->
                        <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          卸载插件
                        </div>
                      </button>
                    </div>
                  </div>
                  <!-- 从插件商店打开 - 未安装 -->
                  <div v-else-if="!plugin.is_installed">
                    <!-- 显示价格 -->
                    <div class="bg-gray-50 rounded-lg p-4 mb-4 text-center">
                      <div class="text-sm text-gray-600 mb-2">起步价</div>
                      <div class="flex items-baseline justify-center">
                        <span class="text-2xl font-bold text-primary-600">{{ plugin.price }}奶片</span>
                        <span class="text-sm text-gray-500 ml-1">/月起</span>
                      </div>
                    </div>
                    <button
                      @click="handlePurchase"
                      class="w-full btn-primary py-3 text-sm font-bold shadow-md hover:shadow-lg"
                    >
                      立即购买
                    </button>
                  </div>
                  <!-- 从插件商店打开 - 已安装 -->
                  <div v-else>
                    <button
                      disabled
                      class="w-full bg-gray-400 text-white font-medium py-2 px-4 rounded-lg cursor-not-allowed text-sm"
                    >
                      已安装
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 切换插件确认对话框 -->
    <ConfirmDialog
      v-model:visible="showToggleConfirm"
      :title="plugin.is_enabled ? '禁用插件' : '启用插件'"
      :message="`确定要${plugin.is_enabled ? '禁用' : '启用'}插件 '${plugin.name}' 吗？`"
      :type="plugin.is_enabled ? 'warning' : 'info'"
      :confirm-text="plugin.is_enabled ? '禁用' : '启用'"
      :loading="toggling"
      :loading-text="plugin.is_enabled ? '禁用中' : '启用中'"
      :show-warning="false"
      @confirm="handleToggle"
      @cancel="showToggleConfirm = false"
    />

    <!-- 卸载插件确认对话框 -->
    <ConfirmDialog
      v-model:visible="showUninstallConfirm"
      title="卸载插件"
      :message="`确定要卸载插件 '${plugin.name}' 吗？`"
      type="danger"
      confirm-text="卸载"
      :loading="uninstalling"
      loading-text="卸载中"
      @confirm="handleUninstall"
      @cancel="showUninstallConfirm = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import BaseInput from '@/components/BaseInput/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import { pluginApi } from '@/api/plugin'
import { showMessage } from '@/utils/message'

const props = defineProps({
  plugin: {
    type: Object,
    required: true
  },
  fromMyPlugins: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'install', 'show-plans', 'toggle', 'uninstall'])

const router = useRouter()
const installing = ref(false)
const toggling = ref(false)
const uninstalling = ref(false)

// 确认对话框
const showToggleConfirm = ref(false)
const showUninstallConfirm = ref(false)

// 处理购买
const handlePurchase = () => {
  // 跳转到购买页面
  router.push({
    path: '/purchase',
    query: {
      type: 'plugin',
      id: props.plugin.plugin_id
    }
  })
  emit('close')
}

// 显示套餐选择
const showPlans = () => {
  emit('show-plans', props.plugin)
}

// 检查授权是否过期
const isLicenseExpired = computed(() => {
  if (!props.plugin?.license_expiry || props.plugin.is_free) return false
  return new Date(props.plugin.license_expiry) < new Date()
})

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 处理安装
const handleInstall = async () => {
  installing.value = true
  
  try {
    const response = await pluginApi.installPlugin({ plugin_id: props.plugin.plugin_id })
    if (response.code === 0) {
      showMessage('插件安装成功', 'success')
      // 关闭详情弹窗
      emit('close')
      // 通知父组件刷新列表
      emit('install', props.plugin)
    } else {
      showMessage(response.message || '插件安装失败', 'error')
    }
  } catch (error) {
    console.error('安装插件失败:', error)
    showMessage('插件安装失败', 'error')
  } finally {
    installing.value = false
  }
}

// 处理更新授权
const handleUpdateLicense = () => {
  emit('install', { ...props.plugin, needsAuthUpdate: true })
}

// 显示切换确认对话框
const confirmToggle = () => {
  showToggleConfirm.value = true
}

// 确认切换插件状态（启用/禁用）
const handleToggle = () => {
  toggling.value = true
  showToggleConfirm.value = false
  emit('toggle', props.plugin)
  
  // 重置状态
  setTimeout(() => {
    toggling.value = false
  }, 1000)
}

// 显示卸载确认对话框
const confirmUninstall = () => {
  showUninstallConfirm.value = true
}

// 确认卸载插件
const handleUninstall = async () => {
  uninstalling.value = true
  
  try {
    const response = await pluginApi.uninstallPlugin(props.plugin.plugin_id)
    if (response.code === 0) {
      showMessage('插件卸载成功', 'success')
      // 同时关闭确认框和详情弹窗
      showUninstallConfirm.value = false
      emit('close')
      // 通知父组件刷新列表
      emit('uninstall', props.plugin)
    } else {
      showMessage(response.message || '插件卸载失败', 'error')
      showUninstallConfirm.value = false
    }
  } catch (error) {
    console.error('卸载插件失败:', error)
    showMessage('插件卸载失败', 'error')
    showUninstallConfirm.value = false
  } finally {
    uninstalling.value = false
  }
}

// 格式化数字
const formatNumber = (num) => {
  if (!num && num !== 0) return '0'
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (!bytes) return '未知'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

// 格式化描述（简单的Markdown转HTML）
const formatDescription = (text) => {
  if (!text) return ''
  return text
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^## (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^# (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
    .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
}

// 获取分类名称
const getCategoryName = (category) => {
  const categories = {
    'web_scraping': '网页抓取',
    'data_processing': '数据处理',
    'network': '网络工具',
    'security': '安全工具',
    'automation': '自动化',
    'integration': '集成工具',
    'general': '通用工具'
  }
  return categories[category] || category
}

// 获取类型名称
const getTypeName = (type) => {
  const types = {
    'crawler': '网页助手',
    'proxy': '代理',
    'email': '邮件',
    'security': '安全',
    'utility': '工具',
    'other': '其他'
  }
  return types[type] || type
}

// 获取权限名称
const getPermissionName = (permission) => {
  const permissions = {
    'network_access': '网络访问',
    'proxy_access': '代理访问',
    'file_read': '文件读取',
    'file_write': '文件写入',
    'database_read': '数据库读取',
    'database_write': '数据库写入',
    'system_execute': '系统执行',
    'user_data': '用户数据访问'
  }
  return permissions[permission] || permission
}
</script>

<style scoped>
.prose {
  max-width: none;
}

.prose h2 {
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

.prose h3 {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.prose li {
  margin-left: 1rem;
  list-style-type: disc;
}
</style>
