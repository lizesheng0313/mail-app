<template>
  <div class="p-6">
    <!-- 操作栏 -->
    <div class="bg-white rounded-lg shadow p-4 mb-4">
      <div class="flex flex-wrap items-center gap-4">
        <!-- 搜索框 -->
        <div class="w-full max-w-[420px]">
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索公告标题或内容..."
            class="h-10 w-full px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            @keyup.enter="handleSearch"
          />
        </div>

        <!-- 按钮组 -->
        <div class="flex gap-2">
          <button
            @click="handleSearch"
            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
          >
            查询
          </button>
          <button
            @click="handleReset"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            重置
          </button>
          <button
            @click="showCreateModal = true"
            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
          >
            + 发布公告/更新
          </button>
        </div>
      </div>
    </div>

    <!-- 公告列表 -->
    <AdminDataTable
      :loading="loading"
      :pagination="{
        page: page,
        pages: totalPages,
        total: total,
        limit: pageSize
      }"
      :column-count="6"
      @page-change="handlePageChange"
      @page-size-change="handlePageSizeChange"
    >
      <template #thead>
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">标题</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">内容</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">发布时间</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">发布者</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
        </tr>
      </template>

      <template #tbody>
        <tr v-if="announcements.length === 0">
          <td colspan="6" class="px-6 py-12 text-center text-gray-500">暂无公告</td>
        </tr>
        <tr v-for="item in announcements" :key="item.id" class="hover:bg-gray-50">
          <td class="px-6 py-4">
            <div class="text-sm font-medium text-gray-900">{{ item.title }}</div>
            <div v-if="item.scene === 'release_note'" class="mt-1 text-xs text-gray-500">
              版本更新 · {{ getClientTypeName(item.client_type) }} · v{{
                item.client_version || '-'
              }}
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span
              v-if="item.scene === 'release_note'"
              class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700"
            >
              版本更新
            </span>
            <span
              v-else
              :class="[
                'px-2 py-1 text-xs rounded-full',
                item.type === 'info'
                  ? 'bg-blue-100 text-blue-700'
                  : item.type === 'warning'
                    ? 'bg-yellow-100 text-yellow-700'
                    : item.type === 'success'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
              ]"
            >
              {{ getTypeName(item.type) }}
            </span>
          </td>
          <td class="px-6 py-4">
            <div class="text-sm text-gray-600 line-clamp-2">{{ item.content }}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {{ formatDate(item.created_at) }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {{ item.created_by_email || '-' }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center gap-2">
              <ActionButton
                icon="edit"
                tooltip="编辑"
                variant="edit"
                @click="editAnnouncement(item)"
              />
              <ActionButton
                icon="delete"
                tooltip="删除"
                variant="delete"
                @click="confirmDelete(item)"
              />
            </div>
          </td>
        </tr>
      </template>
    </AdminDataTable>

    <!-- 创建/编辑公告弹窗 -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div class="flex items-center justify-between px-6 py-4 border-b">
          <h3 class="text-lg font-semibold">
            {{ editingItem ? '编辑公告/更新' : '发布公告/更新' }}
          </h3>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div class="p-6 space-y-4">
          <!-- 标题 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">标题</label>
            <input
              v-model="formData.title"
              type="text"
              placeholder="请输入公告标题"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">发布类型</label>
            <CustomSelect
              v-model="formData.scene"
              :options="sceneOptions"
              placeholder="选择发布类型"
            />
          </div>

          <!-- 类型 -->
          <div v-if="formData.scene !== 'release_note'">
            <label class="block text-sm font-medium text-gray-700 mb-1">提示样式</label>
            <CustomSelect
              v-model="formData.type"
              :options="typeOptions"
              placeholder="选择公告类型"
            />
          </div>

          <template v-if="formData.scene === 'release_note'">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">客户端</label>
              <CustomSelect
                v-model="formData.client_type"
                :options="clientTypeOptions"
                placeholder="选择客户端"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">版本号</label>
              <div
                class="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700"
              >
                v{{ formData.client_version || DESKTOP_RELEASE_VERSION }}
              </div>
            </div>
          </template>

          <!-- 内容 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">内容</label>
            <textarea
              v-model="formData.content"
              rows="5"
              placeholder="请输入公告内容"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            ></textarea>
          </div>
        </div>

        <div class="flex gap-2 px-6 py-4 border-t bg-gray-50">
          <button
            @click="handleSave"
            :disabled="saving"
            class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {{ saving ? '保存中...' : '保存' }}
          </button>
          <button
            @click="closeModal"
            class="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <ConfirmDialog
      :visible="showDeleteConfirm"
      title="确认删除"
      message="确定要删除这条公告吗？"
      type="danger"
      @confirm="handleDelete"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showMessage } from '@/utils/message'
import api from '@/services/api'
import { DESKTOP_RELEASE_VERSION } from '@/config/desktopRelease'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'

const loading = ref(false)
const saving = ref(false)
const searchKeyword = ref('')
const showCreateModal = ref(false)
const showDeleteConfirm = ref(false)
const editingItem = ref(null)
const deleteTarget = ref(null)

const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const announcements = ref([])

const formData = ref({
  title: '',
  type: 'info',
  content: '',
  scene: 'general',
  client_type: 'desktop',
  client_version: DESKTOP_RELEASE_VERSION
})

// 公告类型选项
const typeOptions = [
  { value: 'info', label: '信息' },
  { value: 'warning', label: '警告' },
  { value: 'success', label: '成功' },
  { value: 'error', label: '错误' }
]

const sceneOptions = [
  { value: 'general', label: '普通公告' },
  { value: 'release_note', label: '版本更新' }
]

const clientTypeOptions = [
  { value: 'desktop', label: '桌面端' },
  { value: 'web', label: 'Web 端' },
  { value: 'miniapp', label: '小程序' },
  { value: 'all', label: '全部客户端' }
]

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

const getTypeName = (type) => {
  const typeMap = {
    info: '信息',
    warning: '警告',
    success: '成功',
    error: '错误'
  }
  return typeMap[type] || type
}

const getClientTypeName = (clientType) => {
  const clientTypeMap = {
    desktop: '桌面端',
    web: 'Web 端',
    miniapp: '小程序',
    all: '全部客户端'
  }
  return clientTypeMap[clientType] || clientType || '未设置'
}

const formatDate = (timestamp) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

const loadAnnouncements = async () => {
  loading.value = true
  try {
    const result = await api.get('/announcements/', {
      params: { page: page.value, page_size: pageSize.value, include_release_note: true }
    })
    if (result.code === 0) {
      announcements.value = result.data.items || []
      total.value = result.data.total || 0
    }
  } catch (error) {
    console.error('加载公告失败:', error)
    showMessage('加载公告失败', 'error')
  } finally {
    loading.value = false
  }
}

const handlePageChange = (newPage) => {
  page.value = newPage
  loadAnnouncements()
}

const handlePageSizeChange = (newSize) => {
  pageSize.value = newSize
  page.value = 1
  loadAnnouncements()
}

const editAnnouncement = (item) => {
  editingItem.value = item
  formData.value = {
    title: item.title,
    type: item.type,
    content: item.content,
    scene: item.scene || 'general',
    client_type: item.client_type || 'desktop',
    client_version: item.client_version || DESKTOP_RELEASE_VERSION
  }
  showCreateModal.value = true
}

const closeModal = () => {
  showCreateModal.value = false
  editingItem.value = null
  formData.value = {
    title: '',
    type: 'info',
    content: '',
    scene: 'general',
    client_type: 'desktop',
    client_version: DESKTOP_RELEASE_VERSION
  }
}

const handleSave = async () => {
  if (!formData.value.title.trim()) {
    showMessage('请输入标题', 'warning')
    return
  }
  if (!formData.value.content.trim()) {
    showMessage('请输入内容', 'warning')
    return
  }
  if (formData.value.scene === 'release_note' && !formData.value.client_version.trim()) {
    showMessage('请输入版本号', 'warning')
    return
  }

  saving.value = true
  try {
    const payload = {
      ...formData.value,
      client_type: formData.value.scene === 'release_note' ? formData.value.client_type : null,
      client_version: formData.value.scene === 'release_note' ? formData.value.client_version : null
    }

    const result = editingItem.value
      ? await api.put(`/announcements/${editingItem.value.id}`, payload)
      : await api.post('/announcements/', payload)

    if (result.code === 0) {
      showMessage(editingItem.value ? '更新成功' : '发布成功', 'success')
      closeModal()
      loadAnnouncements()
    } else {
      showMessage(result.message || '操作失败', 'error')
    }
  } catch (error) {
    console.error('保存失败:', error)
    showMessage('保存失败', 'error')
  } finally {
    saving.value = false
  }
}

const confirmDelete = (item) => {
  deleteTarget.value = item
  showDeleteConfirm.value = true
}

const handleSearch = () => {
  page.value = 1
  loadAnnouncements()
}

const handleReset = () => {
  searchKeyword.value = ''
  page.value = 1
  loadAnnouncements()
}

const handleDelete = async () => {
  try {
    const result = await api.delete(`/announcements/${deleteTarget.value.id}`)
    if (result.code === 0) {
      showMessage('删除成功', 'success')
      loadAnnouncements()
    } else {
      showMessage(result.message || '删除失败', 'error')
    }
  } catch (error) {
    console.error('删除失败:', error)
    showMessage('删除失败', 'error')
  } finally {
    showDeleteConfirm.value = false
    deleteTarget.value = null
  }
}

onMounted(() => {
  loadAnnouncements()
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
