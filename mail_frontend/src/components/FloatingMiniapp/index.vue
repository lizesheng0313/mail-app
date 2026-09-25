<template>
  <div
    v-if="!dismissed"
    class="rounded-xl"
    :class="panel
      ? 'relative flex shrink-0 flex-col items-center p-2 text-center'
      : inline
        ? 'relative shrink-0 border border-gray-200 bg-white p-2'
        : 'fixed bottom-24 right-4 z-40 border border-gray-200 bg-white p-2 shadow-lg sm:bottom-28 sm:right-6'"
  >
    <img
      :src="wxProgramImg"
      :alt="t('home.miniProgramQrAlt')"
      class="rounded-lg object-contain"
      :class="panel ? 'h-24 w-24' : inline ? 'h-16 w-16' : 'h-24 w-24 sm:h-28 sm:w-28'"
    />
    <div v-if="panel" class="mt-2 w-32">
      <p class="text-sm font-medium text-gray-800">{{ t('workspace.miniapp') }}</p>
      <p class="mt-0.5 text-xs leading-5 text-gray-500">{{ t('home.miniProgramCta') }}</p>
    </div>
    <p v-else class="miniapp-caption mt-1 text-center text-[11px] font-medium text-gray-600">
      {{ inline ? t('workspace.miniapp') : t('home.miniProgramCta') }}
    </p>
    <button
      v-if="!panel"
      type="button"
      :aria-label="`${t('common.close')} ${t('workspace.miniapp')}`"
      class="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm hover:text-gray-900"
      @click="dismissed = true"
    >
      <XMarkIcon class="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import wxProgramImg from '@/assets/img/wx_program.jpg'

withDefaults(defineProps<{ inline?: boolean; panel?: boolean }>(), { inline: false, panel: false })
const { t } = useI18n()
const dismissed = ref(false)
</script>
