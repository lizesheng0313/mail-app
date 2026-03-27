<template>
  <div class="h-full">
    <div class="h-full flex flex-col gap-8">
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex justify-between items-center gap-4">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">模型管理</h2>
            <p class="text-sm text-gray-600 mt-1">管理员维护平台可用模型，开放平台应用从这里选择自己的模型。</p>
          </div>
          <button
            @click="openAddModal"
            class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm flex items-center"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            添加模型
          </button>
        </div>
      </div>

      <AdminDataTable :loading="loading" :column-count="8">
        <template #thead>
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">提供商</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">模型标识</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">环境变量</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">配置状态</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">启用状态</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">默认</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
          </tr>
        </template>
        <template #tbody>
          <tr v-for="item in models" :key="item.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ item.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{{ item.provider }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{{ item.model }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{{ item.api_key_env }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="item.configured ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'" class="px-2 py-1 text-xs rounded-full">
                {{ item.configured ? '已配置' : '未配置' }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="item.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'" class="px-2 py-1 text-xs rounded-full">
                {{ item.status === 'active' ? '启用' : '停用' }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="item.is_default ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-600'" class="px-2 py-1 text-xs rounded-full">
                {{ item.is_default ? '默认模型' : '普通模型' }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <div class="flex items-center space-x-3">
                <ActionButton icon="edit" tooltip="编辑" @click.stop="openEditModal(item)" />
                <ActionButton
                  v-if="!item.is_default && item.status === 'active'"
                  icon="check"
                  tooltip="设为默认"
                  @click.stop="handleSetDefault(item)"
                />
                <ActionButton icon="delete" tooltip="删除" variant="danger" @click.stop="confirmDelete(item)" />
              </div>
            </td>
          </tr>
          <tr v-if="models.length === 0">
            <td colspan="8" class="px-6 py-8 text-center text-gray-500">暂无模型配置</td>
          </tr>
        </template>
      </AdminDataTable>
    </div>

    <BaseModal v-model="showModal" :title="isEdit ? '编辑模型' : '添加模型'" :show-footer="false" @close="closeModal">
      <div class="space-y-4">
        <BaseInput v-model="formData.name" label="模型名称" placeholder="比如：DeepSeek 主模型" />

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">提供商</label>
          <select v-model="formData.provider" class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none focus:border-primary-400">
            <option v-for="item in providerOptions" :key="item" :value="item">{{ item }}</option>
          </select>
        </div>

        <BaseInput v-model="formData.model" label="模型标识" placeholder="比如：deepseek-chat / gpt-4o-mini" />
        <BaseInput v-model="formData.api_base" label="接口 Base URL" placeholder="留空走默认地址" />
        <BaseInput v-model="formData.api_key_env" label="环境变量名" placeholder="比如：OPENAI_API_KEY" />

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">状态</label>
          <select v-model="formData.status" class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none focus:border-primary-400">
            <option v-for="item in statusOptions" :key="item" :value="item">{{ item }}</option>
          </select>
        </div>

        <label class="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
          <input v-model="formData.is_default" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
          <span>设成默认模型</span>
        </label>
      </div>

      <div class="flex justify-end space-x-3 mt-6">
        <button @click="closeModal" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">取消</button>
        <button @click="saveModel" :disabled="submitting" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md disabled:opacity-50">
          {{ submitting ? '保存中...' : '保存' }}
        </button>
      </div>
    </BaseModal>

    <ConfirmDialog
      :visible="showDeleteDialog"
      title="删除模型"
      :message="`确定删除模型【${deleteTarget?.name}】吗？删除后已绑定应用会回退到平台默认模型。`"
      :loading="deleting"
      @confirm="handleDelete"
      @cancel="showDeleteDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

import ActionButton from '@/components/ActionButton/index.vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import BaseModal from '@/components/BaseModal/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import api from '@/services/api'
import { showConfirm } from '@/utils/dialog'
import { showMessage } from '@/utils/message'

type ModelItem = {
  id: number
  name: string
  provider: string
  model: string
  api_base: string
  api_key_env: string
  configured: boolean
  status: string
  is_default: boolean
}

const providerOptions = ['deepseek', 'openai', 'compatible']
const statusOptions = ['active', 'disabled']

const loading = ref(false)
const submitting = ref(false)
const deleting = ref(false)
const showModal = ref(false)
const showDeleteDialog = ref(false)
const isEdit = ref(false)
const models = ref<ModelItem[]>([])
const deleteTarget = ref<ModelItem | null>(null)
const formData = ref({
  id: 0,
  name: '',
  provider: 'compatible',
  model: '',
  api_base: '',
  api_key_env: '',
  status: 'active',
  is_default: false,
})

const fetchList = async () => {
  loading.value = true
  try {
    const response: any = await api.get('/admin/ai-models/list')
    if (response.code === 0) {
      models.value = response.data || []
    }
  } finally {
    loading.value = false
  }
}

const openAddModal = () => {
  isEdit.value = false
  formData.value = {
    id: 0,
    name: '',
    provider: 'compatible',
    model: '',
    api_base: '',
    api_key_env: '',
    status: 'active',
    is_default: false,
  }
  showModal.value = true
}

const openEditModal = (item: ModelItem) => {
  isEdit.value = true
  formData.value = {
    id: item.id,
    name: item.name,
    provider: item.provider,
    model: item.model,
    api_base: item.api_base || '',
    api_key_env: item.api_key_env,
    status: item.status,
    is_default: item.is_default,
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const saveModel = async () => {
  if (!formData.value.name.trim()) {
    showMessage('请先填写模型名称', 'warning')
    return
  }
  if (!formData.value.model.trim()) {
    showMessage('请先填写模型标识', 'warning')
    return
  }
  if (!formData.value.api_key_env.trim()) {
    showMessage('请先填写环境变量名', 'warning')
    return
  }

  submitting.value = true
  try {
    const payload = {
      name: formData.value.name.trim(),
      provider: formData.value.provider,
      model: formData.value.model.trim(),
      api_base: formData.value.api_base.trim() || undefined,
      api_key_env: formData.value.api_key_env.trim(),
      status: formData.value.status,
      is_default: formData.value.is_default,
    }
    const response: any = isEdit.value
      ? await api.put(`/admin/ai-models/${formData.value.id}`, payload)
      : await api.post('/admin/ai-models', payload)

    if (response.code === 0) {
      showModal.value = false
      await fetchList()
    }
  } finally {
    submitting.value = false
  }
}

const handleSetDefault = async (item: ModelItem) => {
  const confirmed = await showConfirm(`确定把【${item.name}】设成默认模型吗？`, '设为默认模型')
  if (!confirmed) return
  const response: any = await api.post(`/admin/ai-models/${item.id}/set-default`)
  if (response.code === 0) {
    await fetchList()
  }
}

const confirmDelete = (item: ModelItem) => {
  deleteTarget.value = item
  showDeleteDialog.value = true
}

const handleDelete = async () => {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    const response: any = await api.delete(`/admin/ai-models/${deleteTarget.value.id}`)
    if (response.code === 0) {
      showDeleteDialog.value = false
      deleteTarget.value = null
      await fetchList()
    }
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  fetchList()
})
</script>
