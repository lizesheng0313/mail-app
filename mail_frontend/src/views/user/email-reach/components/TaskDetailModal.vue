<template>
  <BaseModal
    :model-value="visible"
    title="任务明细"
    size="xl"
    content-class="rounded-[28px] border border-slate-200 shadow-2xl"
    body-class="overflow-y-auto px-6 py-5"
    :show-footer="false"
    @update:modelValue="handleVisibleChange"
    @close="handleClose"
  >
    <div class="space-y-5">
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div class="text-sm text-slate-500">任务名称</div>
            <div class="mt-2 text-lg font-semibold text-slate-900">{{ taskName }}</div>
          </div>
          <span :class="taskStatusTagClass(task?.status)">{{ taskStatusLabel(task?.status) }}</span>
        </div>
      </div>

      <div class="grid gap-3 md:grid-cols-4">
        <div v-for="item in summaryItems" :key="item.label" class="rounded-2xl border border-slate-200 bg-white p-4">
          <div class="text-sm text-slate-500">{{ item.label }}</div>
          <div class="mt-2 text-xl font-semibold text-slate-900">{{ item.value }}</div>
        </div>
      </div>

      <AdminDataTable
        class="h-[420px]"
        title="收件人明细"
        :loading="loading"
        :column-count="7"
        table-class="min-w-[1140px] table-fixed"
      >
        <template #thead>
          <tr>
            <th class="w-[220px] px-4 py-3 text-left text-xs font-medium text-black">收件人</th>
            <th class="w-[110px] px-4 py-3 text-left text-xs font-medium text-black">状态</th>
            <th class="w-[210px] px-4 py-3 text-left text-xs font-medium text-black">发信账号</th>
            <th class="w-[130px] px-4 py-3 text-left text-xs font-medium text-black">打开/点击/回复</th>
            <th class="w-[220px] px-4 py-3 text-left text-xs font-medium text-black">失败原因</th>
            <th class="w-[180px] px-4 py-3 text-left text-xs font-medium text-black">主题</th>
            <th class="w-[120px] px-4 py-3 text-left text-xs font-medium text-black">更新时间</th>
          </tr>
        </template>
        <template #tbody>
          <tr v-if="!records.length && !loading">
            <td colspan="7" :class="TABLE_EMPTY_CELL_CLASS">暂无明细</td>
          </tr>
          <tr v-for="record in records" :key="record.id" class="hover:bg-gray-50">
            <td class="whitespace-nowrap px-4 py-3 text-sm text-black">{{ record.recipient_email || '-' }}</td>
            <td class="whitespace-nowrap px-4 py-3 text-sm text-black">
              <span :class="recordStatusTagClass(record.status)">{{ recordStatusLabel(record.status) }}</span>
            </td>
            <td class="px-4 py-3 text-sm text-slate-700">
              <div class="max-w-[210px] truncate" :title="record.provider || ''">{{ record.provider || '-' }}</div>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-sm text-black">
              {{ record.open_count || 0 }} / {{ record.click_count || 0 }} / {{ record.reply_count || 0 }}
            </td>
            <td class="px-4 py-3 text-sm text-red-600">
              <div class="line-clamp-2 break-words">{{ formatSendErrorMessage(record.error_message) }}</div>
            </td>
            <td class="px-4 py-3 text-sm text-black">
              <div class="line-clamp-2">{{ record.subject || '-' }}</div>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-sm text-black">{{ formatDateTime(record.updated_at) }}</td>
          </tr>
        </template>
      </AdminDataTable>
    </div>
  </BaseModal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import BaseModal from '@/components/BaseModal/index.vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import emailReachApi from '@/api/emailReach'
import { showMessage } from '@/utils/message'
import {
  TABLE_EMPTY_CELL_CLASS,
  buildBadgeClass,
  formatDateTime,
  formatSendErrorMessage,
  getRecordStatusMeta,
  getTaskStatusMeta
} from '../ui'

const props = defineProps({
  visible: { type: Boolean, default: false },
  task: { type: Object, default: null }
})

const emit = defineEmits(['update:visible'])

const loading = ref(false)
const records = ref([])

const taskName = computed(() => props.task?.task_name || '发送任务')
const summaryItems = computed(() => [
  { label: '计划收件人', value: props.task?.planned_count || 0 },
  { label: '成功', value: props.task?.sent_count || 0 },
  { label: '失败', value: props.task?.failed_count || 0 },
  {
    label: '打开/点击/回复',
    value: `${props.task?.opened_count || 0} / ${props.task?.clicked_count || 0} / ${props.task?.replied_count || 0}`
  }
])

const taskStatusLabel = (status) => getTaskStatusMeta(status).label
const taskStatusTagClass = (status) => buildBadgeClass(getTaskStatusMeta(status).tone)
const recordStatusLabel = (status) => getRecordStatusMeta(status).label
const recordStatusTagClass = (status) => buildBadgeClass(getRecordStatusMeta(status).tone)

const handleVisibleChange = (value) => {
  emit('update:visible', value)
}

const handleClose = () => {
  emit('update:visible', false)
}

const loadRecords = async () => {
  if (!props.task?.id) {
    records.value = []
    return
  }
  loading.value = true
  try {
    const res = await emailReachApi.getTaskSendRecords(props.task.id)
    if (res.code === 0) {
      records.value = res.data?.items || []
    }
  } catch (error) {
    showMessage(error?.response?.data?.message || '任务明细获取失败', 'error')
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.visible, props.task?.id],
  ([visible]) => {
    if (visible) {
      loadRecords()
    } else {
      records.value = []
    }
  }
)
</script>
