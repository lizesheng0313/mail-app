<template>
  <div class="notification-bell" @click.stop="toggleDropdown">
    <!-- 铃铛图标 -->
    <div class="bell-icon relative cursor-pointer">
      <svg class="h-6 w-6 text-gray-600 hover:text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      <!-- 未读数量徽章 -->
      <span v-if="unreadCount > 0" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </div>

    <!-- 通知下拉菜单 -->
    <div
      v-if="showDropdown"
      class="notification-dropdown absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border z-50"
      @click.stop
    >
      <!-- 头部 -->
      <div class="flex items-center justify-between p-4 border-b">
        <h3 class="text-lg font-semibold text-gray-900">通知</h3>
        <button
          v-if="unreadCount > 0"
          @click="handleMarkAllRead"
          class="text-sm text-primary-600 hover:text-primary-700"
        >
          全部标记为已读
        </button>
      </div>

      <!-- 通知列表 -->
      <div class="max-h-96 overflow-y-auto">
        <!-- 加载状态 -->
        <div v-if="loading" class="py-8 text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>

        <!-- 通知项 -->
        <div v-else-if="notifications && notifications.length > 0">
          <div
            v-for="notification in notifications"
            :key="notification.id"
            class="notification-item p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors"
            :class="{ 'bg-blue-50': !notification.is_read }"
            @click="handleNotificationClick(notification)"
          >
            <div class="flex items-start">
              <!-- 通知图标 -->
              <div class="flex-shrink-0 mr-3">
                <div class="h-10 w-10 rounded-full flex items-center justify-center"
                     :class="getNotificationTypeClass(notification.notification_type)">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getNotificationIcon(notification.notification_type)" />
                  </svg>
                </div>
              </div>

              <!-- 通知内容 -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900">{{ notification.title }}</p>
                <p class="text-sm text-gray-600 mt-1">{{ notification.content }}</p>
                <p class="text-xs text-gray-500 mt-1">{{ formatTime(notification.created_at) }}</p>
              </div>

              <!-- 未读标识 -->
              <div v-if="!notification.is_read" class="flex-shrink-0 ml-2">
                <span class="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="py-12 text-center text-gray-500">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p class="mt-2 text-sm">暂无通知</p>
        </div>
      </div>

      <!-- 底部 -->
      <div class="p-3 border-t bg-gray-50">
        <router-link
          to="/user/notifications"
          class="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
          @click="closeDropdown"
        >
          查看全部通知
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { subscribeAccountState } from '@/services/accountRealtime'
import { useRouter } from 'vue-router'
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '@/api/notification'
import { showMessage } from '@/utils/message'

const router = useRouter()

const showDropdown = ref(false)
const loading = ref(false)
const notifications = ref([])
const unreadCount = ref(0)

// 加载通知列表
const loadNotifications = async () => {
  loading.value = true
  try {
    const res = await getNotifications({ page: 1, page_size: 10 })
    if (res.code === 0) {
      notifications.value = res.data.items || []
    }
  } catch (error) {
    console.error('加载通知失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载未读数量
const loadUnreadCount = async () => {
  try {
    const res = await getUnreadCount()
    if (res.code === 0) {
      unreadCount.value = res.data.count || 0
    }
  } catch (error) {
    console.error('加载未读数量失败:', error)
  }
}

// 切换下拉菜单
const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
  if (showDropdown.value) {
    loadNotifications()
  }
}

// 关闭下拉菜单
const closeDropdown = () => {
  showDropdown.value = false
}

// 点击通知
const handleNotificationClick = async (notification) => {
  // 标记为已读
  if (!notification.is_read) {
    await markAsRead(notification.id)
    notification.is_read = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }

  // 跳转到相关页面
  if (notification.link_url) {
    closeDropdown()
    router.push(notification.link_url)
  }
}

// 全部标记为已读
const handleMarkAllRead = async () => {
  try {
    const res = await markAllAsRead()
    if (res.code === 0) {
      notifications.value.forEach(n => n.is_read = true)
      unreadCount.value = 0
      showMessage('已全部标记为已读', 'success')
    }
  } catch (error) {
    showMessage('操作失败', 'error')
  }
}

// 获取通知类型样式
const getNotificationTypeClass = (type) => {
  const classes = {
    'purchase': 'bg-blue-100 text-blue-600',
    'sell': 'bg-green-100 text-green-600',
    'recharge': 'bg-purple-100 text-purple-600',
    'withdrawal': 'bg-orange-100 text-orange-600',
    'approval': 'bg-emerald-100 text-emerald-600',
    'rejection': 'bg-red-100 text-red-600',
    'execution': 'bg-indigo-100 text-indigo-600'
  }
  return classes[type] || 'bg-gray-100 text-gray-600'
}

// 获取通知图标
const getNotificationIcon = (type) => {
  const icons = {
    'purchase': 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
    'sell': 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    'recharge': 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    'withdrawal': 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    'approval': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    'rejection': 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
    'execution': 'M13 10V3L4 14h7v7l9-11h-7z'
  }
  return icons[type] || 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
}

// 格式化时间
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  return date.toLocaleDateString('zh-CN')
}

// 点击外部关闭下拉菜单
const handleClickOutside = (event) => {
  const dropdown = document.querySelector('.notification-bell')
  if (dropdown && !dropdown.contains(event.target)) {
    closeDropdown()
  }
}

let unsubscribeState
onMounted(() => {
  loadUnreadCount()
  unsubscribeState = subscribeAccountState(['notifications'], async () => {
    await loadUnreadCount()
    if (showDropdown.value) await loadNotifications()
  })
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => {
  unsubscribeState?.()
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.notification-bell {
  position: relative;
  display: inline-block;
}

.notification-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  min-width: 384px;
}

.notification-item:last-child {
  border-bottom: none;
}
</style>
