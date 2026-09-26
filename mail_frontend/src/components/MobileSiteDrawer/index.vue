<template>
  <div v-if="open" class="fixed inset-0 z-[90] md:hidden">
    <button
      type="button"
      class="absolute inset-0 bg-slate-900/35"
      :aria-label="t('pageHeader.closeNavigationMenu')"
      @click="close"
    />
    <aside
      class="absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col bg-white shadow-xl"
      role="dialog"
      aria-modal="true"
      :aria-label="t('pageHeader.navigationMenu')"
    >
      <div class="flex h-[54px] shrink-0 items-center justify-between border-b border-gray-200 px-4">
        <router-link
          :to="userStore.isAuthenticated ? '/user' : '/'"
          class="truncate text-base font-semibold text-gray-900"
          @click="close"
        >
          {{ t('pageHeader.siteName') }}
        </router-link>
        <button
          type="button"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
          :aria-label="t('pageHeader.closeNavigationMenu')"
          @click="close"
        >
          <XMarkIcon class="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <nav class="min-h-0 flex-1 overflow-y-auto px-3 py-3" :aria-label="t('pageHeader.navigationMenu')">
        <div v-for="section in menuSections" :key="section.name" class="mb-1">
          <button
            type="button"
            class="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-semibold"
            :class="sectionActive(section) ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'"
            :aria-expanded="isSectionOpen(section.name)"
            @click="toggleSection(section.name)"
          >
            <component :is="section.items?.[0]?.icon" class="mr-3 h-5 w-5 shrink-0" aria-hidden="true" />
            <span class="min-w-0 flex-1 truncate">{{ section.name }}</span>
            <ChevronRightIcon class="h-4 w-4 shrink-0 transition-transform" :class="isSectionOpen(section.name) ? 'rotate-90' : ''" aria-hidden="true" />
          </button>

          <div v-if="isSectionOpen(section.name)" class="ml-3">
            <div v-for="item in section.items" :key="item.path || item.label">
              <button
                v-if="item.children?.length"
                type="button"
                class="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm"
                :class="itemActive(item) ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'"
                :aria-expanded="isMenuItemOpen(item)"
                @click="toggleMenuItem(item)"
              >
                <component :is="item.icon" class="mr-3 h-4 w-4 shrink-0" aria-hidden="true" />
                <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
                <ChevronRightIcon class="h-4 w-4 shrink-0 transition-transform" :class="isMenuItemOpen(item) ? 'rotate-90' : ''" aria-hidden="true" />
              </button>
              <button
                v-else-if="item.action"
                type="button"
                class="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50"
                @click="handleAction(item.action)"
              >
                <component :is="item.icon" class="mr-3 h-4 w-4 shrink-0" aria-hidden="true" />
                <span class="truncate">{{ item.label }}</span>
              </button>
              <router-link
                v-else
                :to="item.path"
                class="flex items-center rounded-lg px-3 py-2 text-sm"
                :class="itemActive(item) ? 'bg-primary-50 font-medium text-primary-700' : 'text-gray-600 hover:bg-gray-50'"
                @click="close"
              >
                <component :is="item.icon" class="mr-3 h-4 w-4 shrink-0" aria-hidden="true" />
                <span class="min-w-0 truncate">{{ item.label }}</span>
              </router-link>
              <div v-if="item.children?.length && isMenuItemOpen(item)" class="ml-7">
                <router-link
                  v-for="child in item.children"
                  :key="child.path"
                  :to="child.path"
                  class="block rounded-lg px-3 py-1.5 text-sm"
                  :class="route.path === child.path ? 'bg-primary-50 font-medium text-primary-700' : 'text-gray-500 hover:bg-gray-50'"
                  @click="close"
                >
                  {{ child.label }}
                </router-link>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 border-t border-gray-200 pt-3">
          <PublicNavigation vertical @click="close" />
        </div>
      </nav>
    </aside>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ChevronRightIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { isMenuItemActive } from '@/config/workspaceNavigation'
import PublicNavigation from '@/components/PublicNavigation/index.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  menuSections: { type: Array, required: true }
})
const emit = defineEmits(['update:open', 'menu-action'])
const { t } = useI18n()
const route = useRoute()
const userStore = useUserStore()
const openSections = ref({})
const openMenuItems = ref({})

const close = () => emit('update:open', false)
const itemActive = (item) => isMenuItemActive(item, route.path)
const sectionActive = (section) => section.items.some(itemActive)
const isSectionOpen = (name) => {
  if (openSections.value[name] !== undefined) return openSections.value[name]
  const section = props.menuSections.find((item) => item.name === name)
  return Boolean(section && (section === props.menuSections[0] || sectionActive(section)))
}
const toggleSection = (name) => {
  openSections.value = { ...openSections.value, [name]: !isSectionOpen(name) }
}
const itemKey = (item) => item.path || item.label
const isMenuItemOpen = (item) => openMenuItems.value[itemKey(item)] ?? itemActive(item)
const toggleMenuItem = (item) => {
  const key = itemKey(item)
  openMenuItems.value = { ...openMenuItems.value, [key]: !isMenuItemOpen(item) }
}
const handleAction = (action) => {
  emit('menu-action', action)
  close()
}

watch(() => route.fullPath, close)
</script>
