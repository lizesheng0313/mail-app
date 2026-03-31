<template>
  <div v-if="(total || 0) > 0" class="pt-4 border-t border-gray-200 mt-4 min-h-[60px] flex items-center">
    <div class="flex items-center justify-between w-full">
      <div class="text-sm text-black">
        <span>{{ t('pagination.totalItems', { total }) }}</span>
        <span class="mx-2">|</span>
        <span>{{ t('pagination.pageStatus', { current: currentPage, total: totalPages }) }}</span>
      </div>
      <div v-if="totalPages > 1" class="flex items-center gap-2">
        <button
          @click="$emit('page-change', currentPage - 1)"
          :disabled="currentPage <= 1 || loading"
          class="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          :title="t('pagination.prevPage')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>
        <button
          @click="$emit('page-change', currentPage + 1)"
          :disabled="currentPage >= totalPages || loading"
          class="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          :title="t('pagination.nextPage')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface Props {
  currentPage: number
  totalPages: number
  total?: number
  loading?: boolean
}

defineProps<Props>()

defineEmits<{
  'page-change': [page: number]
}>()

const { t } = useI18n()
</script>
