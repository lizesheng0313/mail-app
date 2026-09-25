<template>
  <footer :class="embedded ? '' : 'border-t border-gray-100 bg-white'">
    <div
      :class="[
        'text-xs text-gray-500',
        embedded ? '' : 'mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8'
      ]"
    >
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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

      <nav class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400" :aria-label="t('mail.footerTools')">
        <RouterLink to="/tools/2fa-code" class="transition-colors hover:text-primary-600">
          {{ t('mail.footerTool2fa') }}
        </RouterLink>
      </nav>
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
