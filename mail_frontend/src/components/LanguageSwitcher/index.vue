<template>
  <div class="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white/90 p-1 shadow-sm backdrop-blur">
    <button
      type="button"
      class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
      :class="localeStore.locale === 'zh-CN' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'"
      @click="localeStore.setLocale('zh-CN')"
    >
      {{ t('common.chinese') }}
    </button>
    <button
      type="button"
      class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
      :class="localeStore.locale === 'en' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'"
      @click="localeStore.setLocale('en')"
    >
      {{ t('common.english') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { useLocaleStore } from '@/stores/locale'

const { t } = useI18n()
const localeStore = useLocaleStore()
</script>
