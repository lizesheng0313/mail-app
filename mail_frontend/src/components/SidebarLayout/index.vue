<template>
  <div class="flex h-screen overflow-hidden bg-gray-100">
    <!-- 左侧菜单 -->
    <div
      :class="[
        'flex h-full flex-shrink-0 flex-col bg-white shadow-lg transition-all duration-200',
        sidebarCollapsed ? 'w-20' : 'w-64'
      ]"
    >
      <!-- 头部Logo -->
      <div
        class="flex items-center justify-between border-b border-gray-200 px-4 transition-colors"
        style="height: 64px;"
      >
        <router-link
          to="/"
          class="flex min-w-0 items-center transition-colors hover:opacity-80"
          :class="sidebarCollapsed ? 'justify-center' : ''"
        >
          <div
            class="h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg flex items-center justify-center"
            :class="logoSrc ? 'bg-transparent' : 'bg-primary-600'"
          >
            <img
              v-if="logoSrc"
              :src="logoSrc"
              alt="logo"
              class="h-full w-full object-cover"
            />
            <component v-else :is="logoIcon" class="h-5 w-5 text-white" />
          </div>
          <h1 v-if="!sidebarCollapsed" class="ml-3 truncate text-lg font-semibold text-gray-900">
            {{ title }}
          </h1>
        </router-link>
        <button
          type="button"
          class="ml-2 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          :title="sidebarCollapsed ? '展开菜单' : '收起菜单'"
          @click="toggleSidebar"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              :d="sidebarCollapsed ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7M19 19l-7-7 7-7'"
            />
          </svg>
        </button>
      </div>

      <!-- 菜单列表 -->
      <nav class="min-h-0 flex-1 overflow-y-auto py-4">
        <div v-for="section in menuSections" :key="section.name" class="px-3">
          <button
            type="button"
            class="mb-2 flex w-full items-center rounded-md px-3 py-2 text-left transition-colors"
            :class="[
              section.name !== menuSections[0].name ? 'mt-4' : '',
              sectionActive(section)
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            ]"
            :title="sidebarCollapsed ? section.name : ''"
            @click="toggleSection(section.name)"
          >
            <component
              :is="getSectionIcon(section)"
              class="h-5 w-5 flex-shrink-0"
              :class="sectionActive(section) ? 'text-primary-500' : 'text-gray-400'"
            />
            <template v-if="!sidebarCollapsed">
              <span class="ml-3 flex-1 text-sm font-semibold">{{ section.name }}</span>
              <svg
                class="h-4 w-4 transition-transform"
                :class="isSectionOpen(section.name) ? 'rotate-90' : ''"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </template>
          </button>

          <div v-if="!sidebarCollapsed && isSectionOpen(section.name)" class="mb-1">
            <router-link
              v-for="item in section.items"
              :key="item.path"
              :to="item.path"
              class="group mb-1 ml-2 flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
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
        </div>
      </nav>
    </div>

    <!-- 右侧内容区域 -->
    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <!-- 顶部导航栏 -->
      <header class="bg-white shadow-sm border-b border-gray-200 flex-shrink-0" style="height: 64px;">
        <div class="px-6 h-full flex items-center justify-between">
            <div class="min-w-0">
              <h1 class="truncate text-lg font-semibold text-gray-900">{{ pageTitle }}</h1>
            </div>
            <div class="flex items-center space-x-4">
              <slot name="header-actions"></slot>
            </div>
        </div>
      </header>

      <!-- 主要内容区域 -->
      <main class="min-h-0 flex-1 bg-gray-50 overflow-hidden">
        <div class="h-full min-h-0 px-6 pt-6 pb-0 overflow-y-auto">
          <slot></slot>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  logoIcon: {
    type: Object,
    required: true
  },
  logoSrc: {
    type: String,
    default: ''
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

const route = useRoute()
const sidebarCollapsed = ref(false)
const openSections = ref({})

const sectionActive = (section) => section.items.some((item) => item.path === route.path)

const getSectionIcon = (section) => section.items?.[0]?.icon

const getSectionByName = (sectionName) =>
  props.menuSections.find((section) => section.name === sectionName)

const isSectionOpen = (sectionName) => {
  if (openSections.value[sectionName] !== undefined) {
    return openSections.value[sectionName]
  }
  const section = getSectionByName(sectionName)
  return section ? sectionActive(section) : false
}

const toggleSection = (sectionName) => {
  if (sidebarCollapsed.value) {
    sidebarCollapsed.value = false
  }
  openSections.value = {
    ...openSections.value,
    [sectionName]: !isSectionOpen(sectionName)
  }
}

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}
</script>
