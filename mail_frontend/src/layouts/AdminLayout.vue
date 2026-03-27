<template>
  <div class="min-h-screen bg-gray-100 flex">
    <!-- 左侧菜单 -->
    <div class="w-64 bg-white shadow-lg flex flex-col">
      <!-- 头部Logo -->
      <div class="flex items-center px-6 border-b border-gray-200" style="height: 87px;">
        <div class="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h1 class="ml-3 text-lg font-semibold text-gray-900">管理后台</h1>
      </div>

      <!-- 菜单列表 - 可滚动区域 -->
      <nav class="flex-1 overflow-y-auto py-4">
        <div class="px-3 space-y-1">
          <!-- 一级菜单：系统配置 -->
          <div class="mb-2">
            <button
              @click="toggleMenu('system')"
              class="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center">
                <svg class="mr-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>系统配置</span>
              </div>
              <svg class="h-4 w-4 transition-transform" :class="{ 'rotate-90': expandedMenus.system }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            <!-- 二级菜单 -->
            <div v-show="expandedMenus.system" class="ml-8 mt-1 space-y-1">
              <router-link
                to="/admin/domains"
                class="block px-3 py-2 text-sm rounded-md hover:bg-gray-50 transition-colors"
                :class="$route.path === '/admin/domains' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:text-gray-900'"
              >
                域名管理
              </router-link>
              <router-link
                to="/admin/proxy"
                class="block px-3 py-2 text-sm rounded-md hover:bg-gray-50 transition-colors"
                :class="$route.path === '/admin/proxy' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:text-gray-900'"
              >
                代理管理
              </router-link>
              <router-link
                to="/admin/announcements"
                class="block px-3 py-2 text-sm rounded-md hover:bg-gray-50 transition-colors"
                :class="$route.path === '/admin/announcements' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:text-gray-900'"
              >
                公告管理
              </router-link>
            </div>
          </div>

          <!-- 一级菜单：用户管理 -->
          <div class="mb-2">
            <button
              @click="toggleMenu('user')"
              class="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center">
                <svg class="mr-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>用户管理</span>
              </div>
              <svg class="h-4 w-4 transition-transform" :class="{ 'rotate-90': expandedMenus.user }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            <div v-show="expandedMenus.user" class="ml-8 mt-1 space-y-1">
              <router-link
                to="/admin/users"
                class="block px-3 py-2 text-sm rounded-md hover:bg-gray-50 transition-colors"
                :class="$route.path === '/admin/users' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:text-gray-900'"
              >
                用户列表
              </router-link>
              <router-link
                to="/admin/feedback"
                class="block px-3 py-2 text-sm rounded-md hover:bg-gray-50 transition-colors"
                :class="$route.path === '/admin/feedback' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:text-gray-900'"
              >
                用户反馈
              </router-link>
            </div>
          </div>

          <!-- 一级菜单：工作流 -->
          <div class="mb-2">
            <button
              @click="toggleMenu('workflow')"
              class="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center">
                <svg class="mr-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>工作流</span>
              </div>
              <svg class="h-4 w-4 transition-transform" :class="{ 'rotate-90': expandedMenus.workflow }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            <div v-show="expandedMenus.workflow" class="ml-8 mt-1 space-y-1">
              <router-link
                to="/admin/workflow-review"
                class="block px-3 py-2 text-sm rounded-md hover:bg-gray-50 transition-colors"
                :class="$route.path === '/admin/workflow-review' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:text-gray-900'"
              >
                工作流审核
              </router-link>
            </div>
          </div>

          <!-- 一级菜单：财务管理 -->
          <div class="mb-2">
            <button
              @click="toggleMenu('finance')"
              class="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center">
                <svg class="mr-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>财务管理</span>
              </div>
              <svg class="h-4 w-4 transition-transform" :class="{ 'rotate-90': expandedMenus.finance }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            <div v-show="expandedMenus.finance" class="ml-8 mt-1 space-y-1">
              <router-link
                to="/admin/finance-settlement"
                class="block px-3 py-2 text-sm rounded-md hover:bg-gray-50 transition-colors"
                :class="$route.path === '/admin/finance-settlement' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:text-gray-900'"
              >
                财务结算
              </router-link>
              <router-link
                to="/admin/transactions"
                class="block px-3 py-2 text-sm rounded-md hover:bg-gray-50 transition-colors"
                :class="$route.path === '/admin/transactions' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:text-gray-900'"
              >
                奶片交易
              </router-link>
            </div>
          </div>

          <!-- 一级菜单：小程序 -->
          <div class="mb-2">
            <button
              @click="toggleMenu('miniapp')"
              class="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center">
                <svg class="mr-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>小程序</span>
              </div>
              <svg class="h-4 w-4 transition-transform" :class="{ 'rotate-90': expandedMenus.miniapp }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            <div v-show="expandedMenus.miniapp" class="ml-8 mt-1 space-y-1">
              <router-link
                to="/admin/miniapp-management"
                class="block px-3 py-2 text-sm rounded-md hover:bg-gray-50 transition-colors"
                :class="$route.path === '/admin/miniapp-management' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:text-gray-900'"
              >
                小程序管理
              </router-link>
              <router-link
                to="/admin/miniapp-config"
                class="block px-3 py-2 text-sm rounded-md hover:bg-gray-50 transition-colors"
                :class="$route.path === '/admin/miniapp-config' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:text-gray-900'"
              >
                视频激励配置
              </router-link>
            </div>
          </div>

          <!-- 一级菜单：系统监控 -->
          <div class="mb-2">
            <router-link
              to="/admin/monitoring"
              class="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
              :class="$route.path === '/admin/monitoring' ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:text-gray-900'"
            >
              <svg class="mr-3 h-5 w-5" :class="$route.path === '/admin/monitoring' ? 'text-primary-500' : 'text-gray-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              系统监控
            </router-link>
          </div>
        </div>

        <!-- 分隔线 -->
        <div class="border-t border-gray-200 mt-4 pt-4">
          <div class="px-3">
            <router-link
              to="/"
              class="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <svg class="mr-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              返回前台
            </router-link>
          </div>
        </div>
      </nav>

      <!-- 底部用户信息 -->
      <div class="p-4 border-t border-gray-200 bg-white">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
              <svg class="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <div class="ml-3 flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">{{ userStore.user?.email }}</p>
            <p class="text-xs text-gray-500">管理员</p>
          </div>
          <button
            @click="handleLogout"
            class="text-gray-400 hover:text-gray-600 transition-colors"
            title="退出登录"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 右侧内容区域 -->
    <div class="flex-1 flex flex-col h-screen overflow-hidden">
      <!-- 顶部导航栏 -->
      <header class="bg-white shadow-sm border-b border-gray-200 flex-shrink-0" style="height: 87px;">
        <div class="px-6 h-full">
          <div class="flex items-center justify-between h-full">
            <div>
              <h1 class="text-2xl font-semibold text-gray-900">{{ pageTitle }}</h1>
              <p class="text-sm text-gray-600 mt-1">{{ pageDescription }}</p>
            </div>
            <div class="flex items-center space-x-4">
              <span class="text-sm text-gray-500">
                {{ new Date().toLocaleDateString('zh-CN') }}
              </span>
            </div>
          </div>
        </div>
      </header>

      <!-- 主要内容区域 -->
      <main class="flex-1 bg-gray-50 overflow-hidden">
        <div class="h-full overflow-y-auto">
          <div class="max-w-7xl mx-auto px-6 py-6">
            <router-view />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const userStore = useUserStore()

