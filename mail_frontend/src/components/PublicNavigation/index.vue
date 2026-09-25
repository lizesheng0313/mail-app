<template>
  <nav :class="compact ? 'hidden items-center gap-4 xl:flex' : 'flex shrink-0 items-center gap-3 sm:gap-4 lg:gap-5'">
    <router-link
      v-for="item in visibleItems"
      :key="item.path"
      :to="item.path"
      class="whitespace-nowrap text-xs font-medium text-black transition-colors hover:text-primary-600 sm:text-sm"
      active-class="text-primary-600 font-semibold"
      exact-active-class="text-primary-600 font-semibold"
    >
      {{ item.label }}
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { isTauri } from '@/services/api'

const props = withDefaults(defineProps<{ compact?: boolean; guest?: boolean }>(), {
  compact: false,
  guest: false
})

const { t } = useI18n()
const visibleItems = computed(() => {
  if (props.guest) {
    return [
      ...(!isTauri() ? [{ path: '/download', label: t('pageHeader.downloadClient') }] : []),
      { path: '/about', label: t('pageHeader.about') }
    ]
  }

  return [
    { path: '/market', label: t('pageHeader.resourceMarket') },
    { path: '/open-platform', label: t('pageHeader.openPlatform') },
    ...(!isTauri() ? [{ path: '/download', label: t('pageHeader.downloadClient') }] : []),
    { path: '/about', label: t('pageHeader.about') }
  ]
})
</script>
