<template>
  <div class="space-y-6">
    <div class="rounded-lg bg-white p-5 shadow-sm">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <BaseInput
            v-model="filters.search"
            placeholder="发件账号 / SMTP主机"
            size="sm"
            class="w-72"
            @keyup.enter="loadPageData"
          />
          <div class="w-36">
            <CustomSelect v-model="filters.status" :options="statusOptions" placeholder="全部状态" size="sm" />
          </div>
          <button type="button" class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700" @click="loadPageData">
            查询
          </button>
        </div>
        <button
          type="button"
          class="h-10 rounded-md bg-primary-600 px-4 text-sm text-white hover:bg-primary-700"
          @click="openAddModal"
        >
          添加账号
        </button>
      </div>
    </div>

    <AdminDataTable title="发信账号配置" :loading="loading" :column-count="7">
      <template #thead>
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">发件账号</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">SMTP 主机</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">端口</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">通道</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">类别</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">状态</th>
          <th class="px-6 py-3 text-right text-xs font-medium text-gray-500">操作</th>
        </tr>
      </template>
      <template #tbody>
        <tr v-if="!filteredRows.length">
          <td colspan="7" class="px-6 py-12 text-center text-sm text-gray-500">暂无发信账号</td>
        </tr>
        <tr v-for="item in filteredRows" :key="item.id" class="hover:bg-gray-50">
          <td class="px-6 py-4 text-sm font-medium text-gray-900">{{ item.email || '-' }}</td>
          <td class="px-6 py-4 text-sm text-gray-700">{{ item.smtp_host || '-' }}</td>
          <td class="px-6 py-4 text-sm text-gray-700">{{ item.smtp_port || '-' }}</td>
          <td class="px-6 py-4 text-sm text-gray-700">{{ item.provider || '-' }}</td>
          <td class="px-6 py-4 text-sm text-gray-700">{{ getCategoryText(item) }}</td>
          <td class="px-6 py-4 text-sm">
            <span :class="getStatusClass(item)" class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium">
              {{ getStatusText(item) }}
            </span>
          </td>
          <td class="px-6 py-4 text-right text-sm">
            <div class="flex items-center justify-end gap-1">
              <ActionButton
                v-if="!item.deliverySelected"
                icon="share"
                tooltip="设为发信"
                variant="enable"
                :disabled="savingKey === String(item.id)"
                @click="handleAssign(item, 'delivery')"
              />
              <ActionButton
                v-if="!item.authSelected"
                icon="check"
                tooltip="设为验证码"
                variant="enable"
                :disabled="savingKey === String(item.id)"
                @click="handleAssign(item, 'auth')"
              />
              <ActionButton
                v-if="item.status === 'active'"
                icon="disable"
                tooltip="禁用"
                variant="disable"
                :disabled="savingKey === String(item.id)"
                @click="handleDisable(item)"
              />
              <ActionButton
                icon="delete"
                tooltip="删除"
                variant="delete"
                :disabled="savingKey === String(item.id)"
                @click="handleDelete(item)"
              />
            </div>
          </td>
        </tr>
      </template>
    </AdminDataTable>

    <BaseModal
      v-model="addModalVisible"
      title="添加发信账号"
      size="md"
      :confirm-text="adding ? '添加中...' : '确定'"
      :confirm-loading="adding"
      :confirm-disabled="!canSubmitAdd"
      @confirm="handleAddAccount"
    >
      <div class="space-y-4">
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-700">类别</label>
          <CustomSelect v-model="addForm.category" :options="categoryOptions" placeholder="请选择类别" />
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-700">邮箱</label>
          <input
            v-model.trim="addForm.email"
            type="text"
            class="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
            placeholder="请输入发件邮箱"
          />
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-700">密码 / 授权码</label>
          <input
            v-model.trim="addForm.password"
            type="text"
            class="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
            placeholder="请输入密码或授权码"
          />
        </div>
      </div>
    </BaseModal>

    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      title="删除发信账号"
      :message="deleteConfirmMessage"
      type="danger"
      confirm-text="删除"
      :loading="deleting"
      loading-text="删除中"
      @confirm="confirmDelete"
      @cancel="closeDeleteConfirm"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import BaseModal from '@/components/BaseModal/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import emailReachApi from '@/api/emailReach'
import { showMessage } from '@/utils/message'

const loading = ref(false)
const rows = ref([])
const savingKey = ref('')
const addModalVisible = ref(false)
const adding = ref(false)
const showDeleteConfirm = ref(false)
const deleting = ref(false)
const deletingItem = ref(null)
const filters = reactive({
  search: '',
  status: ''
})
const addForm = ref({
  category: 'delivery',
  email: '',
  password: ''
})

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '启用', value: 'active' },
  { label: '禁用', value: 'disabled' }
]

const categoryOptions = [
  { label: '发信', value: 'delivery' },
  { label: '验证码', value: 'auth' }
]

const canSubmitAdd = computed(() => Boolean(addForm.value.category && addForm.value.email && addForm.value.password))
const deleteConfirmMessage = computed(() => `确认删除发件账号 ${deletingItem.value?.email || ''} 吗？`)

