<template>
  <div class="h-full">
    <div class=" h-full flex flex-col">

      <!-- 操作区域 -->
      <div class="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <div class="flex justify-between items-center">
          <div class="flex items-center space-x-4">
            <BaseInput
              v-model="searchQuery"
              type="text"
              placeholder="搜索用户名或邮箱..."
              class="w-64"
              size="sm"
            >
              <template #left-icon>
                <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </template>
            </BaseInput>
            <CustomSelect
              v-model="proxyFilter"
              :options="proxyFilterOptions"
              placeholder="代理权限筛选"
              size="sm"
              class="w-48"
            />
            <button
              @click="loadUsers"
              class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm"
            >
              查询
            </button>
          </div>
          <div v-if="selectedUserIds.length > 0" class="flex items-center space-x-3">
            <span class="text-sm text-gray-500">已选 {{ selectedUserIds.length }} 个</span>
            <button
              @click="openBatchDisableConfirm"
              :disabled="updatingBatchStatus || selectedUserIds.length === 0"
              class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              批量禁用
            </button>
            <button
              @click="clearSelection"
              class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50"
            >
              取消选择
            </button>
          </div>
        </div>
      </div>

      <!-- 用户列表 -->
      <AdminDataTable
        title="用户列表"
        :pagination="pagination"
        :loading="loading"
        :show-page-size-selector="true"
        :column-count="8"
        @page-change="changePage"
        @page-size-change="changePageSize"
      >
        <template #thead>
          <tr>
            <th class="px-4 py-3 text-left">
              <input
                v-if="selectableUserIds.length > 0"
                type="checkbox"
                :checked="isAllSelected"
                @change="toggleSelectAll($event)"
                class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">用户</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">状态</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">代理权限</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">使用情况</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">登录IP</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">注册时间</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">操作</th>
          </tr>
        </template>
        <template #tbody>
          <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50">
            <td class="px-4 py-4 whitespace-nowrap">
              <input
                v-if="isUserSelectable(user)"
                type="checkbox"
                :checked="selectedUserIds.includes(user.id)"
                @change="toggleUserSelection(user.id, $event)"
                class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span v-else class="text-xs text-gray-300">-</span>
            </td>
            <!-- 用户 -->
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {{ user.username.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <div class="text-sm font-medium text-black">{{ user.username }}</div>
                  <div v-if="user.is_admin" class="text-xs text-orange-600">管理员</div>
                </div>
              </div>
            </td>

            <!-- 状态 -->
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="[
                'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                user.is_active ? 'bg-primary-100 text-success-800' : 'bg-red-100 text-red-800'
              ]">
                {{ user.is_active ? '正常' : '禁用' }}
              </span>
            </td>

            <!-- 代理权限 -->
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="[
                'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                user.proxy_enabled ? 'bg-primary-100 text-success-800' : 'bg-gray-100 text-black'
              ]">
                {{ user.proxy_enabled ? '已启用' : '未启用' }}
              </span>
            </td>

            <!-- 使用情况 -->
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <div v-if="user.proxy_enabled">
                <div class="text-black">
                  今日: {{ user.proxy_used_today }}/{{ user.proxy_quota || '∞' }}
                </div>
                <div class="text-xs text-black">
                  剩余: {{ user.proxy_quota ? Math.max(0, user.proxy_quota - user.proxy_used_today) : '无限制' }}
                </div>
              </div>
              <div v-else class="text-gray-400">-</div>
            </td>

            <td class="px-6 py-4 text-sm text-black">
              <div>{{ user.last_login_ip || '-' }}</div>
              <div class="text-xs text-gray-500 mt-1">{{ user.last_login_location || '-' }}</div>
            </td>

            <!-- 注册时间 -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-black">
              {{ formatDate(user.created_at) }}
            </td>

            <!-- 操作 -->
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
              <ActionButton
                icon="edit"
                tooltip="编辑"
                variant="edit"
                @click="showProxyModal(user)"
              />
              <ActionButton
                icon="eye"
                tooltip="查看详情"
                variant="view"
                @click="showUsageModal(user)"
              />
              <ActionButton
                v-if="!user.is_admin"
                :icon="user.is_active ? 'disable' : 'enable'"
                :tooltip="user.is_active ? '禁用账号' : '启用账号'"
                :variant="user.is_active ? 'disable' : 'enable'"
                @click="toggleUserStatus(user)"
              />
              <ActionButton
                v-if="user.proxy_enabled && user.proxy_quota > 0"
                icon="refresh"
                tooltip="重置配额"
                variant="secondary"
                @click="resetUserQuota(user)"
              />
            </td>
          </tr>
        </template>
      </AdminDataTable>
    </div>

    <!-- 代理权限设置模态框 -->
    <ProxyPermissionModal
      v-if="showingProxyModal"
      :user="selectedUser"
      @close="hideProxyModal"
      @updated="handleProxyUpdated"
    />

    <!-- 用户详情模态框 -->
    <UserDetailModal
      v-if="showingDetailModal"
      :user="selectedUser"
      @close="hideDetailModal"
    />

    <!-- 重置配额确认对话框 -->
    <ConfirmDialog
      v-model:visible="showResetConfirm"
      title="确认重置"
      :message="`确定要重置用户 &quot;${userToReset?.username}&quot; 的今日代理配额吗？`"
      type="warning"
      confirm-text="重置"
      :loading="resetting"
      loading-text="重置中"
      @confirm="confirmResetQuota"
      @cancel="cancelReset"
    />

    <ConfirmDialog
      v-model:visible="showStatusConfirm"
      :title="userToToggle?.is_active ? '确认禁用账号' : '确认启用账号'"
      :message="userToToggle?.is_active
        ? `确定要禁用用户 &quot;${userToToggle?.username}&quot; 吗？禁用后该账号将无法继续登录和使用系统。`
        : `确定要启用用户 &quot;${userToToggle?.username}&quot; 吗？`"
      :type="userToToggle?.is_active ? 'danger' : 'info'"
      :confirm-text="userToToggle?.is_active ? '禁用' : '启用'"
      :loading="updatingStatus"
      :loading-text="userToToggle?.is_active ? '禁用中' : '启用中'"
      :show-warning="Boolean(userToToggle?.is_active)"
      @confirm="confirmToggleUserStatus"
      @cancel="cancelToggleUserStatus"
    />

    <ConfirmDialog
      v-model:visible="showBatchDisableConfirm"
      title="确认批量禁用"
      :message="`确定要批量禁用 ${selectedUserIds.length} 个账号吗？禁用后这些账号将无法继续登录和使用系统。`"
      type="danger"
      confirm-text="批量禁用"
      :loading="updatingBatchStatus"
      loading-text="禁用中"
      :show-warning="true"
      @confirm="confirmBatchDisable"
      @cancel="cancelBatchDisable"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import BaseInput from '@/components/BaseInput/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import ProxyPermissionModal from './components/ProxyPermissionModal/index.vue'
