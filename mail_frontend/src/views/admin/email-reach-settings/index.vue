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
          <button type="button" class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700" @click="loadPageData">
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

    <AdminDataTable title="发信配置" :loading="loading" :column-count="6">
      <template #thead>
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">发件账号</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">SMTP 主机</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">端口</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">通道</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">状态</th>
          <th class="px-6 py-3 text-right text-xs font-medium text-gray-500">操作</th>
        </tr>
      </template>
      <template #tbody>
        <tr v-if="!rows.length">
          <td colspan="6" class="px-6 py-12 text-center text-sm text-gray-500">暂无发信账号</td>
        </tr>
        <tr v-for="item in filteredRows" :key="item.id" class="hover:bg-gray-50">
          <td class="px-6 py-4 text-sm font-medium text-gray-900">{{ item.email || '-' }}</td>
          <td class="px-6 py-4 text-sm text-gray-700">{{ item.smtp_host || '-' }}</td>
          <td class="px-6 py-4 text-sm text-gray-700">{{ item.smtp_port || '-' }}</td>
          <td class="px-6 py-4 text-sm text-gray-700">{{ item.provider || '-' }}</td>
          <td class="px-6 py-4 text-sm">
            <span
              :class="item.status === 'active' && item.selected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
              class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
            >
              {{ item.status === 'active' && item.selected ? '启用' : '禁用' }}
            </span>
          </td>
          <td class="px-6 py-4 text-right text-sm">
            <div class="flex items-center justify-end gap-1">
              <ActionButton
                :icon="item.status === 'active' ? 'disable' : 'enable'"
                :tooltip="item.status === 'active' ? '禁用' : '启用'"
                :variant="item.status === 'active' ? 'disable' : 'enable'"
                :disabled="savingId === item.id"
                @click="handleToggleStatus(item)"
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
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import BaseModal from '@/components/BaseModal/index.vue'
import emailReachApi from '@/api/emailReach'
import smtpAccountsAPI from '@/api/smtpAccounts'
import { showMessage } from '@/utils/message'

const loading = ref(false)
const rows = ref([])
const savingId = ref(0)
const addModalVisible = ref(false)
const adding = ref(false)
const filters = reactive({
  search: '',
  status: ''
})
const addForm = ref({
  email: '',
  password: ''
})

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '启用', value: 'active' },
  { label: '禁用', value: 'disabled' }
]

const canSubmitAdd = computed(() => Boolean(addForm.value.email && addForm.value.password))

const filteredRows = computed(() => {
  const keyword = filters.search.trim().toLowerCase()
  return (rows.value || []).filter((item) => {
    const searchMatched = !keyword
      || String(item.email || '').toLowerCase().includes(keyword)
      || String(item.smtp_host || '').toLowerCase().includes(keyword)
    const statusMatched = !filters.status || item.status === filters.status
    return searchMatched && statusMatched
  })
})

const statusLabel = (value) => {
  if (value === 'active') return '启用'
  if (value === 'disabled') return '禁用'
  return '未知'
}

const statusClass = (value) => {
  if (value === 'active') return 'bg-green-100 text-green-700'
  if (value === 'disabled') return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-600'
}

const loadPageData = async () => {
  loading.value = true
  try {
    const res = await emailReachApi.getAdminDeliveryConfig()
    rows.value = res.data?.smtp_accounts || []
  } catch (error) {
    showMessage(error?.message || '发信配置获取失败', 'error')
  } finally {
    loading.value = false
  }
}

const openAddModal = () => {
  addForm.value = { email: '', password: '' }
  addModalVisible.value = true
}

const handleToggleStatus = async (item) => {
  if (!item?.id) return
  const nextStatus = item.status === 'active' ? 'disabled' : 'active'
  savingId.value = item.id
  try {
    await emailReachApi.updateAdminDeliverySmtpStatus(item.id, { status: nextStatus })
    showMessage(nextStatus === 'active' ? '已启用' : '已禁用', 'success')
    await loadPageData()
  } catch (error) {
    showMessage(error?.message || '保存失败', 'error')
  } finally {
    savingId.value = 0
  }
}

const handleAddAccount = async () => {
  if (!canSubmitAdd.value) return
  adding.value = true
  try {
    await smtpAccountsAPI.addAccount({
      email: addForm.value.email,
      password: addForm.value.password
    })
    showMessage('添加成功', 'success')
    addModalVisible.value = false
    await loadPageData()
  } catch (error) {
    showMessage(error?.message || '添加失败', 'error')
  } finally {
    adding.value = false
  }
}

onMounted(loadPageData)
</script>
