<template>
  <div class="space-y-6">
    <div
      v-if="accessLoaded && access.status !== 'approved' && access.status !== 'trial'"
      class="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900"
    >
      <div class="font-medium">当前账号还没开通邮件触达</div>
      <div class="mt-2">{{ access.reason }}</div>
    </div>

    <div v-if="canOperate" class="rounded-lg bg-white px-5 py-4 shadow-sm">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div class="flex flex-wrap items-center gap-3">
          <BaseInput
            v-model="filters.keyword"
            placeholder="任务名"
            size="sm"
            class="h-10 w-56"
          />
          <button
            type="button"
            class="h-10 rounded-md bg-primary-600 px-5 text-sm text-white hover:bg-primary-700"
            @click="applyFilters"
          >
            查询
          </button>
        </div>
        <button
          type="button"
          class="h-10 self-start rounded-md bg-primary-600 px-6 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 xl:self-auto"
          :disabled="!canOperate"
          @click="handleCreateTask"
        >
          发送任务
        </button>
      </div>
    </div>

    <AdminDataTable title="发送任务" :loading="loading" :column-count="8">
      <template #thead>
        <tr>
          <th class="px-5 py-3 text-left text-xs font-medium tracking-wider text-black">任务名</th>
          <th class="px-5 py-3 text-left text-xs font-medium tracking-wider text-black">方式</th>
          <th class="px-5 py-3 text-left text-xs font-medium tracking-wider text-black">收件范围</th>
          <th class="px-5 py-3 text-left text-xs font-medium tracking-wider text-black">计划时间</th>
          <th class="px-5 py-3 text-left text-xs font-medium tracking-wider text-black">状态</th>
          <th class="px-5 py-3 text-left text-xs font-medium tracking-wider text-black">发送结果</th>
          <th class="px-5 py-3 text-left text-xs font-medium tracking-wider text-black">更新时间</th>
          <th class="px-5 py-3 text-left text-xs font-medium tracking-wider text-black">操作</th>
        </tr>
      </template>
      <template #tbody>
        <tr v-if="!filteredTasks.length && !loading">
          <td colspan="8" class="px-6 py-12 text-center text-black">暂无发送任务</td>
        </tr>
        <tr v-for="item in filteredTasks" :key="item.id" class="hover:bg-gray-50">
          <td class="max-w-[180px] px-5 py-4 text-sm font-medium text-black">
            <div class="line-clamp-2">{{ item.task_name }}</div>
          </td>
          <td class="whitespace-nowrap px-5 py-4 text-sm text-black">{{ taskModeLabel(item) }}</td>
          <td class="max-w-[180px] px-5 py-4 text-sm text-black">{{ recipientScopeLabel(item) }}</td>
          <td class="whitespace-nowrap px-5 py-4 text-sm text-black">{{ formatTime(item.scheduled_at) }}</td>
          <td class="whitespace-nowrap px-5 py-4 text-sm text-black">
            <span :class="statusTagClass(item.status)">{{ statusLabel(item.status) }}</span>
          </td>
          <td class="px-5 py-4 text-sm text-black">
            <div class="w-56">
              <div class="mb-1 flex items-center justify-between text-xs text-gray-500">
                <span>{{ item.done_count || 0 }}/{{ item.planned_count || 0 }}</span>
                <span>{{ progressPercent(item) }}%</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  class="h-full rounded-full bg-primary-600 transition-all"
                  :style="{ width: `${progressPercent(item)}%` }"
                />
              </div>
              <div class="mt-2 flex items-center gap-4 text-xs text-gray-500">
                <span>成功 {{ item.sent_count || 0 }}</span>
                <span>失败 {{ item.failed_count || 0 }}</span>
              </div>
            </div>
          </td>
          <td class="whitespace-nowrap px-5 py-4 text-sm text-black">{{ formatTime(item.updated_at) }}</td>
          <td class="whitespace-nowrap px-5 py-4 text-sm text-black">
            <ActionButton icon="eye" variant="view" tooltip="明细" @click="openTaskDetail(item)" />
          </td>
        </tr>
      </template>
    </AdminDataTable>

    <BaseModal
      v-model="detailVisible"
      :title="detailTitle"
      size="xl"
      :show-footer="false"
      :show-confirm="false"
    >
      <div class="max-h-[60vh] overflow-y-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-black">收件人</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-black">状态</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-black">失败原因</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-black">主题</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-black">更新时间</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 bg-white">
            <tr v-if="detailLoading">
              <td colspan="5" class="px-4 py-10 text-center text-sm text-gray-500">加载中</td>
            </tr>
            <tr v-else-if="!detailRecords.length">
              <td colspan="5" class="px-4 py-10 text-center text-sm text-gray-500">暂无明细</td>
            </tr>
            <template v-else>
              <tr v-for="record in detailRecords" :key="record.id" class="hover:bg-gray-50">
                <td class="whitespace-nowrap px-4 py-3 text-sm text-black">{{ record.recipient_email || '-' }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-sm text-black">
                  <span :class="recordStatusTagClass(record.status)">{{ recordStatusLabel(record.status) }}</span>
                </td>
                <td class="max-w-[360px] px-4 py-3 text-sm text-red-600">
                  <div class="whitespace-pre-wrap break-words">{{ record.error_message || '-' }}</div>
                </td>
                <td class="max-w-[260px] px-4 py-3 text-sm text-black">
                  <div class="line-clamp-2">{{ record.subject || '-' }}</div>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-sm text-black">{{ formatTime(record.updated_at) }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </BaseModal>

    <TaskEditorModal
      v-model:visible="showEditorModal"
      :can-operate="canOperate"
      @saved="handleSaved"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { io } from 'socket.io-client'
import ActionButton from '@/components/ActionButton/index.vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import BaseModal from '@/components/BaseModal/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import emailReachApi from '@/api/emailReach'
import { getApiBaseURL } from '@/services/api'
import TaskEditorModal from './components/TaskEditorModal.vue'

const loading = ref(false)
const accessLoaded = ref(false)
const tasks = ref([])
const showEditorModal = ref(false)
const detailLoading = ref(false)
const detailVisible = ref(false)
const detailTask = ref(null)
const detailRecords = ref([])
let socket = null
let socketConnecting = false
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
const SOCKET_IO_PATH = '/mail-api/v1/live-chat/socket.io'

const canOperate = computed(() => access.value.status === 'approved' || access.value.status === 'trial')
const detailTitle = computed(() => (detailTask.value?.task_name ? `发送明细 - ${detailTask.value.task_name}` : '发送明细'))
const filteredTasks = computed(() => {
  const keyword = appliedFilters.keyword.trim().toLowerCase()
  return tasks.value.filter((item) => !keyword || String(item.task_name || '').toLowerCase().includes(keyword))
})

const applyFilters = () => {
  appliedFilters.keyword = filters.keyword
}

const statusLabel = (status) => {
  if (status === 'draft') return '草稿'
  if (status === 'ready') return '待发送'
  if (status === 'blocked') return '全部拦截'
  if (status === 'scheduled') return '待发送'
  if (status === 'sending') return '发送中'
  if (status === 'completed') return '已完成'
  if (status === 'partial_failed') return '部分失败'
  if (status === 'failed') return '失败'
  return status || '-'
}

const recordStatusLabel = (status) => {
  if (status === 'queued') return '待发送'
  if (status === 'sending') return '发送中'
  if (status === 'sent') return '已发送'
  if (status === 'failed') return '失败'
  if (status === 'blocked') return '已拦截'
  return status || '-'
}

const statusTagClass = (status) => {
  if (status === 'completed') return 'inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700'
  if (status === 'sending') return 'inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700'
  if (status === 'scheduled') return 'inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700'
  if (status === 'partial_failed') return 'inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700'
  if (status === 'failed' || status === 'blocked') return 'inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700'
  return 'inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700'
}

const recordStatusTagClass = (status) => {
  if (status === 'sent') return 'inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700'
  if (status === 'sending') return 'inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700'
  if (status === 'queued') return 'inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700'
  if (status === 'failed' || status === 'blocked') return 'inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700'
  return 'inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700'
}

const taskModeLabel = (item) => {
  const triggerType = String(item?.trigger?.type || '')
  if (triggerType === 'yearly_same_day') return '周期触发'
  if (triggerType === 'field_date') return '日期触发'
  if (triggerType === 'days_after_field') return '延后触发'
  if (item?.recipient_source === 'manual') return item?.scheduled_at ? '定时单发' : '单发'
  if (item?.recipient_source === 'member_filter') return item?.scheduled_at ? '定时群发' : '会员群发'
  if (item?.scheduled_at) return '定时发送'
  return '立即发送'
}

const recipientScopeLabel = (item) => {
  if (item?.recipient_source === 'manual') return '单个收件人'
  if (item?.recipient_source === 'member_trigger') return '会员周期任务'
  if (item?.recipient_source === 'member_filter') {
    const filter = item?.filter || {}
    const parts = []
    if (filter.group_name) parts.push(filter.group_name)
    const conditionCount = Array.isArray(filter.field_conditions) ? filter.field_conditions.length : 0
    if (conditionCount) parts.push(`${conditionCount} 个筛选条件`)
    return parts.length ? parts.join(' / ') : '全部会员'
  }
  return '任务收件人'
}

const progressPercent = (item) => {
  const planned = Number(item?.planned_count || 0)
  if (!planned) return 0
  const done = Number(item?.done_count ?? (Number(item?.sent_count || 0) + Number(item?.failed_count || 0)))
  return Math.min(100, Math.round((done * 100) / planned))
}

const getSocketServerURL = () => {
  const apiBaseURL = getApiBaseURL()
  if (apiBaseURL.startsWith('http://') || apiBaseURL.startsWith('https://')) {
    return apiBaseURL.replace(/\/mail-api\/v1$/, '')
  }
  return window.location.origin
}

const upsertTask = (task) => {
  if (!task?.id) return
  const index = tasks.value.findIndex((item) => Number(item.id) === Number(task.id))
  if (index >= 0) {
    tasks.value.splice(index, 1, task)
  } else {
    tasks.value.unshift(task)
  }
  if (detailTask.value?.id && Number(detailTask.value.id) === Number(task.id)) {
    detailTask.value = task
  }
}

const cleanupSocket = () => {
  if (!socket) return
  const currentSocket = socket
  socket = null
  currentSocket.removeAllListeners()
  currentSocket.disconnect()
  socketConnecting = false
}

const connectTaskSocket = () => {
  if (socketConnecting) return
  if (socket?.connected) return

  const token = localStorage.getItem('token')
  cleanupSocket()
  socketConnecting = true

  const nextSocket = io(getSocketServerURL(), {
    path: SOCKET_IO_PATH,
    transports: ['websocket'],
    auth: token ? { token } : {},
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 5000,
    timeout: 8000
  })
  socket = nextSocket

  nextSocket.on('connect', () => {
    socketConnecting = false
  })

  nextSocket.on('email_reach_event', (payload) => {
    if (payload?.type !== 'task_progress' || !payload.task) return
    upsertTask(payload.task)
  })

  nextSocket.on('connect_error', () => {
    socketConnecting = false
  })

  nextSocket.on('disconnect', () => {
    if (socket === nextSocket) {
      socket = null
    }
    socketConnecting = false
  })
}

const formatTime = (value, dateOnly = false) => {
  if (!value) return '-'
  const date = new Date(Number(value))
  if (Number.isNaN(date.getTime())) return '-'
  if (dateOnly) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const loadTasks = async () => {
  loading.value = true
  try {
    const res = await emailReachApi.getTasks()
    if (res.code === 0) {
      tasks.value = res.data.items || []
    }
  } finally {
    loading.value = false
  }
}

const handleCreateTask = () => {
  showEditorModal.value = true
}

const handleSaved = async () => {
  await loadTasks()
}

const openTaskDetail = async (item) => {
  if (!item?.id) return
  detailTask.value = item
  detailVisible.value = true
  detailLoading.value = true
  detailRecords.value = []
  try {
    const res = await emailReachApi.getTaskSendRecords(item.id)
    if (res.code === 0) {
      detailRecords.value = res.data.items || []
    }
  } finally {
    detailLoading.value = false
  }
}

onMounted(async () => {
  const accessRes = await emailReachApi.getAccessSummary()
  accessLoaded.value = true
  if (accessRes.code === 0) {
    access.value = accessRes.data
  }
  if (canOperate.value) {
    await loadTasks()
    connectTaskSocket()
  }
})

onUnmounted(() => {
  cleanupSocket()
})
</script>
