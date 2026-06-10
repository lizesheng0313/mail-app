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
              placeholder="搜索域名..."
              class="w-64"
              size="sm"
            >
              <template #left-icon>
                <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </template>
            </BaseInput>
            <button
              @click="searchDomains"
              class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm"
            >
              查询
            </button>
          </div>
          <div class="flex items-center space-x-2">
            <button 
              @click="showCreateModal = true"
              class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm"
            >
              添加域名
            </button>
          </div>
        </div>
      </div>

      <!-- 域名列表 -->
      <AdminDataTable
        title="域名列表"
        :pagination="pagination"
        :loading="loading"
        :show-page-size-selector="true"
        :column-count="7"
        @page-change="changePage"
        @page-size-change="changePageSize"
      >
        <template #thead>
          <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">域名</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">用途</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">描述</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">状态</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">创建时间</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">过期时间</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">操作</th>
          </tr>
        </template>
        <template #tbody>
          <tr v-for="domain in domains" :key="domain.id" class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <!-- 过期图标 -->
                      <div v-if="isDomainExpired(domain)" class="mr-2">
                        <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </div>
                      <!-- 正常图标 -->
                      <div v-else class="mr-2">
                        <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </div>
                      <div :class="isDomainExpired(domain) ? 'text-red-600 line-through' : 'text-black'"
                           class="text-sm font-medium">
                        {{ domain.domain_name }}
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-black">
                    <span
                      :class="domain.domain_usage === 'permanent' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'"
                      class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                    >
                      {{ formatDomainUsage(domain) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-black">
                    {{ domain.description || '-' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex flex-col space-y-1">
                      <!-- 主状态 -->
                      <span :class="domain.is_active ? 'bg-primary-100 text-success-800' : 'bg-red-100 text-red-800'"
                            class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-fit">
                        {{ domain.is_active ? '启用' : '禁用' }}
                      </span>
                      <!-- 过期状态 -->
                      <span v-if="isDomainExpired(domain)"
                            class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800 w-fit">
                        已过期
                      </span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-black">
                    {{ formatDate(domain.created_at) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span v-if="domain.expires_at"
                          :class="isDomainExpired(domain) ? 'text-red-600 font-medium' : 'text-black'">
                      {{ formatDateOnly(domain.expires_at) }}
                    </span>
                    <span v-else class="text-black">-</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <ActionButton
                      icon="edit"
                      tooltip="编辑"
                      variant="edit"
                      @click="editDomain(domain)"
                    />
                    <ActionButton
                      :icon="domain.is_active ? 'disable' : 'enable'"
                      :tooltip="domain.is_active ? '禁用' : '启用'"
                      :variant="domain.is_active ? 'disable' : 'enable'"
                      @click="toggleDomain(domain)"
                    />
                    <ActionButton
                      icon="delete"
                      tooltip="删除"
                      variant="delete"
                      @click="showDeleteDomainConfirm(domain)"
                    />
                  </td>
          </tr>
          <tr v-if="domains.length === 0">
            <td colspan="7" class="px-6 py-12 text-center text-black">
              暂无域名数据
            </td>
          </tr>
        </template>
      </AdminDataTable>
    </div>

    <!-- 消息提示 -->
    <div v-if="message" :class="messageType === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-primary-50 border-success-200 text-success-800'"
         class="fixed top-4 right-4 max-w-md p-4 border rounded-lg shadow-lg z-50">
      {{ message }}
    </div>

    <!-- 创建域名弹窗 -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">添加新域名</h3>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-black mb-2">域名</label>
            <BaseInput
              v-model="createForm.domain_name"
              type="text"
              placeholder="example.com"
              size="sm"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-black mb-2">描述</label>
            <BaseInput
              v-model="createForm.description"
              type="text"
              placeholder="域名描述"
              size="sm"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-black mb-2">用途</label>
            <CustomSelect
              v-model="createForm.domain_usage"
              :options="domainUsageOptions"
              placeholder="请选择域名用途"
              size="sm"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-black mb-2">过期时间</label>
            <BaseInput
              v-model="createForm.expires_at"
              type="date"
              size="sm"
            />
          </div>
        </div>

        <div class="flex justify-end space-x-3 mt-6">
          <button
            @click="cancelCreate"
            class="px-4 py-2 text-black hover:text-black"
          >
            取消
          </button>
          <button
            @click="createDomain"
            :disabled="loading || !createForm.domain_name"
            class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md disabled:opacity-50"
          >
            {{ loading ? '创建中...' : '创建域名' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 编辑域名模态框 -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">编辑域名</h3>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-black mb-2">域名</label>
            <BaseInput
              v-model="editForm.domain_name"
              type="text"
              disabled
              size="sm"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-black mb-2">描述</label>
            <BaseInput
              v-model="editForm.description"
              type="text"
              placeholder="域名描述"
              size="sm"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-black mb-2">用途</label>
            <CustomSelect
              v-model="editForm.domain_usage"
              :options="domainUsageOptions"
              placeholder="请选择域名用途"
              size="sm"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-black mb-2">过期时间</label>
            <BaseInput
              v-model="editForm.expires_at"
              type="date"
              size="sm"
            />
          </div>
        </div>

        <div class="flex justify-end space-x-3 mt-6">
          <button
            @click="showEditModal = false"
            class="px-4 py-2 text-black hover:text-black"
          >
            取消
          </button>
          <button
            @click="updateDomain"
            :disabled="loading"
            class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md disabled:opacity-50"
          >
            {{ loading ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 删除确认对话框 -->
  <ConfirmDialog
    :visible="showDeleteConfirm"
    title="删除域名"
    :message="`确定要删除域名【${domainToDelete?.domain_name}】吗？`"
    :loading="deleting"
    @confirm="confirmDeleteDomain"
    @cancel="cancelDelete"
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { domainAPI } from '@/api/domain'
import type { Domain } from '@/types'
import BaseInput from '@/components/BaseInput/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import { showMessage } from '@/utils/message'
// 响应式数据
const loading = ref(false)
const domains = ref<Domain[]>([])
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

// 删除确认对话框状态
const showDeleteConfirm = ref(false)
const domainToDelete = ref<Domain | null>(null)
const deleting = ref(false)

// 搜索
const searchQuery = ref('')

// 分页
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  pages: 0
})

// 新建域名表单
const showCreateModal = ref(false)
const createForm = ref({
  domain_name: '',
  description: '',
  expires_at: '',
  domain_usage: 'temporary'
})

// 编辑域名表单
const showEditModal = ref(false)
const editForm = ref({
  id: 0,
  domain_name: '',
  description: '',
  expires_at: '',
  domain_usage: 'temporary'
})

const domainUsageOptions = [
  { label: '临时域名', value: 'temporary' },
  { label: '永久域名', value: 'permanent' }
]



// 页面加载时获取域名列表
onMounted(() => {
  fetchDomains()
})

// 获取域名列表
const fetchDomains = async () => {
  loading.value = true
  try {
    const response: any = await domainAPI.getDomains(pagination.value.page, pagination.value.limit, searchQuery.value)
    if (response.code === 0) {
      domains.value = response.data.domains
      pagination.value = {
        ...pagination.value,
        ...response.data
      }
    } else {
      showMessage(response.message || '获取域名列表失败', 'error')
    }
  } catch (error: any) {
    showMessage(error.response?.data?.message || '获取域名列表失败', 'error')
  } finally {
    loading.value = false
  }
}

// 搜索域名
const searchDomains = async () => {
  pagination.value.page = 1 // 重置到第一页
  await fetchDomains()
}

// 创建域名
const createDomain = async () => {
  if (!createForm.value.domain_name) {
    showMessage('请输入域名', 'error')
    return
  }

  loading.value = true
  try {
    const payload: any = {
      domain_name: createForm.value.domain_name,
      description: createForm.value.description,
      domain_usage: createForm.value.domain_usage
    }

    // 如果设置了过期时间，添加到请求中（设置为当天23:59:59，避免时区问题）
    if (createForm.value.expires_at) {
      // 创建本地时间的日期，设置为当天的23:59:59
      const localDate = new Date(createForm.value.expires_at + 'T23:59:59')
      payload.expires_at = localDate.toISOString()
    }

    const response: any = await domainAPI.createDomain(payload)
    
    if (response.code === 0) {
      showMessage('域名创建成功', 'success')
      // 重置表单
      createForm.value = { domain_name: '', description: '', expires_at: '', domain_usage: 'temporary' }
      showCreateModal.value = false
      // 刷新列表
      await fetchDomains()
    } else {
      showMessage(response.message || '创建域名失败', 'error')
    }
  } catch (error: any) {
    showMessage(error.response?.data?.message || '创建域名失败', 'error')
  } finally {
    loading.value = false
  }
}

// 取消创建域名
const cancelCreate = () => {
  showCreateModal.value = false
  createForm.value = { domain_name: '', description: '', expires_at: '', domain_usage: 'temporary' }
}

// 编辑域名
const editDomain = (domain: Domain) => {
  editForm.value = {
    id: domain.id,
    domain_name: domain.domain_name,
    description: domain.description || '',
    expires_at: domain.expires_at ? new Date(domain.expires_at).toISOString().slice(0, 10) : '',
    domain_usage: domain.domain_usage || 'temporary'
  }
  showEditModal.value = true
}

// 更新域名
const updateDomain = async () => {
  loading.value = true
  try {
    const payload: any = {
      description: editForm.value.description,
      domain_usage: editForm.value.domain_usage
    }

    // 如果设置了过期时间，添加到请求中（设置为当天23:59:59，避免时区问题）
    if (editForm.value.expires_at) {
      // 创建本地时间的日期，设置为当天的23:59:59
      const localDate = new Date(editForm.value.expires_at + 'T23:59:59')
      payload.expires_at = localDate.toISOString()
    }

    const response: any = await domainAPI.updateDomain(editForm.value.id, payload)

    if (response.code === 0) {
      showMessage('域名更新成功', 'success')
      showEditModal.value = false
      await fetchDomains()
    } else {
      showMessage(response.message || '更新域名失败', 'error')
    }
  } catch (error: any) {
    showMessage(error.response?.data?.message || '更新域名失败', 'error')
  } finally {
    loading.value = false
  }
}

// 切换域名状态
const toggleDomain = async (domain: Domain) => {
  loading.value = true
  try {
    const response: any = await domainAPI.updateDomain(domain.id, {
      is_active: !domain.is_active
    })
    
    if (response.code === 0) {
      domain.is_active = !domain.is_active
      showMessage(`域名已${domain.is_active ? '启用' : '禁用'}`, 'success')
    } else {
      showMessage(response.message || '更新域名状态失败', 'error')
    }
  } catch (error: any) {
    showMessage(error.response?.data?.message || '更新域名状态失败', 'error')
  } finally {
    loading.value = false
  }
}

// 显示删除确认对话框
const showDeleteDomainConfirm = (domain: Domain) => {
  domainToDelete.value = domain
  showDeleteConfirm.value = true
}

// 确认删除域名
const confirmDeleteDomain = async () => {
  if (!domainToDelete.value) return

  deleting.value = true
  try {
    const response: any = await domainAPI.deleteDomain(domainToDelete.value.id)

    if (response.code === 0) {
      showMessage('域名删除成功', 'success')
      await fetchDomains()
    } else {
      showMessage(response.message || '删除域名失败', 'error')
    }
  } catch (error: any) {
    showMessage(error.response?.data?.message || '删除域名失败', 'error')
  } finally {
    deleting.value = false
    showDeleteConfirm.value = false
    domainToDelete.value = null
  }
}

// 取消删除
const cancelDelete = () => {
  showDeleteConfirm.value = false
  domainToDelete.value = null
}

// 分页切换
const changePage = (page: number) => {
  if (page >= 1 && page <= pagination.value.pages) {
    pagination.value.page = page
    fetchDomains()
  }
}

// 改变每页显示数量
const changePageSize = (size: number) => {
  pagination.value.limit = size
  pagination.value.page = 1
  fetchDomains()
}

// 格式化日期
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

// 格式化日期（只显示年月日）
const formatDateOnly = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN')
}

// 检查域名是否过期
const isDomainExpired = (domain: Domain) => {
  if (!domain.expires_at) {
    console.log('域名没有过期时间:', domain.domain_name)
    return false
  }

  // 获取过期日期（只比较年月日）
  const expireDate = new Date(domain.expires_at)
  const today = new Date()

  // 将时间设置为当天的开始（00:00:00）进行比较
  const expireDateOnly = new Date(expireDate.getFullYear(), expireDate.getMonth(), expireDate.getDate())
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const isExpired = expireDateOnly < todayOnly
  
  return isExpired
}

const formatDomainUsage = (domain: Domain) =>
  domain.domain_usage === 'permanent' ? '永久域名' : '临时域名'
</script>
