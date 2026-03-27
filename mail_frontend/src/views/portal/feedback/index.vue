<template>
  <div class="h-full">
    <div class="h-full flex flex-col">
      <div class="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <div class="flex justify-between items-center">
          <div class="flex items-center space-x-4">
            <BaseInput
              v-model="filters.keyword"
              placeholder="搜索标题或内容..."
              class="w-64"
              size="sm"
              @enter="applyFilters"
            >
              <template #left-icon>
                <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </template>
            </BaseInput>

            <CustomSelect
              v-model="filters.type"
              :options="typeFilterOptions"
              placeholder="全部类型"
              class="w-40"
            />

            <CustomSelect
              v-model="filters.status"
              :options="statusFilterOptions"
              placeholder="全部状态"
              class="w-40"
            />

            <button
              @click="applyFilters"
              class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm"
            >
              查询
            </button>
          </div>

          <button
            @click="openCreateModal"
            class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm"
          >
            提交反馈
          </button>
        </div>
      </div>

      <AdminDataTable
        title="反馈列表"
        :pagination="pagination"
        :loading="loading"
        :show-page-size-selector="true"
        :column-count="6"
        @page-change="changePage"
        @page-size-change="changePageSize"
      >
        <template #thead>
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">标题</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">类型</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">状态</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">提交时间</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">处理进度</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">操作</th>
          </tr>
        </template>

        <template #tbody>
          <tr v-for="feedback in pagedFeedbacks" :key="feedback.id" class="hover:bg-gray-50">
            <td class="px-6 py-4">
              <div class="max-w-xl">
                <div class="text-sm font-medium text-black break-words">{{ feedback.title }}</div>
                <div class="mt-1 text-sm text-gray-500 line-clamp-2 break-words">
                  {{ feedback.content }}
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="getTypeClass(feedback.type)" class="px-2 py-1 text-xs font-medium rounded-full">
                {{ getTypeText(feedback.type) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="getStatusClass(feedback.status)" class="px-2 py-1 text-xs font-medium rounded-full">
                {{ getStatusText(feedback.status) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
              {{ formatDate(feedback.created_at) }}
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">
              <div class="w-full max-w-sm">
                <div v-if="feedback.admin_reply" class="space-y-2">
                  <div class="text-sm font-medium text-black">管理员回复</div>
                  <div class="whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">
                    {{ feedback.admin_reply }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ getAdminReplyMeta(feedback) }}
                  </div>
                </div>
                <div v-else class="text-sm text-gray-600">
                  {{ getProgressText(feedback.status) }}
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <ActionButton
                icon="eye"
                tooltip="查看详情"
                variant="view"
                @click="openDetailModal(feedback)"
              />
            </td>
          </tr>

          <tr v-if="pagedFeedbacks.length === 0">
            <td colspan="6" class="px-6 py-12 text-center text-black">
              暂无反馈记录
            </td>
          </tr>
        </template>
      </AdminDataTable>
    </div>

    <BaseModal
      v-model="showCreateModal"
      title="提交新反馈"
      :show-footer="false"
      size="md"
      @close="closeCreateModal"
    >
      <form novalidate @submit.prevent="submitFeedback" class="space-y-5">
        <div>
          <label class="mb-2 block text-sm font-medium text-black">
            反馈类型 <span class="text-red-500">*</span>
          </label>
          <CustomSelect
            v-model="feedbackForm.type"
            :options="createTypeOptions"
            placeholder="请选择反馈类型"
          />
          <p v-if="errors.type" class="mt-1 text-sm text-red-600">{{ errors.type }}</p>
        </div>

        <BaseInput
          v-model="feedbackForm.title"
          label="标题"
          placeholder="一句话说清楚你遇到的问题"
          :error-message="errors.title"
        />

        <div>
          <label class="mb-2 block text-sm font-medium text-black">
            详细描述 <span class="text-red-500">*</span>
          </label>
          <BaseTextarea
            v-model="feedbackForm.content"
            rows="6"
            :error-message="errors.content"
            placeholder="把现象、步骤和你期望的结果写清楚，方便我们尽快处理"
          />
        </div>

        <BaseInput
          v-model="feedbackForm.contact_info"
          label="联系方式"
          placeholder="选填，方便我们联系你"
        />

        <div class="flex justify-end gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            @click="closeCreateModal"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="submit"
            :disabled="submitting"
            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {{ submitting ? '提交中...' : '提交反馈' }}
          </button>
        </div>
      </form>
    </BaseModal>

    <BaseModal
      v-model="showDetailModal"
      title="反馈详情"
      :show-footer="false"
      size="lg"
      @close="selectedFeedback = null"
    >
      <div v-if="selectedFeedback" class="space-y-5">
        <div class="flex flex-wrap items-center gap-2">
          <span :class="getTypeClass(selectedFeedback.type)" class="px-2 py-1 text-xs font-medium rounded-full">
            {{ getTypeText(selectedFeedback.type) }}
          </span>
          <span :class="getStatusClass(selectedFeedback.status)" class="px-2 py-1 text-xs font-medium rounded-full">
            {{ getStatusText(selectedFeedback.status) }}
          </span>
          <span class="text-sm text-gray-500">{{ formatDate(selectedFeedback.created_at) }}</span>
        </div>

        <div>
          <h3 class="text-lg font-semibold text-black">{{ selectedFeedback.title }}</h3>
          <p class="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">
            {{ selectedFeedback.content }}
          </p>
        </div>

        <div v-if="selectedFeedback.contact_info" class="text-sm text-gray-600">
          联系方式：{{ selectedFeedback.contact_info }}
        </div>

        <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div class="text-sm font-medium text-black">处理进度</div>
          <div v-if="selectedFeedback.admin_reply" class="mt-3 space-y-2">
            <div class="text-sm font-medium text-black">管理员回复</div>
            <div class="whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">
              {{ selectedFeedback.admin_reply }}
            </div>
            <div class="text-xs text-gray-500">
              {{ getAdminReplyMeta(selectedFeedback) }}
            </div>
          </div>
          <p v-else class="mt-2 text-sm text-gray-600">
            {{ getProgressText(selectedFeedback.status) }}
          </p>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import ActionButton from '@/components/ActionButton/index.vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import BaseModal from '@/components/BaseModal/index.vue'
import BaseTextarea from '@/components/BaseTextarea/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import { feedbackAPI } from '@/api/feedback'
import { showMessage } from '@/utils/message'

type FeedbackItem = {
  id: number
  type: string
  status: string
  title: string
  content: string
  contact_info?: string
  admin_reply?: string
  admin_name?: string
  created_at?: string
  updated_at?: string
}

const loading = ref(false)
const showCreateModal = ref(false)
const showDetailModal = ref(false)
const submitting = ref(false)
const selectedFeedback = ref<FeedbackItem | null>(null)
const allFeedbacks = ref<FeedbackItem[]>([])
const page = ref(1)
const pageSize = ref(20)

const filters = reactive({
  keyword: '',
  type: '',
  status: ''
})

const appliedFilters = reactive({
  keyword: '',
  type: '',
  status: ''
})

const feedbackForm = reactive({
  type: '',
  title: '',
  content: '',
  contact_info: ''
})

const errors = reactive({
  type: '',
  title: '',
  content: ''
})

const typeFilterOptions = [
  { label: '全部类型', value: '' },
  { label: '功能建议', value: 'suggestion' },
  { label: '错误报告', value: 'bug' },
  { label: '使用问题', value: 'question' },
  { label: '其他', value: 'other' }
]

const createTypeOptions = typeFilterOptions.filter(item => item.value)

const statusFilterOptions = [
  { label: '全部状态', value: '' },
  { label: '待处理', value: 'pending' },
  { label: '处理中', value: 'processing' },
  { label: '已解决', value: 'resolved' },
  { label: '已关闭', value: 'closed' }
]

const filteredFeedbacks = computed(() => {
  const keyword = appliedFilters.keyword.trim().toLowerCase()

  return allFeedbacks.value.filter((item) => {
    const matchesKeyword = !keyword
      || item.title?.toLowerCase().includes(keyword)
      || item.content?.toLowerCase().includes(keyword)
      || item.admin_reply?.toLowerCase().includes(keyword)

    const matchesType = !appliedFilters.type || item.type === appliedFilters.type
    const matchesStatus = !appliedFilters.status || item.status === appliedFilters.status

    return matchesKeyword && matchesType && matchesStatus
  })
})

const pagedFeedbacks = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredFeedbacks.value.slice(start, start + pageSize.value)
})

const pagination = computed(() => ({
  page: page.value,
  total: filteredFeedbacks.value.length,
  total_pages: Math.max(1, Math.ceil(filteredFeedbacks.value.length / pageSize.value)),
  page_size: pageSize.value
}))

const syncPage = () => {
  const maxPage = Math.max(1, Math.ceil(filteredFeedbacks.value.length / pageSize.value))
  if (page.value > maxPage) {
    page.value = maxPage
  }
}

const applyFilters = () => {
  appliedFilters.keyword = filters.keyword
  appliedFilters.type = filters.type
  appliedFilters.status = filters.status
  page.value = 1
  syncPage()
}

const changePage = (nextPage: number) => {
  page.value = nextPage
  syncPage()
}

const changePageSize = (nextPageSize: number) => {
  pageSize.value = nextPageSize
  page.value = 1
  syncPage()
}

const resetForm = () => {
  feedbackForm.type = ''
  feedbackForm.title = ''
  feedbackForm.content = ''
  feedbackForm.contact_info = ''
  errors.type = ''
  errors.title = ''
  errors.content = ''
}

const openCreateModal = () => {
  resetForm()
  showCreateModal.value = true
}

const closeCreateModal = () => {
  showCreateModal.value = false
  resetForm()
}

const openDetailModal = (feedback: FeedbackItem) => {
  selectedFeedback.value = feedback
  showDetailModal.value = true
}

const validateForm = () => {
  errors.type = ''
  errors.title = ''
  errors.content = ''

  let valid = true

  if (!feedbackForm.type) {
    errors.type = '请选择反馈类型'
    valid = false
  }

  if (!feedbackForm.title.trim()) {
    errors.title = '请填写标题'
    valid = false
  } else if (feedbackForm.title.trim().length < 5) {
    errors.title = '标题至少需要 5 个字'
    valid = false
  }

  if (!feedbackForm.content.trim()) {
    errors.content = '请填写详细描述'
    valid = false
  } else if (feedbackForm.content.trim().length < 10) {
    errors.content = '内容至少需要 10 个字'
    valid = false
  }

  return valid
}

const loadFeedbacks = async () => {
  loading.value = true
  try {
    const items: FeedbackItem[] = []
    let currentPage = 1
    let totalPages = 1

    do {
      const response = await feedbackAPI.getMyFeedbacks(currentPage, 100)
      if (response.code !== 0) {
        showMessage(response.message || '加载反馈列表失败', 'error')
        break
      }

      items.push(...(response.data.feedbacks || []))
      totalPages = response.data.total_pages || 1
      currentPage += 1
    } while (currentPage <= totalPages)

    allFeedbacks.value = items
    syncPage()
  } catch (error) {
    console.error('加载反馈列表失败:', error)
    showMessage('加载反馈列表失败', 'error')
  } finally {
    loading.value = false
  }
}

const submitFeedback = async () => {
  if (!validateForm()) return

  submitting.value = true
  try {
    const response = await feedbackAPI.create({
      type: feedbackForm.type,
      title: feedbackForm.title.trim(),
      content: feedbackForm.content.trim(),
      contact_info: feedbackForm.contact_info.trim()
    })

    if (response.code === 0) {
      showMessage('反馈提交成功', 'success')
      closeCreateModal()
      await loadFeedbacks()
      return
    }

    showMessage(response.message || '提交失败，请稍后再试', 'error')
  } catch (error) {
    console.error('提交反馈失败:', error)
    showMessage('提交失败，请稍后再试', 'error')
  } finally {
    submitting.value = false
  }
}

const getTypeClass = (type: string) => {
  const classes = {
    suggestion: 'bg-primary-100 text-success-800',
    bug: 'bg-red-100 text-red-800',
    question: 'bg-primary-100 text-primary-800',
    other: 'bg-gray-100 text-black'
  }
  return classes[type as keyof typeof classes] || classes.other
}

const getTypeText = (type: string) => {
  const texts = {
    suggestion: '功能建议',
    bug: '错误报告',
    question: '使用问题',
    other: '其他'
  }
  return texts[type as keyof typeof texts] || '其他'
}

const getStatusClass = (status: string) => {
  const classes = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-orange-100 text-orange-800',
    resolved: 'bg-primary-100 text-success-800',
    closed: 'bg-gray-100 text-black'
  }
  return classes[status as keyof typeof classes] || classes.pending
}

const getStatusText = (status: string) => {
  const texts = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    closed: '已关闭'
  }
  return texts[status as keyof typeof texts] || '待处理'
}

const getProgressText = (status: string) => {
  const texts = {
    pending: '我们已经收到你的反馈，正在排队处理。',
    processing: '这条反馈正在处理中，有结果会回在这里。',
    resolved: '这条反馈已经处理完成。',
    closed: '这条反馈已关闭。'
  }
  return texts[status as keyof typeof texts] || texts.pending
}

const getProgressPreview = (feedback: FeedbackItem) => {
  if (feedback.admin_reply?.trim()) {
    return feedback.admin_reply.trim()
  }
  return getProgressText(feedback.status)
}

const getAdminReplyMeta = (feedback: FeedbackItem) => {
  const parts: string[] = []
  if (feedback.admin_name) {
    parts.push(`回复人：${feedback.admin_name}`)
  }
  if (feedback.updated_at) {
    parts.push(`回复时间：${formatDate(feedback.updated_at)}`)
  }
  return parts.join('，')
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

onMounted(async () => {
  await loadFeedbacks()
})
</script>
