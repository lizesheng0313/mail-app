<template>
  <div class="space-y-6">
    <AccessPendingAlert v-if="accessLoaded && !canOperate" :reason="access.reason" />

    <template v-if="canOperate">
      <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="flex flex-wrap items-center gap-3">
          <BaseInput
            v-model="filters.keyword"
            placeholder="收件人/主题"
            size="sm"
            class="h-10 w-64"
          />
          <div class="w-36">
            <CustomSelect v-model="filters.status" :options="statusOptions" size="sm" />
          </div>
          <div class="w-36">
            <CustomSelect v-model="filters.behavior" :options="behaviorOptions" size="sm" />
          </div>
          <button
            type="button"
            class="h-10 rounded-xl bg-primary-600 px-5 text-sm font-medium text-white hover:bg-primary-700"
            @click="applyFilters"
          >
            查询
          </button>
        </div>
      </div>

      <AdminDataTable title="收件人行为明细" :loading="loading" :column-count="6" table-class="min-w-[1040px] table-fixed">
        <template #thead>
          <tr>
            <th class="w-[240px] px-4 py-3 text-left text-xs font-medium text-black">收件人</th>
            <th class="w-[220px] px-4 py-3 text-left text-xs font-medium text-black">邮件</th>
            <th class="w-[120px] px-4 py-3 text-left text-xs font-medium text-black">状态</th>
            <th class="w-[230px] px-4 py-3 text-left text-xs font-medium text-black">行为</th>
            <th class="w-[120px] px-4 py-3 text-left text-xs font-medium text-black">异常</th>
            <th class="w-[150px] px-4 py-3 text-left text-xs font-medium text-black">最近时间</th>
          </tr>
        </template>
        <template #tbody>
          <tr v-if="!rows.length && !loading">
            <td colspan="6" :class="TABLE_EMPTY_CELL_CLASS">暂无行为记录</td>
          </tr>
          <tr v-for="item in rows" :key="item.id" class="hover:bg-gray-50">
            <td class="px-4 py-3 text-sm font-medium text-black">
              <div class="truncate">{{ item.recipient_email || '-' }}</div>
            </td>
            <td class="px-4 py-3 text-sm text-black">
              <div class="line-clamp-2">{{ item.subject || item.template_name || '-' }}</div>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-sm text-black">
              <span :class="statusTagClass(item.status)">{{ statusLabel(item.status) }}</span>
            </td>
            <td class="px-4 py-3 text-sm text-black">
              <div class="flex flex-wrap gap-2">
                <span :class="behaviorBadgeClass(item.open_count)">打开 {{ item.open_count || 0 }}</span>
                <span :class="behaviorBadgeClass(item.click_count)">点击 {{ item.click_count || 0 }}</span>
                <span :class="behaviorBadgeClass(item.reply_count)">回复 {{ item.reply_count || 0 }}</span>
              </div>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-sm text-black">{{ behaviorRemark(item) }}</td>
            <td class="whitespace-nowrap px-4 py-3 text-sm text-black">{{ formatDateTime(item.updated_at) }}</td>
          </tr>
        </template>
      </AdminDataTable>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import emailReachApi from '@/api/emailReach'
import { showMessage } from '@/utils/message'
import AccessPendingAlert from './components/AccessPendingAlert.vue'
import { TABLE_EMPTY_CELL_CLASS, buildBadgeClass, formatDateTime, getRecordStatusMeta, hasAccessStatus } from './ui'

const loading = ref(false)
const rows = ref([])
const accessLoaded = ref(false)
const access = ref({
  status: 'pending',
  reason: ''
})
const filters = reactive({
  keyword: '',
  status: '',
  behavior: ''
})
const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '已发送', value: 'sent' },
  { label: '失败', value: 'failed' },
  { label: '已拦截', value: 'blocked' }
]
const behaviorOptions = [
  { label: '全部行为', value: '' },
  { label: '有打开', value: 'opened' },
  { label: '有点击', value: 'clicked' },
  { label: '有回复', value: 'replied' },
  { label: '有异常', value: 'abnormal' }
]

const canOperate = computed(() => hasAccessStatus(access.value.status))
const applyFilters = () => {
  loadRows()
}

const statusLabel = (status) => {
  return getRecordStatusMeta(status).label
}

const statusTagClass = (status) => {
  return buildBadgeClass(getRecordStatusMeta(status).tone)
}

const loadRows = async () => {
  loading.value = true
  try {
    const res = await emailReachApi.getRecipientBehaviors({
      page: 1,
      limit: 200,
      keyword: filters.keyword,
      status: filters.status,
      behavior: filters.behavior
    })
    if (res.code === 0) rows.value = res.data.items || []
  } catch (error) {
    showMessage(error?.response?.data?.message || '行为明细获取失败', 'error')
  } finally {
    loading.value = false
  }
}

const hasAbnormal = (item) => Boolean(item.complaint_at || item.unsubscribe_at || item.bounce_type)

const behaviorRemark = (item) => {
  if (item.complaint_at) return '已投诉'
  if (item.unsubscribe_at) return '已退订'
  if (item.bounce_type === 'hard') return '硬退信'
  if (item.bounce_type === 'soft') return '软退信'
  return '-'
}

const behaviorBadgeClass = (value) => {
  return Number(value || 0) > 0
    ? 'inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700'
    : 'inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500'
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