const filteredRows = computed(() => {
  const keyword = filters.search.trim().toLowerCase()
  return (rows.value || []).filter((item) => {
    const searchMatched = !keyword
      || String(item.email || '').toLowerCase().includes(keyword)
      || String(item.smtp_host || '').toLowerCase().includes(keyword)
      || getCategoryText(item).toLowerCase().includes(keyword)
    const statusMatched = !filters.status || item.status === filters.status
    return searchMatched && statusMatched
  })
})

const mergeAdminAccounts = (deliveryConfig, authConfig) => {
  const accountMap = new Map()
  for (const item of deliveryConfig?.smtp_accounts || []) {
    if (item?.id) accountMap.set(Number(item.id), item)
  }
  for (const item of authConfig?.smtp_accounts || []) {
    if (item?.id) accountMap.set(Number(item.id), item)
  }
  return Array.from(accountMap.values())
}

const buildRows = (accounts, deliveryConfig, authConfig) => {
  const deliveryId = Number(deliveryConfig?.smtp_account_id || 0)
  const authId = Number(authConfig?.smtp_account_id || 0)
  return (accounts || []).map((item) => ({
    ...item,
    deliverySelected: Number(item.id || 0) === deliveryId,
    authSelected: Number(item.id || 0) === authId
  }))
}

const getCategoryText = (item) => {
  if (item?.deliverySelected && item?.authSelected) return '发信 / 验证码'
  if (item?.deliverySelected) return '发信'
  if (item?.authSelected) return '验证码'
  return '未分配'
}

const getStatusText = (item) => {
  if (item?.status !== 'active') return '已禁用'
  if (item?.deliverySelected || item?.authSelected) return '当前使用中'
  return '已启用'
}

const getStatusClass = (item) => {
  if (item?.status !== 'active') return 'bg-red-100 text-red-700'
  if (item?.deliverySelected || item?.authSelected) return 'bg-green-100 text-green-700'
  return 'bg-gray-100 text-gray-600'
}

const loadPageData = async () => {
  loading.value = true
  try {
    const [deliveryRes, authRes] = await Promise.all([
      emailReachApi.getAdminDeliveryConfig(),
      emailReachApi.getAdminAuthVerificationConfig()
    ])
    const accounts = mergeAdminAccounts(deliveryRes.data || {}, authRes.data || {})
    rows.value = buildRows(
      accounts,
      deliveryRes.data || {},
      authRes.data || {}
    )
  } finally {
    loading.value = false
  }
}

const openAddModal = () => {
  addForm.value = {
    category: 'delivery',
    email: '',
    password: ''
  }
  addModalVisible.value = true
}

const assignCategory = async (accountId, category) => {
  if (category === 'auth') {
    return await emailReachApi.updateAdminAuthVerificationSmtpStatus(accountId, { status: 'active' })
  }
  return await emailReachApi.updateAdminDeliverySmtpStatus(accountId, { status: 'active' })
}

const handleAssign = async (item, category) => {
  if (!item?.id) return
  savingKey.value = String(item.id)
  try {
    const res = await assignCategory(item.id, category)
    if (res?.code !== 0) return
    showMessage(category === 'auth' ? '已设为验证码账号' : '已设为发信账号', 'success')
    await loadPageData()
  } finally {
    savingKey.value = ''
  }
}

const handleDisable = async (item) => {
  if (!item?.id) return
  savingKey.value = String(item.id)
  try {
    if (item.deliverySelected) {
      const res = await emailReachApi.updateAdminDeliverySmtpStatus(item.id, { status: 'disabled' })
      if (res?.code !== 0) return
    }
    if (item.authSelected) {
      const res = await emailReachApi.updateAdminAuthVerificationSmtpStatus(item.id, { status: 'disabled' })
      if (res?.code !== 0) return
    }
    if (!item.deliverySelected && !item.authSelected) {
      const res = await emailReachApi.updateAdminDeliverySmtpStatus(item.id, { status: 'disabled' })
      if (res?.code !== 0) return
    }
    showMessage('已禁用', 'success')
    await loadPageData()
  } finally {
    savingKey.value = ''
  }
}

const handleDelete = async (item) => {
  if (!item?.id) return
  deletingItem.value = item
  showDeleteConfirm.value = true
}

const closeDeleteConfirm = () => {
  showDeleteConfirm.value = false
  deletingItem.value = null
}

const confirmDelete = async () => {
  if (!deletingItem.value?.id) return
  deleting.value = true
  savingKey.value = String(deletingItem.value.id)
  try {
    const res = await emailReachApi.deleteAdminSmtpAccount(deletingItem.value.id)
    if (res?.code !== 0) return
    showMessage('删除成功', 'success')
    closeDeleteConfirm()
    await loadPageData()
  } finally {
    deleting.value = false
    savingKey.value = ''
  }
}

const handleAddAccount = async () => {
  if (!canSubmitAdd.value) return
  adding.value = true
  try {
    const res = await emailReachApi.createAdminSmtpAccount({
      category: addForm.value.category,
      email: addForm.value.email,
      password: addForm.value.password
    })
    if (res?.code !== 0) return
    showMessage('添加成功', 'success')
    addModalVisible.value = false
    await loadPageData()
  } finally {
    adding.value = false
  }
}

onMounted(loadPageData)
</script>