import UserDetailModal from './components/UserDetailModal/index.vue'
import { adminUsersApi } from '@/api/adminUsers'
import { showMessage } from '@/utils/message'
import { formatTimestamp } from '@/utils/timeUtils'

// 响应式数据
const loading = ref(false)
const users = ref([])
const selectedUser = ref(null)
const showingProxyModal = ref(false)
const showingDetailModal = ref(false)
const searchQuery = ref('')
const proxyFilter = ref(null)
const showResetConfirm = ref(false)
const userToReset = ref(null)
const resetting = ref(false)
const showStatusConfirm = ref(false)
const userToToggle = ref(null)
const updatingStatus = ref(false)
const selectedUserIds = ref([])
const showBatchDisableConfirm = ref(false)
const updatingBatchStatus = ref(false)

// 分页信息
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
  pages: 0
})

// 代理筛选选项
const proxyFilterOptions = [
  { label: '全部用户', value: null },
  { label: '已启用代理', value: true },
  { label: '未启用代理', value: false }
]

const selectableUserIds = computed(() => users.value
  .filter(user => isUserSelectable(user))
  .map(user => user.id))

const isAllSelected = computed(() => (
  selectableUserIds.value.length > 0 &&
  selectableUserIds.value.every(id => selectedUserIds.value.includes(id))
))

