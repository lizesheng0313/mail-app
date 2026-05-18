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
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center gap-4">
          <BaseInput
            v-model="filters.keyword"
            placeholder="邮箱"
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
        <button
          type="button"
          class="h-10 rounded-md bg-primary-600 px-4 text-sm text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!canOperate"
          @click="handleAddUnsubscribe"
        >
          新增退订
        </button>
      </div>
    </div>

    <AdminDataTable title="退订名单" :loading="loading" :column-count="5">
      <template #thead>
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">邮箱</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">来源</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">状态</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">原因</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">更新时间</th>
        </tr>
      </template>
      <template #tbody>
        <tr v-if="!filteredRows.length && !loading">
          <td colspan="5" class="px-6 py-12 text-center text-black">暂无退订记录</td>
        </tr>
        <tr v-for="item in filteredRows" :key="item.id" class="hover:bg-gray-50">
          <td class="px-6 py-4 text-sm font-medium text-black">{{ item.email }}</td>
          <td class="px-6 py-4 text-sm text-black">{{ sourceLabel(item.source) }}</td>
          <td class="px-6 py-4 text-sm text-black">{{ statusLabel(item.status) }}</td>
          <td class="px-6 py-4 text-sm text-black">{{ item.reason || '-' }}</td>
          <td class="px-6 py-4 text-sm text-black">{{ formatTime(item.updated_at) }}</td>
        </tr>
      </template>
    </AdminDataTable>

    <UnsubscribeEditorModal
      v-model:visible="showEditorModal"
      :can-operate="canOperate"
      @saved="handleSaved"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import emailReachApi from '@/api/emailReach'
import UnsubscribeEditorModal from './components/UnsubscribeEditorModal.vue'

const loading = ref(false)
const accessLoaded = ref(false)
const rows = ref([])
const showEditorModal = ref(false)
const filters = reactive({
  keyword: ''
})
const appliedFilters = reactive({
  keyword: ''
})
const access = ref({
  status: 'pending',
  reason: ''
})
const canOperate = computed(() => access.value.status === 'approved' || access.value.status === 'trial')
const filteredRows = computed(() => {
  const keyword = appliedFilters.keyword.trim().toLowerCase()
  return rows.value.filter((item) => !keyword || String(item.email || '').toLowerCase().includes(keyword))
})

const applyFilters = () => {
  appliedFilters.keyword = filters.keyword
}

const sourceLabel = (source) => {
  if (source === 'user_click') return '用户点击退订'
  return '系统录入'
}

const statusLabel = (status) => {
  if (status === 'inactive') return '已取消'
  return '生效中'
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
    const res = await emailReachApi.getUnsubscribes()
    if (res.code === 0) {
      rows.value = res.data.items || []
    }
  } finally {
    loading.value = false
  }
}

const handleAddUnsubscribe = () => {
  showEditorModal.value = true
}

const handleSaved = async () => {
  await loadRows()
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
