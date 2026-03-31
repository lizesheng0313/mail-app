<template>
  <div>
    <!-- 顶部导航 -->
    <nav class="fixed inset-x-0 top-0 z-[70] bg-white shadow-sm border-b border-gray-200 mobile-nav">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <router-link to="/" class="flex items-center hover:opacity-80 transition-opacity">
              <div class="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 class="ml-3 text-xl font-semibold text-black">{{ t('pageHeader.siteName') }}</h1>
            </router-link>
          </div>
          <div class="flex items-center space-x-6 desktop-nav-items">
            <!-- 菜单导航 -->
            <nav class="flex items-center space-x-6">
              <!-- 我的资源（需要登录才显示） -->
              <router-link
                v-if="userStore.isAuthenticated"
                to="/automation/workflows"
                class="text-sm text-black hover:text-black font-medium transition-colors"
                active-class="text-primary-600 font-semibold"
              >
                {{ t('pageHeader.myAssets') }}
              </router-link>

              <!-- 资源市场（无需登录） -->
              <router-link
                to="/market"
                class="text-sm text-black hover:text-black font-medium transition-colors"
                active-class="text-primary-600 font-semibold"
              >
                {{ t('pageHeader.resourceMarket') }}
              </router-link>

              <router-link
                to="/open-platform"
                class="text-sm text-black hover:text-black font-medium transition-colors"
                active-class="text-primary-600 font-semibold"
              >
                {{ t('pageHeader.openPlatform') }}
              </router-link>

              <!-- 自动化中心（需要登录才显示） -->
              <router-link
                v-if="userStore.isAuthenticated"
                to="/automation"
                class="text-sm text-black hover:text-black font-medium transition-colors"
                active-class="text-primary-600 font-semibold"
              >
                {{ t('pageHeader.automationCenter') }}
              </router-link>

              <!-- 下载客户端（桌面端不显示） -->
              <router-link
                v-if="!isTauri()"
                to="/download"
                class="text-sm text-black hover:text-black font-medium transition-colors flex items-center space-x-1"
                active-class="text-primary-600 font-semibold"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>{{ t('pageHeader.downloadClient') }}</span>
              </router-link>

              <!-- 关于我们 -->
              <router-link
                to="/about"
                class="text-sm text-black hover:text-black font-medium transition-colors"
                active-class="text-primary-600 font-semibold"
              >
                {{ t('pageHeader.about') }}
              </router-link>
            </nav>

            <LanguageSwitcher />

            <!-- 用户信息 -->
            <div v-if="userStore.isAuthenticated" class="flex items-center space-x-4">
              <!-- 公告按钮 -->
              <div class="relative" ref="announcementRef">
                <button
                  @click="toggleAnnouncements"
                  class="relative p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
                  :title="t('pageHeader.notices')"
                >
                  <BaseIcon name="bell" size="md" />
                  <!-- 未读数量徽章 -->
                  <span
                    v-if="unreadCount > 0"
                    class="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full"
                  >
                    {{ unreadCount > 99 ? '99+' : unreadCount }}
                  </span>
                </button>

                <!-- 公告下拉面板 -->
                <div
                  v-if="showAnnouncements"
                  class="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-[80]"
                >
                  <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h3 class="text-sm font-semibold text-gray-900">{{ t('pageHeader.systemAnnouncements') }}</h3>
                    <span class="text-xs text-gray-500">{{ t('pageHeader.announcementCount', { count: announcements.length }) }}</span>
                  </div>

                  <div class="max-h-96 overflow-y-auto">
                    <div v-if="announcementsLoading" class="p-8 text-center">
                      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                      <p class="mt-2 text-sm text-gray-500">{{ t('common.loading') }}</p>
                    </div>

                    <div v-else-if="announcements.length === 0" class="p-8 text-center">
                      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p class="mt-2 text-sm text-gray-500">{{ t('pageHeader.noAnnouncements') }}</p>
                    </div>

                    <div v-else>
                      <div
                        v-for="announcement in announcements"
                        :key="announcement.id"
                        @click="goToAnnouncement(announcement.id)"
                        class="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                        :class="{ 'bg-blue-50': !announcement.is_read }"
                      >
                        <div class="flex items-start">
                          <!-- 类型图标 -->
                          <div class="flex-shrink-0 mt-0.5">
                            <div
                              :class="{
                                'bg-blue-100 text-blue-600': announcement.type === 'info',
                                'bg-yellow-100 text-yellow-600': announcement.type === 'warning',
                                'bg-green-100 text-green-600': announcement.type === 'success',
                                'bg-red-100 text-red-600': announcement.type === 'error'
                              }"
                              class="w-8 h-8 rounded-full flex items-center justify-center"
                            >
                              <BaseIcon
                                :name="announcement.type === 'info' ? 'info' : announcement.type === 'warning' ? 'warning' : announcement.type === 'success' ? 'success' : 'error'"
                                size="sm"
                              />
                            </div>
                          </div>

                          <!-- 内容 -->
                          <div class="ml-3 flex-1">
                            <div class="flex items-center justify-between">
                              <p class="text-sm font-medium text-gray-900">{{ announcement.title }}</p>
                              <span v-if="!announcement.is_read" class="ml-2 w-2 h-2 bg-blue-500 rounded-full"></span>
                            </div>
                            <p class="mt-1 text-xs text-gray-600 line-clamp-2">{{ announcement.content }}</p>
                            <p class="mt-1 text-xs text-gray-400">{{ formatTime(announcement.created_at) }}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="px-4 py-3 border-t border-gray-200 text-center">
                    <router-link
                      to="/user/announcements"
                      @click="showAnnouncements = false"
                      class="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {{ t('pageHeader.viewAllAnnouncements') }}
                    </router-link>
                  </div>
                </div>
              </div>

              <!-- 用户下拉菜单 -->
              <div class="relative" ref="userMenuRef">
                <button
                  @click="toggleUserMenu"
                  class="flex items-center space-x-2 text-sm text-black hover:text-black focus:outline-none"
                >
                  <span>{{ displayUserName }}</span>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>
                
                <!-- 下拉菜单 -->
                <div v-if="showUserMenu" class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-[80]">
                  <div class="py-1">
                    <!-- 管理员入口 -->
                    <router-link
                      v-if="userStore.user && (userStore.user as any).is_admin"
                      to="/admin/domains"
                      @click="showUserMenu = false"
                      class="block px-4 py-2 text-sm text-black hover:bg-gray-100 transition-colors"
                    >
                      <div class="flex items-center space-x-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>{{ t('pageHeader.admin') }}</span>
                      </div>
                    </router-link>

                    <!-- 分隔线 -->
                    <div v-if="userStore.user && (userStore.user as any).is_admin" class="border-t border-gray-100 my-1"></div>

                    <!-- 我的工作台 -->
                    <router-link
                      to="/user/developer/api-keys"
                      @click="showUserMenu = false"
                      class="block px-4 py-2 text-sm text-black hover:bg-gray-100 transition-colors"
                    >
                      <div class="flex items-center space-x-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>{{ t('pageHeader.workspace') }}</span>
                      </div>
                    </router-link>

                    <!-- 分隔线 -->
                    <div class="border-t border-gray-100 my-1"></div>

                    <!-- 退出登录 -->
                    <button
                      @click="handleLogout"
                      class="block w-full text-left px-4 py-2 text-sm text-black hover:bg-gray-100 transition-colors"
                    >
                      <div class="flex items-center space-x-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>{{ t('pageHeader.logout') }}</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div v-else>
              <div class="flex items-center space-x-4">
                <router-link
                  to="/login"
                  class="text-sm text-black hover:text-black"
                >
                  {{ t('pageHeader.login') }}
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <div class="h-16"></div>

    <!-- 注册提示横幅 -->
    <div v-if="!userStore.isAuthenticated" class="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <svg class="w-5 h-5 register-banner-details" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="text-sm font-medium">
              <span class="register-banner-details">🎉 </span>{{ t('pageHeader.registerBanner') }}
            </span>
          </div>
          <router-link
            to="/login?mode=register"
            class="bg-white text-primary-600 px-4 py-1 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            {{ t('pageHeader.registerNow') }}
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import BaseIcon from '@/components/BaseIcon/index.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher/index.vue'
import { showMessage } from '@/utils/message'
import { showAlert } from '@/utils/dialog'
import { isTauri } from '@/services/api'
import api from '@/services/api'

