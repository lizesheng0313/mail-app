<template>
  <div class="h-full">
    <div class=" h-full flex flex-col">
      
      <!-- 操作区域 -->
      <div class="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <div class="flex justify-between items-center">
          <div class="flex items-center space-x-4">
            <CustomSelect
              v-model="filters.status"
              :options="statusOptions"
              placeholder="全部状态"
              @update:model-value="handleFilterChange"
            />
            <CustomSelect
              v-model="filters.type"
              :options="typeOptions"
              placeholder="全部类型"
              @update:model-value="handleFilterChange"
            />
            <button
              @click="fetchFeedbacks"
              class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm"
            >
              查询
            </button>
          </div>
        </div>
      </div>

      <!-- 反馈列表 -->
      <AdminDataTable
        title="反馈列表"
        :pagination="pagination"
        :loading="loading"
        :show-page-size-selector="true"
        :column-count="1"
        @page-change="loadFeedbacks"
        @page-size-change="changePageSize"
      >
        <template #tbody>
          <template v-if="feedbacks.length === 0">
            <tr>
              <td class="p-6 text-center text-black">
                暂无反馈数据
              </td>
            </tr>
          </template>
          <template v-else>
            <tr v-for="feedback in feedbacks" :key="feedback.id" class="hover:bg-gray-50">
            <td class="p-6">
              <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center space-x-3 mb-2">
                  <span :class="getTypeClass(feedback.type)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                    {{ getTypeText(feedback.type) }}
                  </span>
                  <span :class="getStatusClass(feedback.status)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                    {{ getStatusText(feedback.status) }}
                  </span>
                  <span class="text-sm text-black">
                    {{ feedback.user_name || '匿名用户' }}
                  </span>
                  <span class="text-sm text-gray-400">
                    {{ formatDate(feedback.created_at) }}
                  </span>
                </div>
                
                <h4 class="text-lg font-medium text-black mb-2">{{ feedback.title }}</h4>
                <p class="text-black mb-3">{{ feedback.content }}</p>
                
                <div v-if="feedback.contact_info" class="text-sm text-black mb-3">
                  联系方式: {{ feedback.contact_info }}
                </div>

                <div v-if="feedback.admin_reply" class="bg-primary-50 border-l-4 border-blue-400 p-4 mb-3">
                  <div class="flex">
                    <div class="ml-3">
                      <p class="text-sm text-primary-700">
                        <strong>管理员回复 ({{ feedback.admin_name }}):</strong>
                      </p>
                      <p class="text-sm text-primary-600 mt-1">{{ feedback.admin_reply }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="ml-6 flex-shrink-0">
                <button
                  @click="openReplyModal(feedback)"
                  class="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-black bg-white hover:bg-gray-50"
                >
                  {{ feedback.admin_reply ? '修改回复' : '回复处理' }}
                </button>
              </div>
              </div>
            </td>
          </tr>
          </template>
        </template>
      </AdminDataTable>
    </div>

    <!-- 回复模态框 -->
    <div v-if="showReplyModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="showReplyModal = false">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4">
        <h3 class="text-lg font-semibold text-black mb-4">处理反馈</h3>
        
        <div v-if="selectedFeedback" class="mb-6">
          <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-medium text-black">{{ selectedFeedback.title }}</h4>
            <p class="text-black mt-2">{{ selectedFeedback.content }}</p>
          </div>
        </div>

        <form @submit.prevent="submitReply">
          <!-- 状态 -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-black mb-2">状态</label>
            <CustomSelect
              v-model="replyForm.status"
              :options="replyStatusOptions"
              placeholder="请选择状态"
              class="w-full"
            />
          </div>

          <!-- 管理员回复 -->
          <div class="mb-6">
            <BaseTextarea
              v-model="replyForm.admin_reply"
              label="管理员回复"
              rows="4"
              placeholder="请输入回复内容..."
              resize="vertical"
            />
          </div>

          <!-- 按钮 -->
          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="showReplyModal = false"
              class="px-4 py-2 text-sm font-medium text-black bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="submittingReply"
              class="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {{ submittingReply ? '提交中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import api from '@/services/api'
import CustomSelect from '@/components/CustomSelect/index.vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import BaseTextarea from '@/components/BaseTextarea/index.vue'
import { showMessage } from '@/utils/message'



// 筛选选项
const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '待处理', value: 'pending' },
  { label: '处理中', value: 'processing' },
  { label: '已解决', value: 'resolved' },
  { label: '已关闭', value: 'closed' }
]

