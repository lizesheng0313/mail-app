<template>
  <div class="h-full">
    <div class="h-full flex flex-col">
      <!-- 操作栏 -->
      <div class="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">小程序管理</h2>
            <p class="text-sm text-gray-600 mt-1">管理小程序基本信息和配置</p>
          </div>
          <button
            @click="openAddModal"
            class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm flex items-center"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            添加小程序
          </button>
        </div>
      </div>

      <!-- 小程序列表 -->
      <AdminDataTable
        :loading="loading"
        :column-count="6"
      >
        <template #thead>
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">小程序名称</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AppID</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
          </tr>
        </template>
        <template #tbody>
          <tr v-for="item in miniapps" :key="item.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ item.id }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ item.title }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{{ item.appid }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="item.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'" class="px-2 py-1 text-xs rounded-full">
                {{ item.enabled ? '启用' : '禁用' }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{{ formatDate(item.created_at) }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <div class="flex items-center space-x-3">
                <ActionButton
                  icon="edit"
                  tooltip="编辑"
                  @click.stop="openEditModal(item)"
                />
                <ActionButton
                  icon="delete"
                  tooltip="删除"
                  variant="danger"
                  @click.stop="confirmDelete(item)"
                />
              </div>
            </td>
          </tr>
          <tr v-if="miniapps.length === 0">
            <td colspan="6" class="px-6 py-8 text-center text-gray-500">暂无数据</td>
          </tr>
        </template>
      </AdminDataTable>
    </div>

    <!-- 添加/编辑弹窗 -->
    <BaseModal 
      v-model="showModal" 
      :title="isEdit ? '编辑小程序' : '添加小程序'"
      :show-footer="false"
      @close="closeModal"
    >
      <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">小程序名称 *</label>
            <BaseInput
              v-model="formData.title"
              type="text"
              placeholder="例如：临时邮箱小程序"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">AppID *</label>
            <BaseInput
              v-model="formData.appid"
              type="text"
              placeholder="wx1234567890abcdef"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">AppSecret *</label>
            <BaseInput
              v-model="formData.secret"
              type="password"
              :placeholder="isEdit ? '留空则不修改' : '请输入AppSecret'"
            />
            <p class="text-xs text-gray-500 mt-1">{{ isEdit ? '如需修改Secret请输入新值，否则留空' : '请妥善保管AppSecret' }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">激励视频广告位 ID</label>
            <BaseInput
              v-model="formData.rewarded_video_ad_unit_id"
              type="text"
              placeholder="adunit-xxxxxxxxxxxxxxxx"
            />
            <p class="text-xs text-gray-500 mt-1">在微信公众平台流量主的广告位管理中创建激励视频广告后填写</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">描述</label>
            <BaseTextarea
              v-model="formData.description"
              :rows="3"
              placeholder="小程序用途说明"
            />
          </div>

          <div class="flex items-center">
            <input
              v-model="formData.enabled"
              type="checkbox"
              id="enabled"
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label for="enabled" class="ml-2 text-sm text-gray-700">启用此小程序</label>
          </div>
      </div>

      <div class="flex justify-end space-x-3 mt-6">
        <button
          @click="closeModal"
          class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          取消
        </button>
        <button
          @click="saveItem"
          :disabled="loading"
          class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md disabled:opacity-50"
        >
          {{ loading ? '保存中...' : '保存' }}
        </button>
      </div>
    </BaseModal>

    <!-- 删除确认对话框 -->
    <ConfirmDialog
      :visible="showDeleteDialog"
      title="删除小程序"
      :message="`确定要删除小程序【${deleteTarget?.title}】吗？`"
      :loading="deleting"
      @confirm="handleDelete"
      @cancel="showDeleteDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { showMessage } from '@/utils/message'
import api from '@/services/api'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import BaseModal from '@/components/BaseModal/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import BaseTextarea from '@/components/BaseTextarea/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'

interface Miniapp {
  id: number
  title: string
  appid: string
  rewarded_video_ad_unit_id: string
  description: string
  enabled: boolean
  created_at: number
}

const miniapps = ref<Miniapp[]>([])
const loading = ref(false)
const showModal = ref(false)
const isEdit = ref(false)
const formData = ref({
  id: 0,
  title: '',
  appid: '',
  secret: '',
  rewarded_video_ad_unit_id: '',
  description: '',
  enabled: true
})

onMounted(() => {
  fetchList()
})

const fetchList = async () => {
  try {
    const response = await api.get('/admin/miniapp/list')
    if (response.code === 0) {
      miniapps.value = response.data || []
    } else {
      showMessage(response.message || '获取列表失败', 'error')
    }
  } catch (error: any) {
    console.error('获取列表失败:', error)
    showMessage(error.response?.data?.message || '获取列表失败', 'error')
  }
}

const openAddModal = () => {
  isEdit.value = false
  formData.value = {
    id: 0,
    title: '',
    appid: '',
    secret: '',
    rewarded_video_ad_unit_id: '',
    description: '',
    enabled: true
  }
  showModal.value = true
}

const openEditModal = (item: Miniapp) => {
  isEdit.value = true
  formData.value = {
    id: item.id,
    title: item.title,
    appid: item.appid,
    secret: '',
    rewarded_video_ad_unit_id: item.rewarded_video_ad_unit_id || '',
    description: item.description,
    enabled: item.enabled
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const saveItem = async () => {
  if (!formData.value.title || !formData.value.appid) {
    showMessage('请填写必填项', 'error')
    return
  }

  if (!isEdit.value && !formData.value.secret) {
    showMessage('请输入AppSecret', 'error')
    return
  }

  loading.value = true
  try {
    const payload: any = {
      title: formData.value.title,
      appid: formData.value.appid,
      rewarded_video_ad_unit_id: formData.value.rewarded_video_ad_unit_id,
      description: formData.value.description,
      enabled: formData.value.enabled
    }

    if (formData.value.secret) {
      payload.secret = formData.value.secret
    }

    const url = isEdit.value ? `/admin/miniapp/${formData.value.id}` : '/admin/miniapp'
    const response = isEdit.value 
      ? await api.put(url, payload)
      : await api.post(url, payload)

    if (response.code === 0) {
      showMessage(isEdit.value ? '更新成功' : '添加成功', 'success')
      closeModal()
      await fetchList()
    } else {
      showMessage(response.message || '保存失败', 'error')
    }
  } catch (error: any) {
    console.error('保存失败:', error)
    showMessage(error.response?.data?.message || '保存失败', 'error')
  } finally {
    loading.value = false
  }
}

const toggleStatus = async (item: Miniapp) => {
  try {
    const response = await api.put(`/admin/miniapp/${item.id}`, {
      enabled: !item.enabled
    })
    if (response.code === 0) {
      showMessage(item.enabled ? '已禁用' : '已启用', 'success')
      await fetchList()
    } else {
      showMessage(response.message || '操作失败', 'error')
    }
  } catch (error: any) {
    console.error('操作失败:', error)
    showMessage(error.response?.data?.message || '操作失败', 'error')
  }
}

const showDeleteDialog = ref(false)
const deleteTarget = ref<Miniapp | null>(null)
const deleting = ref(false)

const confirmDelete = (item: Miniapp) => {
  deleteTarget.value = item
  showDeleteDialog.value = true
}

const handleDelete = async () => {
  if (!deleteTarget.value) return

  deleting.value = true
  try {
    const response = await api.delete(`/admin/miniapp/${deleteTarget.value.id}`)
    if (response.code === 0) {
      showMessage('删除成功', 'success')
      showDeleteDialog.value = false
      deleteTarget.value = null
      await fetchList()
    } else {
      showMessage(response.message || '删除失败', 'error')
    }
  } catch (error: any) {
    console.error('删除失败:', error)
    showMessage(error.response?.data?.message || '删除失败', 'error')
  } finally {
    deleting.value = false
  }
}

const formatDate = (timestamp: number) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('zh-CN')
}
</script>