const { t, locale } = useI18n()
const router = useRouter()
const userStore = useUserStore()
const displayUserName = computed(() => {
  const user = userStore.user as any
  return user?.nickname || user?.display_name || user?.nick_name || user?.username || user?.email || ''
})

// 用户菜单相关
const showUserMenu = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

// 公告相关
const showAnnouncements = ref(false)
const announcementRef = ref<HTMLElement | null>(null)
const announcements = ref<any[]>([])
const announcementsLoading = ref(false)
const unreadCount = ref(0)

const normalizeAnnouncementScene = (scene?: string | null) => {
  return (scene || '').trim().toLowerCase() || 'general'
}

const filterVisibleAnnouncements = (items: any[]) => {
  return (items || []).filter(
    (item: any) => normalizeAnnouncementScene(item?.scene) !== 'release_note'
  )
}

// 跳转到公告详情页
const goToAnnouncement = async (announcementId: number) => {
  console.log('点击公告，ID:', announcementId)
  console.log('当前路由:', router.currentRoute.value.path)
  console.log('用户认证状态:', userStore.isAuthenticated)
  showAnnouncements.value = false
  try {
    await router.push(`/user/announcements?id=${announcementId}`)
    console.log('路由跳转完成')
  } catch (error) {
    console.error('路由跳转失败:', error)
  }
}

