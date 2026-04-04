<template>
  <div class="min-h-screen bg-gray-100 flex">
    <!-- 左侧菜单 -->
    <div class="w-64 bg-white shadow-lg">
      <!-- 头部Logo -->
      <router-link
        to="/"
        class="flex items-center px-6 border-b border-gray-200 transition-colors hover:bg-gray-50"
        style="height: 87px;"
      >
        <div class="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <component :is="logoIcon" class="h-5 w-5 text-white" />
        </div>
        <h1 class="ml-3 text-lg font-semibold text-gray-900">{{ title }}</h1>
      </router-link>

      <!-- 菜单列表 -->
      <nav class="mt-6">
        <div v-for="section in menuSections" :key="section.name" class="px-3">
          <p class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3" :class="section.name !== menuSections[0].name ? 'mt-6' : ''">
            {{ section.name }}
          </p>
          
          <router-link
            v-for="item in section.items"
            :key="item.path"
            :to="item.path"
            class="group flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors mb-1"
            :class="$route.path === item.path ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-700' : 'text-gray-700 hover:text-gray-900'"
          >
            <component 
              :is="item.icon" 
              class="mr-3 h-5 w-5" 
              :class="$route.path === item.path ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'" 
            />
            {{ item.label }}
          </router-link>
        </div>
      </nav>

      <!-- 底部用户信息 -->
      <div class="absolute bottom-0 w-64 p-4 border-t border-gray-200 bg-white">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
              <span class="text-primary-600 text-sm font-medium">{{ userInitial }}</span>
            </div>
          </div>
          <div class="ml-3 flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">{{ userEmail }}</p>
            <p class="text-xs text-gray-500">{{ userRole }}</p>
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
        <div class="px-6 h-full flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-semibold text-gray-900">{{ pageTitle }}</h1>
              <p class="text-sm text-gray-600 mt-1">{{ pageDescription }}</p>
            </div>
            <div class="flex items-center space-x-4">
              <slot name="header-actions"></slot>
            </div>
        </div>
      </header>

      <!-- 主要内容区域 -->
      <main class="flex-1 bg-gray-50 overflow-hidden">
        <div class="h-full p-6 overflow-y-auto">
          <slot></slot>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  logoIcon: {
    type: Object,
    required: true
  },
  menuSections: {
    type: Array,
    required: true
  },
  userEmail: {
    type: String,
    default: ''
  },
  userRole: {
    type: String,
    default: ''
  },
  pageTitle: {
    type: String,
    default: ''
  },
  pageDescription: {
    type: String,
    default: ''
  },
  onLogout: {
    type: Function,
    required: true
  }
})

const userInitial = computed(() => {
  if (!props.userEmail) return 'U'
  return props.userEmail.charAt(0).toUpperCase()
})

const handleLogout = () => {
  props.onLogout()
}
</script>
