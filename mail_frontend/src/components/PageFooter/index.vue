<template>
  <footer :class="embedded ? '' : 'border-t border-gray-100 bg-white'">
    <div
      :class="[
        'flex flex-col gap-2 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between',
        embedded ? '' : 'mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8'
      ]"
    >
      <div>{{ t('mail.footerServiceName') }}</div>
      <div class="flex items-center gap-3">
        <RouterLink to="/privacy-policy" class="transition-colors hover:text-primary-600">
          {{ t('legal.privacyTitle') }}
        </RouterLink>
        <span class="text-gray-300">|</span>
        <RouterLink to="/terms-of-service" class="transition-colors hover:text-primary-600">
          {{ t('legal.termsTitle') }}
        </RouterLink>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

withDefaults(defineProps<{ embedded?: boolean }>(), {
  embedded: false
})

const { t } = useI18n()
</script>