// 加载用户列表
const loadUsers = async () => {
  try {
    loading.value = true
    
    const params = {
      page: pagination.page,
      limit: pagination.limit
    }
    
    if (searchQuery.value) {
      params.search = searchQuery.value
    }
    
    if (proxyFilter.value !== null) {
      params.proxy_enabled = proxyFilter.value
    }
    
    const response = await adminUsersApi.getUserList(params)
    
    if (response.code === 0) {
      users.value = response.data.users
      pagination.total = response.data.total
      pagination.pages = response.data.pages
      clearSelection()
    }
  } catch (error) {
    console.error('加载用户列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 切换页码
const changePage = (page) => {
  pagination.page = page
  loadUsers()
}

// 切换每页数量
const changePageSize = (pageSize) => {
  pagination.limit = pageSize
  pagination.page = 1
  loadUsers()
}

// 显示代理权限设置模态框
const showProxyModal = (user) => {
  selectedUser.value = user
  showingProxyModal.value = true
}

// 隐藏代理权限设置模态框
const hideProxyModal = () => {
  showingProxyModal.value = false
  selectedUser.value = null
}

// 处理代理权限更新
const handleProxyUpdated = () => {
  hideProxyModal()
  loadUsers()
}

// 显示用户详情模态框
const showUsageModal = (user) => {
  selectedUser.value = user
  showingDetailModal.value = true
}

// 隐藏用户详情模态框
const hideDetailModal = () => {
  showingDetailModal.value = false
  selectedUser.value = null
}

// 格式化日期
const formatDate = (timestamp) => {
  return formatTimestamp(timestamp, 'datetime')
}

// 重置用户配额
const resetUserQuota = (user) => {
  userToReset.value = user
  showResetConfirm.value = true
}

const isUserSelectable = (user) => !user.is_admin && user.is_active

const toggleUserSelection = (userId, event) => {
  const checked = event.target.checked
  if (checked) {
    if (!selectedUserIds.value.includes(userId)) {
      selectedUserIds.value.push(userId)
    }
    return
  }
  selectedUserIds.value = selectedUserIds.value.filter(id => id !== userId)
}

const toggleSelectAll = (event) => {
  const checked = event.target.checked
  selectedUserIds.value = checked ? [...selectableUserIds.value] : []
}

const clearSelection = () => {
  selectedUserIds.value = []
}

const openBatchDisableConfirm = () => {
  if (selectedUserIds.value.length === 0) {
    showMessage('请先选择要禁用的账号', 'warning')
    return
  }
  showBatchDisableConfirm.value = true
}

// 切换用户状态
const toggleUserStatus = (user) => {
  userToToggle.value = user
  showStatusConfirm.value = true
}

// 确认切换用户状态
const confirmToggleUserStatus = async () => {
  if (!userToToggle.value) return

  try {
    updatingStatus.value = true
    const nextStatus = !userToToggle.value.is_active
    const response = await adminUsersApi.updateUserStatus(userToToggle.value.id, {
      is_active: nextStatus
    })

    if (response.code === 0) {
      showMessage(nextStatus ? '账号已启用' : '账号已禁用', 'success')
      showStatusConfirm.value = false
      userToToggle.value = null
      loadUsers()
    } else {
      showMessage(response.message || '操作失败', 'error')
    }
  } catch (error) {
    console.error('更新用户状态失败:', error)
    showMessage('操作失败', 'error')
  } finally {
    updatingStatus.value = false
  }
}

// 确认重置配额
const confirmResetQuota = async () => {
  if (!userToReset.value) return
  
  try {
    resetting.value = true
    const response = await adminUsersApi.resetUserProxyQuota(userToReset.value.id)
    
    if (response.code === 0) {
      showMessage('配额重置成功', 'success')
      loadUsers()
    } else {
      showMessage(response.message || '重置失败', 'error')
    }
  } catch (error) {
    console.error('重置配额失败:', error)
    showMessage('重置失败', 'error')
  } finally {
    resetting.value = false
    userToReset.value = null
  }
}

// 取消重置
const cancelReset = () => {
  userToReset.value = null
}

// 取消切换用户状态
const cancelToggleUserStatus = () => {
  showStatusConfirm.value = false
  userToToggle.value = null
}

const confirmBatchDisable = async () => {
  if (selectedUserIds.value.length === 0) return

  try {
    updatingBatchStatus.value = true
    const response = await adminUsersApi.batchUpdateUserStatus({
      user_ids: selectedUserIds.value,
      is_active: false
    })

    if (response.code === 0) {
      const updatedCount = response.data?.updated_count || 0
      showMessage(`已禁用 ${updatedCount} 个账号`, 'success')
      showBatchDisableConfirm.value = false
      clearSelection()
      loadUsers()
    } else {
      showMessage(response.message || '批量禁用失败', 'error')
    }
  } catch (error) {
    console.error('批量禁用失败:', error)
    showMessage('批量禁用失败', 'error')
  } finally {
    updatingBatchStatus.value = false
  }
}

const cancelBatchDisable = () => {
  showBatchDisableConfirm.value = false
}

// 生命周期
onMounted(() => {
  loadUsers()
})
</script>
