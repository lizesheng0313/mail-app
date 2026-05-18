<template>
  <div class="space-y-6">
    <div
      v-if="accessLoaded && access.status !== 'approved' && access.status !== 'trial'"
      class="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900"
    >
      <div class="font-medium">当前账号还没开通邮件触达</div>
      <div class="mt-2">{{ access.reason }}</div>
    </div>

    <div v-if="canOperate" class="rounded-lg border bg-white p-6 shadow-sm">
      <div class="flex items-center gap-4">
        <BaseInput
          v-model="filters.keyword"
          placeholder="收件人"
          size="sm"
          class="h-10 w-64"
        />
        <button
          type="button"
          class="h-10 rounded-md bg-primary-600 px-4 text-sm text-white hover:bg-primary-700"
          @click="applyFilters"
        >
          查询
        </button>
      </div>
    </div>

    <AdminDataTable title="发送记录" :loading="loading" :column-count="5">
      <template #thead>
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">收件人</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">主题</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">状态</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">原因</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">更新时间</th>
        </tr>
      </template>
      <template #tbody>
        <tr v-if="!filteredRows.length && !loading">
          <td colspan="5" class="px-6 py-12 text-center text-black">暂无发送记录</td>
        </tr>
        <tr v-for="item in filteredRows" :key="item.id" class="hover:bg-gray-50">
          <td class="px-6 py-4 text-sm font-medium text-black">{{ item.recipient_email }}</td>
          <td class="px-6 py-4 text-sm text-black">{{ item.subject || '-' }}</td>
          <td class="px-6 py-4 text-sm text-black">{{ statusLabel(item.status) }}</td>
          <td class="px-6 py-4 text-sm text-black">{{ item.status === 'sent' ? '-' : (item.error_message || '-') }}</td>
          <td class="px-6 py-4 text-sm text-black">{{ formatTime(item.updated_at) }}</td>
        </tr>
      </template>
    </AdminDataTable>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import emailReachApi from '@/api/emailReach'
import { showMessage } from '@/utils/message'

const loading = ref(false)
const rows = ref([])
const accessLoaded = ref(false)
const access = ref({
  status: 'pending',
  reason: ''
})
const filters = reactive({
  keyword: ''
})
const appliedFilters = reactive({
  keyword: ''
})

const canOperate = computed(() => access.value.status === 'approved' || access.value.status === 'trial')
const filteredRows = computed(() => {
  const keyword = appliedFilters.keyword.trim().toLowerCase()
  return rows.value.filter((item) => !keyword || String(item.recipient_email || '').toLowerCase().includes(keyword))
})

const applyFilters = () => {
  appliedFilters.keyword = filters.keyword
}

const statusLabel = (status) => {
  if (status === 'queued') return '待发送'
  if (status === 'blocked') return '已拦截'
  if (status === 'sent') return '已发送'
  if (status === 'failed') return '失败'
  return status || '-'
}

const formatTime = (value) => {
  if (!value) return '-'
  const date = new Date(Number(value))
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const loadRows = async () => {
  loading.value = true
  try {
    const res = await emailReachApi.getSendRecords()
    if (res.code === 0) {
      rows.value = res.data.items || []
    }
  } catch (error) {
    showMessage(error?.response?.data?.message || '发送记录获取失败', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const accessRes = await emailReachApi.getAccessSummary()
  accessLoaded.value = true
  if (accessRes.code === 0) {
    access.value = accessRes.data
  }
  if (canOperate.value) {
    await loadRows()
  }
})
</script>
