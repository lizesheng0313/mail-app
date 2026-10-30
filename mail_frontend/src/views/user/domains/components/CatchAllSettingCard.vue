<template>
  <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
    <div class="flex items-center justify-between gap-4">
      <div class="min-w-0 flex-1 text-sm font-medium text-black">{{ t('domainsPage.catchAllTitle') }}</div>
      <button
        type="button"
        role="switch"
        :aria-checked="enabled"
        :aria-label="t('domainsPage.catchAllTitle')"
        class="relative inline-block h-6 w-11 flex-shrink-0 cursor-pointer"
        @click="emit('update:enabled', !enabled)"
      >
        <div
          class="block h-6 w-11 rounded-full transition-colors duration-200 ease-in-out"
          :class="enabled ? 'bg-primary-600' : 'bg-gray-300'"
        >
          <div
            class="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ease-in-out"
            :class="{ 'translate-x-5': enabled }"
          ></div>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{ enabled: boolean }>()

const emit = defineEmits<{
  (e: 'update:enabled', value: boolean): void
}>()
const { t } = useI18n()
</script>
