<template>
  <div class="space-y-4">
    <div class="bg-white rounded-lg shadow">
      <div class="border-b border-gray-200 px-6 pt-5">
        <h2 class="text-xl font-semibold text-gray-900">通知中心</h2>
        <div class="mt-4 flex gap-6">
          <button
            class="border-b-2 px-1 pb-3 text-sm font-medium transition-colors"
            :class="activeTab === 'personal' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
            @click="switchTab('personal')"
          >
            个人通知
          </button>
          <button
            class="border-b-2 px-1 pb-3 text-sm font-medium transition-colors"
            :class="activeTab === 'announcements' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
            @click="switchTab('announcements')"
          >
            系统公告
          </button>
        </div>
      </div>

      <div v-if="activeTab === 'personal'" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">标题</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">内容</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="item in notifications" :key="item.id" class="hover:bg-gray-50">
              <td class="px-6 py-4">
                <div class="flex items-center">
                  <div class="text-sm font-medium text-gray-900">{{ item.title }}</div>
                  <span v-if="!item.is_read" class="ml-2 px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">未读</span>
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-900 max-w-xl">
                <div class="line-clamp-2">{{ item.content }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{{ formatDate(item.created_at) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <button class="text-primary-600 hover:text-primary-700 font-medium" @click="openNotification(item)">
                  查看
                </button>
              </td>
            </tr>
            <tr v-if="loading">
              <td colspan="4" class="px-6 py-12 text-center text-gray-500">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <p class="mt-2">加载中...</p>
              </td>
            </tr>
            <tr v-else-if="notifications.length === 0">
              <td colspan="4" class="px-6 py-12 text-center text-gray-500">暂无个人通知</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">标题</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">内容</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">发布时间</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="item in announcements" :key="item.id" class="hover:bg-gray-50">
              <td class="px-6 py-4">
                <div class="flex items-center">
                  <div class="text-sm font-medium text-gray-900">{{ item.title }}</div>
                  <span v-if="!item.is_read" class="ml-2 px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">未读</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="px-2 py-1 text-xs font-medium rounded-full"
                  :class="{
                    'bg-primary-100 text-primary-700': item.type === 'info',
                    'bg-yellow-100 text-yellow-700': item.type === 'warning',
                    'bg-green-100 text-green-700': item.type === 'success',
                    'bg-red-100 text-red-700': item.type === 'error'
                  }"
                >
                  {{ getTypeName(item.type) }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-900 max-w-md">
                <div class="line-clamp-2">{{ item.content }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{{ formatDate(item.created_at) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <button class="text-primary-600 hover:text-primary-700 font-medium" @click="openAnnouncement(item)">
                  查看
                </button>
              </td>
            </tr>
            <tr v-if="loading">
              <td colspan="5" class="px-6 py-12 text-center text-gray-500">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <p class="mt-2">加载中...</p>
              </td>
            </tr>
            <tr v-else-if="announcements.length === 0">
              <td colspan="5" class="px-6 py-12 text-center text-gray-500">暂无系统公告</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="px-6 py-4 flex items-center justify-between border-t border-gray-200">
        <div class="text-sm text-gray-700">共 {{ total }} 条记录</div>
        <div class="flex gap-2">
          <button
            @click="changePage(page - 1)"
            :disabled="page === 1"
            class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <span class="px-3 py-1 text-sm text-gray-700">第 {{ page }} / {{ totalPages || 1 }} 页</span>
          <button
            @click="changePage(page + 1)"
            :disabled="page >= totalPages"
            class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      </div>
    </div>

    <div v-if="detailVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold">{{ detailItem?.title }}</h3>
            <button @click="detailVisible = false" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="space-y-4">
            <div>
              <div class="text-sm text-gray-600 mb-1">时间</div>
              <div class="text-sm">{{ formatDate(detailItem?.created_at) }}</div>
            </div>
            <div>
              <div class="text-sm text-gray-600 mb-1">内容</div>
              <div class="text-sm text-gray-700 whitespace-pre-wrap">{{ detailItem?.content }}</div>
            </div>
            <button
              v-if="detailItem?.link_url"
              class="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              @click="goLink(detailItem.link_url)"
            >
              前往处理
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'
import { getCurrentLocale } from '@/i18n'
import { getNotifications, markAsRead as markNotificationAsRead } from '@/api/notification'
import { showMessage } from '@/utils/message'

const route = useRoute()
const router = useRouter()

const activeTab = ref(route.query.tab === 'announcements' ? 'announcements' : 'personal')
const loading = ref(false)
const notifications = ref([])
const announcements = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const detailVisible = ref(false)
const detailItem = ref(null)

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

const switchTab = async (tab) => {
  activeTab.value = tab
  page.value = 1
  detailVisible.value = false
  await router.replace({ path: '/user/notifications', query: { tab } })
  await loadData()
}

const loadData = async () => {
  if (activeTab.value === 'announcements') {
    await loadAnnouncements()
  } else {
    await loadNotifications()
  }
}

const loadNotifications = async () => {
  loading.value = true
  try {
    const result = await getNotifications({ page: page.value, page_size: pageSize.value })
    if (result.code === 0) {
      notifications.value = result.data.items || []
      total.value = result.data.total || 0
    } else {
      showMessage(result.message || '加载通知失败', 'error')
    }
  } catch (error) {
    console.error('加载通知失败:', error)
    showMessage('加载通知失败', 'error')
  } finally {
    loading.value = false
  }
}

const loadAnnouncements = async () => {
  loading.value = true
  try {
    const result = await api.get('/announcements/', {
      params: { page: page.value, page_size: pageSize.value }
    })
    if (result.code === 0) {
      announcements.value = result.data.items || []
      total.value = result.data.total || 0

      const announcementId = route.query.id
      if (announcementId) {
        const announcement = announcements.value.find((item) => item.id === parseInt(announcementId))
        if (announcement) {
          await openAnnouncement(announcement)
        }
      }
    } else {
      showMessage(result.message || '加载公告失败', 'error')
    }
  } catch (error) {
    console.error('加载公告失败:', error)
    showMessage('加载公告失败', 'error')
  } finally {
    loading.value = false
  }
}

const openNotification = async (notification) => {
  detailItem.value = notification
  detailVisible.value = true

  if (!notification.is_read) {
    try {
      const result = await markNotificationAsRead(notification.id)
      if (result.code === 0) {
        notification.is_read = true
      }
    } catch (error) {
      console.error('标记通知已读失败:', error)
    }
  }
}

const openAnnouncement = async (announcement) => {
  detailItem.value = announcement
  detailVisible.value = true

  if (!announcement.is_read) {
    try {
      const result = await api.post(`/announcements/${announcement.id}/read`)
      if (result.code === 0) {
        announcement.is_read = true
      }
    } catch (error) {
      console.error('标记公告已读失败:', error)
    }
  }
}

const goLink = async (url) => {
  detailVisible.value = false
  await router.push(url)
}

const changePage = async (newPage) => {
  if (newPage >= 1 && newPage <= totalPages.value) {
    page.value = newPage
    await loadData()
  }
}

const formatDate = (timestamp) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString(getCurrentLocale(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getTypeName = (type) => {
  const typeMap = {
    info: '通知',
    warning: '提醒',
    success: '成功',
    error: '异常'
  }
  return typeMap[type] || type
}

watch(
  () => route.query.tab,
  async (tab) => {
    const nextTab = tab === 'announcements' ? 'announcements' : 'personal'
    if (nextTab !== activeTab.value) {
      activeTab.value = nextTab
      page.value = 1
      await loadData()
    }
  }
)

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
