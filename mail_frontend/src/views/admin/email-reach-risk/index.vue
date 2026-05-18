<template>
  <div class="space-y-6">
    <AdminDataTable
      title="风险名单"
      :loading="loading"
      :pagination="pagination"
      :column-count="7"
      @page-change="loadRows"
    >
      <template #header>
        <div class="flex flex-col gap-4 border-b border-gray-200 px-6 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 class="text-xl font-semibold text-black">风险名单</h2>
            <p class="mt-1 text-sm text-gray-500">统一查看投诉、黑名单和无效地址，避免继续发送。</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <input
              v-model.trim="filters.search"
              type="text"
              placeholder="客户/收件邮箱"
              class="h-10 w-56 rounded-md border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
              @keyup.enter="loadRows(1)"
            />
            <div class="w-36">
              <CustomSelect v-model="filters.block_type" :options="typeOptions" placeholder="全部类型" size="sm" />
            </div>
            <div class="w-36">
              <CustomSelect v-model="filters.status" :options="statusOptions" placeholder="全部状态" size="sm" />
            </div>
            <button type="button" class="h-10 rounded-md bg-primary-600 px-4 text-sm text-white hover:bg-primary-700" @click="loadRows(1)">
              查询
            </button>
          </div>
        </div>
      </template>
      <template #thead>
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">客户</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">邮箱</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">类型</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">范围</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">来源</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">原因</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">更新时间</th>
        </tr>
      </template>
      <template #tbody>
        <tr v-if="!rows.length">
          <td colspan="7" class="px-6 py-12 text-center text-sm text-gray-500">暂无风险记录</td>
        </tr>
        <tr v-for="item in rows" :key="item.id" class="hover:bg-gray-50">
          <td class="px-6 py-4 text-sm text-gray-700">
            <div class="font-medium text-gray-900">{{ item.user_email || '-' }}</div>
            <div class="mt-1 text-xs text-gray-500">{{ item.username || '未设置用户名' }}</div>
          </td>
          <td class="px-6 py-4 text-sm font-medium text-gray-900">{{ item.email || '-' }}</td>
          <td class="px-6 py-4 text-sm">
            <span :class="typeClass(item.block_type)" class="rounded-full px-2.5 py-1 text-xs font-medium">
              {{ typeLabel(item.block_type) }}
            </span>
          </td>
          <td class="px-6 py-4 text-sm text-gray-700">{{ scopeLabel(item.scope) }}</td>
          <td class="px-6 py-4 text-sm text-gray-700">{{ sourceLabel(item.source) }}</td>
          <td class="max-w-xs truncate px-6 py-4 text-sm text-gray-500">{{ item.reason || '-' }}</td>
          <td class="px-6 py-4 text-sm text-gray-500">{{ formatTime(item.updated_at || item.created_at) }}</td>
        </tr>
      </template>
    </AdminDataTable>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import emailReachApi from '@/api/emailReach'
import { showMessage } from '@/utils/message'

const loading = ref(false)
const rows = ref([])
const pagination = reactive({ page: 1, limit: 20, total: 0, pages: 1 })
const filters = reactive({ search: '', block_type: '', status: 'active' })

const typeOptions = [
  { label: '全部类型', value: '' },
  { label: '投诉', value: 'complaint' },
  { label: '黑名单', value: 'blacklist' },
  { label: '无效地址', value: 'invalid' }
]
const statusOptions = [
  { label: '生效中', value: 'active' },
  { label: '全部状态', value: '' },
  { label: '已停用', value: 'inactive' }
]

const typeLabel = (value) => ({ complaint: '投诉', blacklist: '黑名单', invalid: '无效地址' }[value] || value || '-')
const typeClass = (value) => {
  if (value === 'complaint') return 'bg-red-100 text-red-700'
  if (value === 'blacklist') return 'bg-gray-200 text-gray-700'
  return 'bg-yellow-100 text-yellow-700'
}
const scopeLabel = (value) => ({ all: '全部', marketing: '营销', transactional: '事务' }[value] || value || '-')
const sourceLabel = (value) => ({ user_report: '用户举报', precheck: '发送前检测', system: '系统录入' }[value] || value || '-')
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
    const response = await emailReachApi.getAdminRecipientBlocks({
      page,
      limit: pagination.limit,
      search: filters.search,
      block_type: filters.block_type,
      status: filters.status
    })
    rows.value = response.data?.items || []
    Object.assign(pagination, {
      page: response.data?.page || page,
      limit: response.data?.limit || pagination.limit,
      total: response.data?.total || 0,
      pages: response.data?.pages || 1
    })
  } catch (error) {
    showMessage(error?.message || '风险名单获取失败', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => loadRows(1))
</script>
