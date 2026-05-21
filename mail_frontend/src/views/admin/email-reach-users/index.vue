<template>
  <div class="space-y-6">
    <div class="rounded-lg bg-white p-5 shadow-sm">
      <div class="flex items-center gap-4">
        <BaseInput
          v-model="filters.search"
          placeholder="邮箱 / 用户名"
          size="sm"
          class="w-72"
          @keyup.enter="loadRows(1)"
        />
        <div class="w-36">
          <CustomSelect v-model="filters.status" :options="statusOptions" placeholder="全部状态" size="sm" />
        </div>
        <button type="button" class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700" @click="loadRows(1)">
          查询
        </button>
      </div>
    </div>

    <AdminDataTable
      title="邮箱用户管理"
      :loading="loading"
      :pagination="pagination"
      :column-count="7"
      @page-change="loadRows"
    >
      <template #thead>
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">客户</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">状态</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">发件数</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">失败数</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">剩余额度</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">最近发送</th>
          <th class="px-6 py-3 text-right text-xs font-medium text-gray-500">操作</th>
        </tr>
      </template>
      <template #tbody>
        <tr v-if="!rows.length">
          <td colspan="7" class="px-6 py-12 text-center text-sm text-gray-500">暂无邮箱用户</td>
        </tr>
        <tr v-for="item in rows" :key="item.user_id" class="hover:bg-gray-50">
          <td class="px-6 py-4 text-sm text-gray-700">
            <div class="font-medium text-gray-900">{{ item.email || '-' }}</div>
            <div class="mt-1 text-xs text-gray-500">{{ item.username || '未设置用户名' }}</div>
          </td>
          <td class="px-6 py-4 text-sm">
            <span :class="statusClass(item.status)" class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium">
              {{ statusLabel(item.status) }}
            </span>
          </td>
          <td class="px-6 py-4 text-sm text-gray-700">{{ formatNumber(item.sent_count) }}</td>
          <td class="px-6 py-4 text-sm text-gray-700">{{ formatNumber(item.failed_count) }}</td>
          <td class="px-6 py-4 text-sm text-gray-700">{{ formatNumber(item.remaining_quota) }}</td>
          <td class="px-6 py-4 text-sm text-gray-500">{{ formatTime(item.last_sent_at) }}</td>
          <td class="px-6 py-4 text-right text-sm">
            <div class="flex items-center justify-end gap-1">
              <ActionButton
                :icon="item.status === 'disabled' ? 'enable' : 'disable'"
                :tooltip="item.status === 'disabled' ? '启用发信' : '封禁发信'"
                :variant="item.status === 'disabled' ? 'enable' : 'disable'"
                :disabled="savingUserId === item.user_id"
                @click="handleToggleStatus(item)"
              />
            </div>
          </td>
        </tr>
      </template>
    </AdminDataTable>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import ActionButton from '@/components/ActionButton/index.vue'
import emailReachApi from '@/api/emailReach'
import { showMessage } from '@/utils/message'

const loading = ref(false)
const savingUserId = ref(0)
const rows = ref([])
const filters = reactive({
  search: '',
  status: ''
})
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
  pages: 1
})

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '正常', value: 'approved' },
  { label: '试用中', value: 'trial' },
  { label: '已停用', value: 'disabled' },
  { label: '待开通', value: 'pending' }
]

const statusLabel = (value) => {
  if (value === 'approved') return '正常'
  if (value === 'trial') return '试用中'
  if (value === 'disabled') return '已停用'
  return '待开通'
}

const statusClass = (value) => {
  if (value === 'approved' || value === 'trial') return 'bg-green-100 text-green-700'
  if (value === 'disabled') return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-600'
}

const formatNumber = (value) => Number(value || 0).toLocaleString()

const formatTime = (value) => {
  if (!value) return '-'
  const date = new Date(Number(value))
  if (Number.isNaN(date.getTime())) return '-'
  const pad = (num) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const loadRows = async (page = pagination.page) => {
  loading.value = true
  try {
    const res = await emailReachApi.getAdminAccounts({
      page,
      limit: pagination.limit,
      search: filters.search,
      status: filters.status
    })
    rows.value = (res.data?.items || []).filter((item) => item?.id && item?.status !== 'pending')
    Object.assign(pagination, {
      page: res.data?.page || page,
      limit: res.data?.limit || pagination.limit,
      total: rows.value.length,
      pages: 1
    })
  } catch (error) {
    showMessage(error?.message || '邮箱用户获取失败', 'error')
  } finally {
    loading.value = false
  }
}

const handleToggleStatus = async (item) => {
  if (!item?.user_id) return
  const nextStatus = item.status === 'disabled' ? 'approved' : 'disabled'
  savingUserId.value = item.user_id
  try {
    await emailReachApi.updateAdminAccountStatus(item.user_id, {
      status: nextStatus,
      notes: nextStatus === 'disabled' ? '管理员手动封禁发信' : '管理员恢复发信'
    })
    showMessage(nextStatus === 'disabled' ? '已封禁发信' : '已恢复发信', 'success')
    await loadRows(pagination.page)
  } catch (error) {
    showMessage(error?.message || '操作失败', 'error')
  } finally {
    savingUserId.value = 0
  }
}

onMounted(() => loadRows(1))
</script>