// 展开的菜单
const expandedMenus = reactive({
  system: false,
  user: false,
  workflow: false,
  finance: false,
  miniapp: false
})

// 切换菜单展开/收起
const toggleMenu = (menu: keyof typeof expandedMenus) => {
  expandedMenus[menu] = !expandedMenus[menu]
}

// 根据当前路由自动展开对应的菜单
const autoExpandMenu = () => {
  const path = route.path
  if (['/admin/domains', '/admin/proxy', '/admin/announcements'].includes(path)) {
    expandedMenus.system = true
  } else if (['/admin/users', '/admin/feedback'].includes(path)) {
    expandedMenus.user = true
  } else if (['/admin/workflow-review'].includes(path)) {
    expandedMenus.workflow = true
  } else if (['/admin/finance-settlement', '/admin/transactions'].includes(path)) {
    expandedMenus.finance = true
  } else if (['/admin/miniapp-management', '/admin/miniapp-config'].includes(path)) {
    expandedMenus.miniapp = true
  }
}

// 页面加载时自动展开
onMounted(() => {
  autoExpandMenu()
})

// 路由变化时自动展开
watch(() => route.path, () => {
  autoExpandMenu()
})

// 页面标题和描述
const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/admin/domains': '域名管理',
    '/admin/feedback': '用户反馈',
    '/admin/monitoring': '系统监控',
    '/admin/proxy': '代理管理',
    '/admin/users': '用户列表',
    '/admin/workflow-review': '工作流审核',
    '/admin/finance-settlement': '财务结算',
    '/admin/announcements': '公告管理',
    '/admin/transactions': '奶片交易',
    '/admin/miniapp-management': '小程序管理',
    '/admin/miniapp-config': '视频激励配置'
  }
  return titles[route.path] || '管理后台'
})

const pageDescription = computed(() => {
  const descriptions: Record<string, string> = {
    '/admin/domains': '管理邮箱域名配置',
    '/admin/feedback': '管理用户反馈和问题建议',
    '/admin/monitoring': '实时监控系统运行状态和性能指标',
    '/admin/proxy': '管理付费代理配置和使用监控',
    '/admin/users': '查看和管理用户账户及代理权限',
    '/admin/workflow-review': '审核和管理工作流市场的所有工作流',
    '/admin/finance-settlement': '查看和管理工作流销售收入结算',
    '/admin/announcements': '发布和管理系统公告通知',
    '/admin/transactions': '查看和管理所有用户的奶片交易记录',
    '/admin/miniapp-management': '管理小程序基本信息和配置',
    '/admin/miniapp-config': '配置小程序工作流和视频奖励规则'
  }
  return descriptions[route.path] || '系统管理中心'
})

// 处理退出登录
const handleLogout = () => {
  userStore.logout()
  window.location.href = '/'
}
</script>
