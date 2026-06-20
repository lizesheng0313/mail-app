<template>
  <div class="space-y-6">
    <AccessPendingAlert v-if="accessLoaded && !canOperate" :reason="access.reason" />

    <div v-if="canOperate" class="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
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
            class="h-10 rounded-xl bg-primary-600 px-5 text-sm font-medium text-white hover:bg-primary-700"
            @click="applyFilters"
          >
            查询
          </button>
        </div>
        <button
          type="button"
          class="h-10 self-start rounded-xl bg-primary-600 px-6 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 xl:self-auto"
          :disabled="!canOperate"
          @click="handleCreateTask"
        >
          发送任务
        </button>
      </div>
    </div>

    <AdminDataTable title="发送任务" :loading="loading" :column-count="8" table-class="min-w-[1230px] table-fixed">
      <template #thead>
        <tr>
          <th class="w-[160px] whitespace-nowrap px-5 py-3 text-left text-xs font-medium tracking-wider text-black">任务名</th>
          <th class="w-[110px] whitespace-nowrap px-5 py-3 text-left text-xs font-medium tracking-wider text-black">方式</th>
          <th class="w-[140px] whitespace-nowrap px-5 py-3 text-left text-xs font-medium tracking-wider text-black">收件范围</th>
          <th class="w-[150px] whitespace-nowrap px-5 py-3 text-left text-xs font-medium tracking-wider text-black">计划时间</th>
          <th class="w-[120px] whitespace-nowrap px-5 py-3 text-left text-xs font-medium tracking-wider text-black">状态</th>
          <th class="w-[300px] whitespace-nowrap px-5 py-3 text-left text-xs font-medium tracking-wider text-black">发送结果</th>
          <th class="w-[180px] whitespace-nowrap px-5 py-3 text-left text-xs font-medium tracking-wider text-black">更新时间</th>
          <th class="sticky right-0 z-20 w-[70px] whitespace-nowrap bg-gray-50 px-5 py-3 text-left text-xs font-medium tracking-wider text-black shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)]">操作</th>
        </tr>
      </template>
      <template #tbody>
        <tr v-if="!filteredTasks.length && !loading">
          <td colspan="8" :class="TABLE_EMPTY_CELL_CLASS">暂无发送任务</td>
        </tr>
        <tr v-for="item in filteredTasks" :key="item.id" class="group hover:bg-gray-50">
          <td class="px-5 py-4 text-sm font-medium text-black">
            <div class="line-clamp-2">{{ item.task_name }}</div>
          </td>
          <td class="whitespace-nowrap px-5 py-4 text-sm text-black">{{ taskModeLabel(item) }}</td>
          <td class="px-5 py-4 text-sm text-black">
            <div class="line-clamp-2">{{ recipientScopeLabel(item) }}</div>
          </td>
          <td class="whitespace-nowrap px-5 py-4 text-sm text-black">{{ formatDateTime(item.scheduled_at) }}</td>
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
          <td class="whitespace-nowrap px-5 py-4 text-sm text-black">{{ formatDateTime(item.updated_at) }}</td>
          <td class="sticky right-0 z-10 whitespace-nowrap bg-white px-5 py-4 text-sm text-black shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)] group-hover:bg-gray-50">
            <ActionButton icon="eye" variant="view" tooltip="明细" @click="openTaskDetail(item)" />
          </td>
        </tr>
      </template>
    </AdminDataTable>

    <TaskEditorModal
      v-model:visible="showEditorModal"
      :can-operate="canOperate"
      @saved="handleSaved"
    />

    <TaskDetailModal
      v-model:visible="showDetailModal"
      :task="selectedTask"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { io } from 'socket.io-client'
import ActionButton from '@/components/ActionButton/index.vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import emailReachApi from '@/api/emailReach'
import { getApiBaseURL } from '@/services/api'
import AccessPendingAlert from './components/AccessPendingAlert.vue'
import TaskEditorModal from './components/TaskEditorModal.vue'
import TaskDetailModal from './components/TaskDetailModal.vue'
import {
  TABLE_EMPTY_CELL_CLASS,
  buildBadgeClass,
  formatDateTime,
  hasAccessStatus,
  getTaskStatusMeta
} from './ui'

const loading = ref(false)
const accessLoaded = ref(false)
const tasks = ref([])
const showEditorModal = ref(false)
const showDetailModal = ref(false)
const selectedTask = ref(null)
let socket = null
let socketConnecting = false
const access = ref({
  status: 'pending',
  reason: '',
  reply_target: null
})
const filters = reactive({
  keyword: ''
})
const appliedFilters = reactive({
  keyword: ''
})
const SOCKET_IO_PATH = '/mail-api/v1/live-chat/socket.io'

const canOperate = computed(() => hasAccessStatus(access.value.status))
const filteredTasks = computed(() => {
  const keyword = appliedFilters.keyword.trim().toLowerCase()
  return tasks.value.filter((item) => !keyword || String(item.task_name || '').toLowerCase().includes(keyword))
})

const applyFilters = async () => {
  appliedFilters.keyword = filters.keyword
  await loadTasks()
}

const statusLabel = (status) => {
  return getTaskStatusMeta(status).label
}

const statusTagClass = (status) => {
  return buildBadgeClass(getTaskStatusMeta(status).tone)
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

const openTaskDetail = (item) => {
  if (!item?.id) return
  selectedTask.value = item
  showDetailModal.value = true
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