// 切换用户菜单
const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
  // 关闭公告面板
  if (showUserMenu.value) {
    showAnnouncements.value = false
  }
}

// 切换公告面板
const toggleAnnouncements = async () => {
  showAnnouncements.value = !showAnnouncements.value
  // 关闭用户菜单
  if (showAnnouncements.value) {
    showUserMenu.value = false
    await loadAnnouncements()
  }
}

// 加载公告列表
const loadAnnouncements = async () => {
  if (!userStore.isAuthenticated) return

  announcementsLoading.value = true
  try {
    const result = await api.get('/announcements/', { params: { page: 1, page_size: 10 } })
    if (result.code === 0) {
      announcements.value = filterVisibleAnnouncements(result.data.items || [])
      // 更新未读数量
      await loadUnreadCount()
    }
  } catch (error) {
    console.error('加载公告失败:', error)
  } finally {
    announcementsLoading.value = false
  }
}

// 加载未读数量
const loadUnreadCount = async () => {
  if (!userStore.isAuthenticated) return

  try {
    const result = await api.get('/announcements/unread/count')
    if (result.code === 0) {
      const nextUnreadCount = result.data.count || 0

      if (nextUnreadCount <= 0) {
        unreadCount.value = 0
        return
      }

      const listResult = await api.get('/announcements/', {
        params: { page: 1, page_size: 10 },
        suppressErrorMessage: true
      } as any)

      if (listResult.code === 0) {
        const visibleAnnouncements = filterVisibleAnnouncements(listResult.data.items || [])
        if (visibleAnnouncements.length === 0) {
          unreadCount.value = 0
          if (!showAnnouncements.value) {
            announcements.value = []
          }
          return
        }
      }

      unreadCount.value = nextUnreadCount
    }
  } catch (error) {
    console.error('加载未读数量失败:', error)
  }
}

// 查看公告详情
const viewAnnouncement = async (announcement: any) => {
  // 标记为已读
  if (!announcement.is_read) {
    await markAsRead(announcement.id)
  }

  // 显示公告详情
  await showAlert(announcement.content, announcement.title)
}

// 标记为已读
const markAsRead = async (announcementId: number) => {
  try {
    const result = await api.post(`/announcements/${announcementId}/read`)
    if (result.code === 0) {
      // 更新本地状态
      const announcement = announcements.value.find(a => a.id === announcementId)
      if (announcement) {
        announcement.is_read = true
      }
      // 更新未读数量
      await loadUnreadCount()
    }
  } catch (error) {
    console.error('标记已读失败:', error)
  }
}

// 标记全部为已读
const markAllAsRead = async () => {
  const unreadAnnouncements = announcements.value.filter(a => !a.is_read)
  for (const announcement of unreadAnnouncements) {
    await markAsRead(announcement.id)
  }
  showMessage(t('pageHeader.markedAllRead'), 'success')
}

// 格式化时间
const formatTime = (timestamp: number) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return t('common.justNow')
  if (minutes < 60) return t('common.minutesAgo', { count: minutes })
  if (hours < 24) return t('common.hoursAgo', { count: hours })
  if (days < 7) return t('common.daysAgo', { count: days })

  return date.toLocaleDateString(locale.value)
}

// 处理退出登录
const handleLogout = () => {
  showUserMenu.value = false
  userStore.logout()
  // 直接跳转到登录页
  window.location.href = '/login'
}

// 点击外部关闭菜单
const handleClickOutside = (event: MouseEvent) => {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
    showUserMenu.value = false
  }
  if (announcementRef.value && !announcementRef.value.contains(event.target as Node)) {
    showAnnouncements.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  // 初始加载未读数量
  loadUnreadCount()
  // 每5分钟刷新一次未读数量
  setInterval(() => {
    loadUnreadCount()
  }, 5 * 60 * 1000)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
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
