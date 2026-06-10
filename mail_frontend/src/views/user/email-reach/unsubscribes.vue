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
          <td colspan="5" :class="TABLE_EMPTY_CELL_CLASS">暂无退订记录</td>
        </tr>
        <tr v-for="item in filteredRows" :key="item.id" class="hover:bg-gray-50">
          <td class="px-6 py-4 text-sm font-medium text-black">{{ item.email }}</td>
          <td class="px-6 py-4 text-sm text-black">{{ sourceLabel(item.source) }}</td>
          <td class="px-6 py-4 text-sm text-black">
            <span :class="statusTagClass(item.status)">{{ statusLabel(item.status) }}</span>
          </td>
          <td class="px-6 py-4 text-sm text-black">{{ item.reason || '-' }}</td>
          <td class="px-6 py-4 text-sm text-black">{{ formatDateTime(item.updated_at) }}</td>
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
import AccessPendingAlert from './components/AccessPendingAlert.vue'
import UnsubscribeEditorModal from './components/UnsubscribeEditorModal.vue'
import { TABLE_EMPTY_CELL_CLASS, buildBadgeClass, formatDateTime, getActiveStatusMeta, hasAccessStatus } from './ui'

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
const canOperate = computed(() => hasAccessStatus(access.value.status))
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
  return getActiveStatusMeta(status).label
}

const statusTagClass = (status) => {
  return buildBadgeClass(getActiveStatusMeta(status).tone)
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
