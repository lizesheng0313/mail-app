<template>
  <div class="space-y-6">
    <AccessPendingAlert v-if="accessLoaded && !canOperate" :reason="access.reason" />

    <div v-if="canOperate" class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center gap-4">
          <BaseInput
            v-model="filters.keyword"
            placeholder="邮箱"
            size="sm"
            class="h-10 w-64"
          />
          <div class="w-40">
            <CustomSelect v-model="filters.block_type" :options="blockTypeOptions" placeholder="全部类型" size="sm" />
          </div>
          <button
            type="button"
            class="h-10 rounded-xl bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700"
            @click="applyFilters"
          >
            查询
          </button>
        </div>
        <button
          type="button"
          class="h-10 rounded-xl bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!canOperate"
          @click="showEditorModal = true"
        >
          新增名单
        </button>
      </div>
    </div>

    <AdminDataTable title="拦截名单" :loading="loading" :column-count="6">
      <template #thead>
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">邮箱</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">名单类型</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">来源</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">状态</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">原因</th>
          <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">更新时间</th>
        </tr>
      </template>
      <template #tbody>
        <tr v-if="!filteredRows.length && !loading">
          <td colspan="6" :class="TABLE_EMPTY_CELL_CLASS">暂无拦截名单</td>
        </tr>
        <tr v-for="item in filteredRows" :key="item.id" class="hover:bg-gray-50">
          <td class="px-6 py-4 text-sm font-medium text-black">{{ item.email }}</td>
          <td class="px-6 py-4 text-sm text-black">{{ typeLabel(item.block_type) }}</td>
          <td class="px-6 py-4 text-sm text-black">{{ sourceLabel(item.source) }}</td>
          <td class="px-6 py-4 text-sm text-black">
            <span :class="statusTagClass(item.status)">{{ statusLabel(item.status) }}</span>
          </td>
          <td class="px-6 py-4 text-sm text-black">{{ item.reason || '-' }}</td>
          <td class="px-6 py-4 text-sm text-black">{{ formatDateTime(item.updated_at) }}</td>
        </tr>
      </template>
    </AdminDataTable>

    <RecipientBlockEditorModal
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
import CustomSelect from '@/components/CustomSelect/index.vue'
import emailReachApi from '@/api/emailReach'
import AccessPendingAlert from './components/AccessPendingAlert.vue'
import RecipientBlockEditorModal from './components/RecipientBlockEditorModal.vue'
import { TABLE_EMPTY_CELL_CLASS, buildBadgeClass, formatDateTime, getActiveStatusMeta, hasAccessStatus } from './ui'

const loading = ref(false)
const accessLoaded = ref(false)
const showEditorModal = ref(false)
const rows = ref([])
const filters = reactive({
  keyword: '',
  block_type: ''
})
const appliedFilters = reactive({
  keyword: '',
  block_type: ''
})
const blockTypeOptions = [
  { label: '全部类型', value: '' },
  { label: '无效地址', value: 'invalid' },
  { label: '投诉地址', value: 'complaint' },
  { label: '黑名单', value: 'blacklist' }
]
const access = ref({
  status: 'pending',
  reason: ''
})

const canOperate = computed(() => hasAccessStatus(access.value.status))
const filteredRows = computed(() => {
  const keyword = appliedFilters.keyword.trim().toLowerCase()
  return rows.value.filter((item) => {
    const matchKeyword = !keyword || String(item.email || '').toLowerCase().includes(keyword)
    const matchType = !appliedFilters.block_type || item.block_type === appliedFilters.block_type
    return matchKeyword && matchType
  })
})

const applyFilters = () => {
  appliedFilters.keyword = filters.keyword
  appliedFilters.block_type = filters.block_type
}

const typeLabel = (value) => {
  if (value === 'invalid') return '无效地址'
  if (value === 'complaint') return '投诉地址'
  return '黑名单'
}

const sourceLabel = (source) => {
  if (source === 'manual') return '手动录入'
  if (source === 'precheck') return '发送前检测'
  if (source === 'complaint_sync') return '投诉同步'
  return '系统录入'
}

const statusLabel = (status) => {
  return getActiveStatusMeta(status).label
}

const statusTagClass = (status) => {
  return buildBadgeClass(getActiveStatusMeta(status).tone)
}

const loadRows = async () => {
  loading.value = true
  try {
    const res = await emailReachApi.getRecipientBlocks({ block_type: filters.block_type })
    if (res.code === 0) {
      rows.value = res.data.items || []
    }
  } finally {
    loading.value = false
  }
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
