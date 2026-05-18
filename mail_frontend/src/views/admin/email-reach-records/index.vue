<template>
  <div class="space-y-6">
    <AdminDataTable
      title="发送记录"
      :loading="loading"
      :pagination="pagination"
      :column-count="7"
      @page-change="loadRows"
    >
      <template #header>
        <div class="flex flex-col gap-4 border-b border-gray-200 px-6 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 class="text-xl font-semibold text-black">发送记录</h2>
            <p class="mt-1 text-sm text-gray-500">查看所有客户的邮件发送状态、失败原因和服务商回执。</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <input
              v-model.trim="filters.search"
              type="text"
              placeholder="客户/收件人/主题"
              class="h-10 w-56 rounded-md border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
              @keyup.enter="loadRows(1)"
            />
            <div class="w-36">
              <CustomSelect v-model="filters.channel" :options="channelOptions" placeholder="全部类型" size="sm" />
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
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">收件人</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">主题</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">类型</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">状态</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">失败原因</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">时间</th>
        </tr>
      </template>
      <template #tbody>
        <tr v-if="!rows.length">
          <td colspan="7" class="px-6 py-12 text-center text-sm text-gray-500">暂无发送记录</td>
        </tr>
        <tr v-for="item in rows" :key="item.id" class="hover:bg-gray-50">
          <td class="px-6 py-4 text-sm text-gray-700">
            <div class="font-medium text-gray-900">{{ item.user_email || '-' }}</div>
            <div class="mt-1 text-xs text-gray-500">{{ item.username || '未设置用户名' }}</div>
          </td>
          <td class="px-6 py-4 text-sm text-gray-700">{{ item.recipient_email || '-' }}</td>
          <td class="px-6 py-4 text-sm text-gray-700">{{ item.subject || '-' }}</td>
          <td class="px-6 py-4 text-sm">
            <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="item.channel === 'marketing' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'">
              {{ item.channel === 'marketing' ? '营销' : '事务' }}
            </span>
          </td>
          <td class="px-6 py-4 text-sm">
            <span :class="statusClass(item.status)" class="rounded-full px-2.5 py-1 text-xs font-medium">
              {{ statusLabel(item.status) }}
            </span>
          </td>
          <td class="max-w-xs truncate px-6 py-4 text-sm text-gray-500">{{ item.error_message || '-' }}</td>
          <td class="px-6 py-4 text-sm text-gray-500">{{ formatTime(item.sent_at || item.updated_at || item.created_at) }}</td>
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
const filters = reactive({ search: '', status: '', channel: '' })

const channelOptions = [
  { label: '全部类型', value: '' },
  { label: '事务', value: 'transactional' },
  { label: '营销', value: 'marketing' }
]
const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '成功', value: 'sent' },
  { label: '失败', value: 'failed' },
  { label: '已拦截', value: 'blocked' },
  { label: '队列中', value: 'queued' }
]

const statusLabel = (value) => ({ sent: '成功', failed: '失败', blocked: '已拦截', queued: '队列中' }[value] || value || '-')
const statusClass = (value) => {
  if (value === 'sent') return 'bg-green-100 text-green-700'
  if (value === 'failed') return 'bg-red-100 text-red-700'
  if (value === 'blocked') return 'bg-yellow-100 text-yellow-700'
  return 'bg-gray-100 text-gray-600'
}
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
    const response = await emailReachApi.getAdminSendRecords({
      page,
      limit: pagination.limit,
      search: filters.search,
      status: filters.status,
      channel: filters.channel
    })
    rows.value = response.data?.items || []
    Object.assign(pagination, {
      page: response.data?.page || page,
      limit: response.data?.limit || pagination.limit,
      total: response.data?.total || 0,
      pages: response.data?.pages || 1
    })
  } catch (error) {
    showMessage(error?.message || '发送记录获取失败', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => loadRows(1))
</script>
