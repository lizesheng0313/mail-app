<template>
  <div class="flex h-screen overflow-hidden bg-gray-100">
    <!-- 左侧菜单 -->
    <div
      :class="[
        'flex h-full flex-shrink-0 flex-col bg-white shadow-lg transition-all duration-200',
        sidebarCollapsed ? 'w-16 sm:w-20' : 'w-64'
      ]"
    >
      <!-- 头部Logo -->
      <div
        class="flex items-center border-b border-gray-200 transition-colors"
        :class="[
          sidebarCollapsed ? 'px-4' : 'site-header-inline-padding',
          sidebarCollapsed && hideBrandIcon ? 'justify-start' : 'justify-between'
        ]"
        style="height: 54px;"
      >
        <router-link
          v-if="!sidebarCollapsed || !hideBrandIcon"
          to="/"
          class="flex min-w-0 items-center transition-colors hover:opacity-80"
          :class="sidebarCollapsed ? 'justify-center' : ''"
          :aria-label="title || '返回首页'"
          :title="title || '返回首页'"
        >
          <HomeIcon v-if="!title && hideBrandIcon" class="h-5 w-5 text-gray-500" aria-hidden="true" />
          <div
            v-if="!hideBrandIcon"
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
          <h1
            v-if="!sidebarCollapsed && title"
            class="truncate text-base font-semibold text-black"
            :class="hideBrandIcon ? '' : 'ml-3'"
          >
            {{ title }}
          </h1>
        </router-link>
        <button
          type="button"
          class="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          :class="sidebarCollapsed && hideBrandIcon ? 'ml-0' : 'ml-2'"
          :title="sidebarCollapsed ? '展开菜单' : '收起菜单'"
          :aria-label="sidebarCollapsed ? '展开菜单' : '收起菜单'"
          :aria-expanded="!sidebarCollapsed"
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
            <div v-for="item in section.items" :key="item.path || item.label">
              <button
                v-if="item.children?.length"
                type="button"
                class="group mb-1 ml-2 flex w-[calc(100%-0.5rem)] items-center rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-gray-50"
                :class="itemActive(item) ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-700' : 'text-gray-700 hover:text-gray-900'"
                @click="toggleMenuItem(item)"
              >
                <component
                  :is="item.icon"
                  class="mr-3 h-5 w-5 flex-shrink-0"
                  :class="itemActive(item) ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'"
                />
                <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
                <span
                  v-if="item.badge"
                  class="ml-2 inline-flex h-5 min-w-[1.25rem] flex-shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold leading-none text-white"
                >
                  {{ item.badge }}
                </span>
                <svg
                  class="ml-2 h-4 w-4 flex-shrink-0 transition-transform"
                  :class="isMenuItemOpen(item) ? 'rotate-90' : ''"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                v-else-if="item.action"
                type="button"
                class="group mb-1 ml-2 flex w-[calc(100%-0.5rem)] items-center rounded-md px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                @click="handleMenuAction(item.action)"
              >
                <component :is="item.icon" class="mr-3 h-5 w-5 shrink-0 text-gray-400" />
                <span class="truncate">{{ item.label }}</span>
              </button>
              <router-link
                v-else
                :to="item.path"
                @click="closeMobileSidebar"
                class="group mb-1 ml-2 flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
                :class="itemActive(item) ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-700' : 'text-gray-700 hover:text-gray-900'"
              >
                <component
                  :is="item.icon"
                  class="mr-3 h-5 w-5"
                  :class="itemActive(item) ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'"
                />
                <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
                <span
                  v-if="item.badge"
                  class="ml-2 inline-flex h-5 min-w-[1.25rem] flex-shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold leading-none text-white"
                >
                  {{ item.badge }}
                </span>
              </router-link>
              <div v-if="item.children?.length && isMenuItemOpen(item)" class="mb-1 ml-10">
                <router-link
                  v-for="child in item.children"
                  :key="child.path"
                  :to="child.path"
                  @click="closeMobileSidebar"
                  class="mb-1 flex items-center rounded-md px-3 py-1.5 text-sm transition-colors"
                  :class="$route.path === child.path ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'"
                >
                  <span class="min-w-0 flex-1 truncate">{{ child.label }}</span>
                  <span
                    v-if="child.badge"
                    class="ml-2 inline-flex h-5 min-w-[1.25rem] flex-shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold leading-none text-white"
                  >
                    {{ child.badge }}
                  </span>
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </div>

    <!-- 右侧内容区域 -->
    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <!-- 顶部导航栏 -->
      <header class="bg-white shadow-sm border-b border-gray-200 flex-shrink-0" style="height: 54px;">
        <div
          class="px-3 sm:px-6 h-full flex items-center gap-2"
          :class="pageTitle ? 'justify-between' : 'justify-end'"
        >
            <div v-if="pageTitle" class="min-w-0">
              <h1 class="truncate text-lg font-semibold text-gray-900">{{ pageTitle }}</h1>
            </div>
            <div class="flex shrink-0 items-center gap-3">
              <slot name="header-actions"></slot>
            </div>
        </div>
      </header>

      <!-- 主要内容区域 -->
      <main class="min-h-0 flex-1 bg-gray-50 overflow-hidden">
        <div class="h-full min-h-0 px-2 pt-2 pb-0 sm:px-3 sm:pt-3 overflow-y-auto">
          <slot></slot>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { HomeIcon } from '@heroicons/vue/24/outline'
import { isMenuItemActive } from '@/config/workspaceNavigation'
import { useRoute } from 'vue-router'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  logoIcon: {
    type: [Object, Function],
    required: true
  },
  logoSrc: {
    type: String,
    default: ''
  },
  hideBrandIcon: {
    type: Boolean,
    default: false
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

const emit = defineEmits(['menu-action'])
const route = useRoute()
const closeMobileSidebar = () => {
  if (window.matchMedia?.('(max-width: 767px)').matches) sidebarCollapsed.value = true
}
const handleMenuAction = (action) => {
  closeMobileSidebar()
  emit('menu-action', action)
}
const sidebarCollapsed = ref(window.matchMedia?.('(max-width: 767px)').matches ?? false)
const openSections = ref({})
const openMenuItems = ref({})

const itemActive = (item) => isMenuItemActive(item, route.path)

const sectionActive = (section) => section.items.some((item) => itemActive(item))

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

const getMenuItemKey = (item) => item.path || item.label

const isMenuItemOpen = (item) => {
  const key = getMenuItemKey(item)
  if (openMenuItems.value[key] !== undefined) {
    return openMenuItems.value[key]
  }
  return itemActive(item)
}

const toggleMenuItem = (item) => {
  if (sidebarCollapsed.value) {
    sidebarCollapsed.value = false
  }
  const key = getMenuItemKey(item)
  openMenuItems.value = {
    ...openMenuItems.value,
    [key]: !isMenuItemOpen(item)
  }
}

watch(() => route.path, () => {
  for (const section of props.menuSections) {
    if (sectionActive(section)) {
      openSections.value[section.name] = true
      for (const item of section.items) {
        if (item.children?.length && itemActive(item)) openMenuItems.value[getMenuItemKey(item)] = true
      }
    }
  }
})

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}
</script>