const replyStatusOptions = statusOptions.filter(option => option.value)

const typeOptions = [
  { label: '全部类型', value: '' },
  { label: '功能建议', value: 'suggestion' },
  { label: '错误报告', value: 'bug' },
  { label: '使用问题', value: 'question' },
  { label: '其他', value: 'other' }
]

// 数据状态
const loading = ref(false)
const feedbacks = ref<any[]>([])
const stats = ref<any>({})
const showReplyModal = ref(false)
const submittingReply = ref(false)
const selectedFeedback = ref<any>(null)

// 筛选条件
const filters = reactive({
  status: '',
  type: ''
})

// 分页信息
const pagination = reactive({
  page: 1,
  page_size: 20,
  total: 0,
  total_pages: 0
})

// 回复表单
const replyForm = reactive({
  status: 'pending',
  admin_reply: ''
})

// 加载反馈列表
const loadFeedbacks = async (page = 1) => {
  loading.value = true
  try {
    const params: any = {
      page,
      page_size: pagination.page_size
    }
    
    if (filters.status) params.status_filter = filters.status
    if (filters.type) params.type_filter = filters.type

    const response: any = await api.get('/feedback/list', { params })
    if (response.code === 0) {
      const data = response.data
      feedbacks.value = data.feedbacks || []
      pagination.page = data.page || 1
      pagination.total = data.total || 0
      pagination.total_pages = data.total_pages || 1
    }
  } catch (error: any) {
    console.error('加载反馈列表失败:', error)
    showMessage('加载反馈列表失败', 'error')
  } finally {
    loading.value = false
  }
}

// 筛选条件变化处理
const handleFilterChange = () => {
  loadFeedbacks(1)
}

// 改变每页显示数量
const changePageSize = (newPageSize: number) => {
  pagination.page_size = newPageSize
  pagination.page = 1 // 重置到第一页
  loadFeedbacks(1)
}

// 加载统计信息
const loadStats = async () => {
  try {
    const response: any = await api.get('/feedback/stats')
    if (response.code === 0) {
      stats.value = response.data
    }
  } catch (error: any) {
    console.error('加载统计信息失败:', error)
  }
}

// 打开回复模态框
const openReplyModal = (feedback: any) => {
  selectedFeedback.value = feedback
  replyForm.status = feedback.status
  replyForm.admin_reply = feedback.admin_reply || ''
  showReplyModal.value = true
}

// 提交回复
const submitReply = async () => {
  if (!selectedFeedback.value) return

  submittingReply.value = true
  try {
    const response: any = await api.put(`/feedback/${selectedFeedback.value.id}`, replyForm)
    if (response.code === 0) {
      showMessage('处理成功', 'success')
      showReplyModal.value = false
      await loadFeedbacks(pagination.page)
      await loadStats()
    } else {
      showMessage('处理失败: ' + (response.message || '未知错误'), 'error')
    }
  } catch (error: any) {
    console.error('提交回复失败:', error)
    showMessage('提交回复失败', 'error')
  } finally {
    submittingReply.value = false
  }
}

// 获取类型样式
const getTypeClass = (type: string) => {
  const classes = {
    suggestion: 'bg-primary-100 text-success-800',
    bug: 'bg-red-100 text-red-800',
    question: 'bg-primary-100 text-primary-800',
    other: 'bg-gray-100 text-black'
  }
  return classes[type as keyof typeof classes] || classes.other
}

// 获取类型文本
const getTypeText = (type: string) => {
  const texts = {
    suggestion: '功能建议',
    bug: '错误报告',
    question: '使用问题',
    other: '其他'
  }
  return texts[type as keyof typeof texts] || '其他'
}

// 获取状态样式
const getStatusClass = (status: string) => {
  const classes = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-orange-100 text-orange-800',
    resolved: 'bg-primary-100 text-success-800',
    closed: 'bg-gray-100 text-black'
  }
  return classes[status as keyof typeof classes] || classes.pending
}

// 获取状态文本
const getStatusText = (status: string) => {
  const texts = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    closed: '已关闭'
  }
  return texts[status as keyof typeof texts] || '待处理'
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

// 初始化
onMounted(() => {
  loadFeedbacks()
  loadStats()
})
</script>
