<template>
  <div ref="switcherRef" class="relative inline-flex">
    <button
      type="button"
      :aria-label="t('common.language')"
      :aria-expanded="isOpen"
      class="group inline-flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      :class="compact ? 'h-10 min-w-10 justify-center rounded-md px-2' : 'rounded-full border border-gray-200 bg-white px-2.5 py-1.5 shadow-sm'"
      @click="toggleMenu"
    >
      <span
        class="flex items-center justify-center text-gray-500 transition-colors group-hover:text-primary-700"
        :class="compact ? 'h-5 w-5' : 'h-7 w-7 rounded-full bg-gray-100 group-hover:bg-primary-100'"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 3c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9zm0 0c2.38 2.45 3.75 5.76 3.75 9S14.38 18.55 12 21m0-18C9.62 5.45 8.25 8.76 8.25 12S9.62 18.55 12 21m-8.55-6h17.1M3.45 9h17.1" />
        </svg>
      </span>
      <span v-if="!compact" class="min-w-[4.5rem] text-left leading-none">{{ currentOption.label }}</span>
      <span v-else class="hidden whitespace-nowrap leading-none xl:inline">{{ currentOption.shortLabel }}</span>
      <svg
        class="text-gray-400 transition-transform duration-200"
        :class="[compact ? 'hidden h-3.5 w-3.5 xl:block' : 'h-4 w-4', { 'rotate-180': isOpen }]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="translate-y-1 scale-95 opacity-0"
      enter-to-class="translate-y-0 scale-100 opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="translate-y-0 scale-100 opacity-100"
      leave-to-class="-translate-y-1 scale-95 opacity-0"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 top-full z-[90] mt-2 w-44 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5"
        role="menu"
      >
        <button
          v-for="option in localeOptions"
          :key="option.value"
          type="button"
          class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
          :class="option.value === localeStore.locale ? 'bg-primary-50 text-primary-700' : 'text-gray-700'"
          @click="selectLocale(option.value)"
        >
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium">{{ option.label }}</span>
          </div>
          <svg
            v-if="option.value === localeStore.locale"
            class="h-4 w-4 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="m5 13 4 4L19 7" />
          </svg>
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import type { SupportedLocale } from '@/i18n'
import { useLocaleStore } from '@/stores/locale'

const { t } = useI18n()
const localeStore = useLocaleStore()

const switcherRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)

const localeOptions: ReadonlyArray<{ value: SupportedLocale; label: string; shortLabel: string }> = [
  {
    value: 'zh-CN',
    label: '简体中文',
    shortLabel: '简中'
  },
  {
    value: 'zh-TW',
    label: '繁體中文',
    shortLabel: '繁中'
  },
  {
    value: 'en',
    label: 'English',
    shortLabel: 'EN'
  }
]

const currentOption = computed(() => {
  return localeOptions.find(option => option.value === localeStore.locale) ?? localeOptions[0]
})

const toggleMenu = () => {
  isOpen.value = !isOpen.value
}

const selectLocale = (value: string) => {
  localeStore.setLocale(value)
  isOpen.value = false
}

const handleClickOutside = (event: MouseEvent) => {
  if (!switcherRef.value?.contains(event.target as Node)) {
    isOpen.value = false
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})
</script>
