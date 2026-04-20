<template>
  <div class="h-full">
    <div class=" h-full flex flex-col">

      <!-- 操作区域 -->
      <div class="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <div class="flex justify-between items-center">
          <div class="flex items-center space-x-4">
            <!-- 搜索框 -->
            <BaseInput
              v-model="searchQuery"
              placeholder="搜索代理..."
              class="w-64"
              size="sm"
            >
              <template #left-icon>
                <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </template>
            </BaseInput>
            
            <!-- 状态筛选 -->
            <CustomSelect
              v-model="statusFilter"
              :options="statusOptions"
              placeholder="状态筛选"
              class="w-48"
            />
            
            <!-- 查询按钮 -->
            <button
              @click="loadProxies"
              :disabled="loading"
              class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm"
            >
              查询
            </button>
          </div>
          
          <!-- 添加按钮 -->
          <div class="flex items-center space-x-2">
            <button
              @click="showCreateDialog = true"
              class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm"
            >
              添加代理
            </button>
          </div>
        </div>
      </div>

      <!-- 代理列表 -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div v-if="loading" class="text-center py-12">
          <div class="inline-flex items-center">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            加载中...
          </div>
        </div>

        <div v-else-if="filteredProxies.length === 0" class="text-center py-12">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2h10a2 2 0 012 2v2" />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-black">暂无代理</h3>
          <p class="mt-1 text-sm text-black">添加您的第一个代理配置</p>
        </div>

        <div v-else class="overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                代理信息
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                配额使用
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                状态
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                创建时间
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="proxy in filteredProxies" :key="proxy.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div :class="`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${proxy.is_enabled ? 'bg-primary-100' : 'bg-gray-100'}`">
                    <svg class="h-5 w-5" :class="proxy.is_enabled ? 'text-primary-600' : 'text-black'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2h10a2 2 0 012 2v2" />
                    </svg>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-black">{{ proxy.name }}</div>
                    <div class="text-sm text-black">{{ proxy.ip || 'API获取' }}{{ proxy.port ? ':' + proxy.port : '' }}</div>
                    <div class="mt-1 flex items-center gap-2">
                      <span class="inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-700">
                        {{ formatProxyType(proxy.proxy_type) }}
                      </span>
                      <span v-if="proxy.location" class="text-xs text-gray-400">{{ proxy.location }}</span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-black">
                  总配额：{{ proxy.total_quota }}
                </div>
                <div class="text-sm text-black">
                  已使用：{{ proxy.used_count }}
                </div>
                <div class="text-sm text-black">
                  剩余：{{ proxy.remaining_count }}
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    class="bg-primary-600 h-2 rounded-full" 
                    :style="`width: ${proxy.total_quota > 0 ? (proxy.used_count / proxy.total_quota * 100) : 0}%`"
                  ></div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${proxy.is_enabled ? 'bg-primary-100 text-success-800' : 'bg-red-100 text-red-800'}`">
                  {{ proxy.is_enabled ? '启用' : '禁用' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-black">
                {{ formatTime(proxy.created_at) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex items-center space-x-2">
                  <ActionButton
                    icon="eye"
                    tooltip="详情"
                    variant="view"
                    @click="viewStats(proxy)"
                  />
                  <ActionButton
                    icon="edit"
                    tooltip="编辑"
                    variant="edit"
                    @click="editProxy(proxy)"
                  />
                  <ActionButton
                    :icon="proxy.is_enabled ? 'disable' : 'enable'"
                    :tooltip="proxy.is_enabled ? '禁用' : '启用'"
                    :variant="proxy.is_enabled ? 'disable' : 'enable'"
                    @click="toggleProxy(proxy)"
                  />
                  <ActionButton
                    icon="delete"
                    tooltip="删除"
                    variant="delete"
                    @click="deleteProxy(proxy)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </div>

    <!-- 创建/编辑代理对话框 -->
    <ProxyModal
      v-if="showCreateDialog"
      :proxy="selectedProxy"
      @close="closeCreateDialog"
      @created="handleProxyCreated"
      @updated="handleProxyUpdated"
    />

    <!-- 统计详情对话框 -->
    <ProxyStatsModal
      v-if="showStatsDialog"
      :proxy="selectedProxy"
      @close="showStatsDialog = false"
    />

    <!-- 删除确认对话框 -->
    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      title="确认删除"
      :message="`确定要删除代理 '${proxyToDelete?.name}' 吗？删除后不可恢复。`"
      type="danger"
      confirm-text="删除"
      :loading="deleting"
      loading-text="删除中"
      @confirm="confirmDeleteProxy"
      @cancel="cancelDelete"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import BaseInput from '@/components/BaseInput/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import ProxyModal from './components/ProxyModal/index.vue'
import ProxyStatsModal from './components/ProxyStatsModal/index.vue'
import { paidProxyApi } from '@/api/proxy'
import { showMessage } from '@/utils/message'
import { formatTimestamp } from '@/utils/timeUtils'

// 响应式数据
const loading = ref(false)
const proxies = ref([])
const searchQuery = ref('')
const statusFilter = ref('')
const showCreateDialog = ref(false)
const showStatsDialog = ref(false)
const showDeleteConfirm = ref(false)
const selectedProxy = ref(null)
const proxyToDelete = ref(null)
const deleting = ref(false)

// 筛选选项
const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '启用', value: 'enabled' },
  { label: '禁用', value: 'disabled' }
]

// 计算属性
const filteredProxies = computed(() => {
  let filtered = proxies.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(proxy => 
      proxy.name.toLowerCase().includes(query) ||
      proxy.ip.includes(query) ||
      (proxy.location && proxy.location.toLowerCase().includes(query))
    )
  }

  if (statusFilter.value) {
    const isEnabled = statusFilter.value === 'enabled'
    filtered = filtered.filter(proxy => proxy.is_enabled === isEnabled)
  }

  return filtered
})

// 生命周期
onMounted(() => {
  loadProxies()
})

// 方法
const loadProxies = async () => {
  loading.value = true
  try {
    const response = await paidProxyApi.getProxyList()
    if (response.code === 0) {
      proxies.value = response.data.proxies || []
    } else {
      showMessage('获取代理列表失败', 'error')
    }
  } catch (error) {
    console.error('加载代理列表失败:', error)
    showMessage('加载代理列表失败', 'error')
  } finally {
    loading.value = false
  }
}

const formatProxyType = (value) => {
  if (value === 'socks5') return 'SOCKS5'
  if (value === 'http') return 'HTTP'
  return '自动识别'
}

const editProxy = (proxy) => {
  selectedProxy.value = proxy
  showCreateDialog.value = true
}

const toggleProxy = async (proxy) => {
  try {
    const response = await paidProxyApi.updateProxy(proxy.id, {
      is_enabled: !proxy.is_enabled
    })
    if (response.code === 0) {
      showMessage(`代理已${proxy.is_enabled ? '禁用' : '启用'}`, 'success')
      loadProxies()
    } else {
      showMessage('操作失败', 'error')
    }
  } catch (error) {
    console.error('切换代理状态失败:', error)
    showMessage('操作失败', 'error')
  }
}

const deleteProxy = (proxy) => {
  proxyToDelete.value = proxy
  showDeleteConfirm.value = true
}

const confirmDeleteProxy = async () => {
  if (!proxyToDelete.value) return

  deleting.value = true
  try {
    const response = await paidProxyApi.deleteProxy(proxyToDelete.value.id)
    if (response.code === 0) {
      showMessage('代理删除成功', 'success')
      loadProxies()
    } else {
      showMessage('删除代理失败', 'error')
    }
  } catch (error) {
    console.error('删除代理失败:', error)
    showMessage('删除代理失败', 'error')
  } finally {
    deleting.value = false
    showDeleteConfirm.value = false
    proxyToDelete.value = null
  }
}

const cancelDelete = () => {
  showDeleteConfirm.value = false
  proxyToDelete.value = null
}

const viewStats = (proxy) => {
  selectedProxy.value = proxy
  showStatsDialog.value = true
}

const closeCreateDialog = () => {
  showCreateDialog.value = false
  selectedProxy.value = null
}

const handleProxyCreated = () => {
  closeCreateDialog()
  loadProxies()
}

const handleProxyUpdated = () => {
  closeCreateDialog()
  loadProxies()
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  return formatTimestamp(timestamp, 'datetime')
}
</script>
