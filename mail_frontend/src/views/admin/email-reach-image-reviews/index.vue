<template>
  <div class="space-y-6">
    <AdminDataTable
      title="图片审核日志"
      :loading="loading"
      :pagination="pagination"
      :column-count="8"
      @page-change="loadRows"
    >
      <template #header>
        <div class="flex flex-col gap-4 border-b border-gray-200 px-6 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 class="text-xl font-semibold text-black">图片审核日志</h2>
            <p class="mt-1 text-sm text-gray-500">查看客户上传邮件图片的 VL 审核结果。</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <input
              v-model.trim="filters.search"
              type="text"
              placeholder="客户/文件名/原因"
              class="h-10 w-56 rounded-md border border-gray-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
              @keyup.enter="loadRows(1)"
            />
            <div class="w-36">
              <CustomSelect v-model="filters.review_status" :options="statusOptions" placeholder="全部状态" size="sm" />
            </div>
            <div class="w-36">
              <CustomSelect v-model="filters.risk_level" :options="riskOptions" placeholder="全部风险" size="sm" />
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
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">图片</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">文件名</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">大小</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">状态</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">风险</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">原因</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500">时间</th>
        </tr>
      </template>
      <template #tbody>
        <tr v-if="!rows.length">
          <td colspan="8" class="px-6 py-12 text-center text-sm text-gray-500">暂无图片审核日志</td>
        </tr>
        <tr v-for="item in rows" :key="item.id" class="hover:bg-gray-50">
          <td class="px-6 py-4 text-sm text-gray-700">
            <div class="font-medium text-gray-900">{{ item.user_email || '-' }}</div>
            <div class="mt-1 text-xs text-gray-500">{{ item.username || '未设置用户名' }}</div>
          </td>
          <td class="px-6 py-4">
            <img v-if="item.file_url" :src="item.file_url" class="h-12 w-12 rounded object-cover" />
            <div v-else class="flex h-12 w-12 items-center justify-center rounded bg-gray-100 text-xs text-gray-400">无图</div>
          </td>
          <td class="max-w-xs truncate px-6 py-4 text-sm text-gray-700">{{ item.filename || '-' }}</td>
          <td class="px-6 py-4 text-sm text-gray-700">{{ formatSize(item.file_size) }}</td>
          <td class="px-6 py-4 text-sm">
            <span :class="item.review_status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'" class="rounded-full px-2.5 py-1 text-xs font-medium">
              {{ item.review_status === 'approved' ? '通过' : '拒绝' }}
            </span>
          </td>
          <td class="px-6 py-4 text-sm text-gray-700">{{ riskLabel(item.risk_level) }}</td>
          <td class="max-w-xs truncate px-6 py-4 text-sm text-gray-500">{{ item.review_summary || '-' }}</td>
          <td class="px-6 py-4 text-sm text-gray-500">{{ formatTime(item.created_at) }}</td>
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
const filters = reactive({ search: '', review_status: '', risk_level: '' })

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '通过', value: 'approved' },
  { label: '拒绝', value: 'rejected' }
]
const riskOptions = [
  { label: '全部风险', value: '' },
  { label: '高风险', value: 'high' },
  { label: '中风险', value: 'medium' },
  { label: '低风险', value: 'low' }
]

const riskLabel = (value) => ({ high: '高风险', medium: '中风险', low: '低风险' }[value] || '-')
const formatSize = (value) => {
  const size = Number(value || 0)
  if (size <= 0) return '-'
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`
  return `${(size / 1024 / 1024).toFixed(1)}MB`
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
    const response = await emailReachApi.getAdminImageReviewLogs({
      page,
      limit: pagination.limit,
      search: filters.search,
      review_status: filters.review_status,
      risk_level: filters.risk_level
    })
    rows.value = response.data?.items || []
    Object.assign(pagination, {
      page: response.data?.page || page,
      limit: response.data?.limit || pagination.limit,
      total: response.data?.total || 0,
      pages: response.data?.pages || 1
    })
  } catch (error) {
    showMessage(error?.message || '图片审核日志获取失败', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => loadRows(1))
</script>
