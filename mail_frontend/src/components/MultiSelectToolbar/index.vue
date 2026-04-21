<template>
  <Teleport to="body">
    <div
      class="fixed bottom-5 z-[10050] -translate-x-1/2"
      :class="positionClass"
    >
      <div class="flex min-w-[220px] items-center gap-2 rounded-2xl border border-gray-200 bg-white/95 px-3 py-2 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur-sm">
        <div class="flex items-center gap-2 pr-2">
          <div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100">
            <svg class="h-3.5 w-3.5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <span class="text-sm font-medium text-black whitespace-nowrap">
            {{ selectedSummary }}
          </span>
        </div>
        <div class="h-6 w-px bg-gray-200"></div>
        <div class="flex items-center gap-1">
          <button
            @click="$emit('toggle-all')"
            class="toolbar-action-button text-gray-600 hover:bg-primary-50 hover:text-primary-700"
            :title="isAllSelected ? t('mailToolbar.deselectAll') : t('mailToolbar.selectCurrentList')"
          >
            <svg
              v-if="isAllSelected"
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 12h12" />
            </svg>
            <svg
              v-else
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ isAllSelected ? t('mailToolbar.deselectAll') : t('mailToolbar.selectAll') }}</span>
          </button>
          <button
            v-if="type === 'mailbox'"
            @click="handleShareClick"
            :disabled="loading || selectedCount === 0"
            class="toolbar-action-button text-primary-600 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
            :title="t('mailToolbar.batchShare')"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
            </svg>
            <span>{{ t('mailToolbar.share') }}</span>
          </button>
          <button
            @click="handleDeleteClick"
            :disabled="loading || selectedCount === 0"
            class="toolbar-action-button text-red-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            :title="loading ? t('mailToolbar.deleting') : t('mailToolbar.batchDelete')"
          >
            <svg v-if="loading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
            <span>{{ loading ? t('mailToolbar.deleting') : t('mailToolbar.delete') }}</span>
          </button>
          <button
            @click="handleCloseClick"
            class="toolbar-icon-button text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            :title="t('mailToolbar.exitBatch')"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  selectedCount: number
  isAllSelected: boolean
  type: 'mailbox' | 'email'
  loading?: boolean
  position?: 'mailbox' | 'email' | 'center'
}>()

const emit = defineEmits<{
  'toggle-all': []
  'delete-selected': []
  'share-selected': []
  'clear-selection': []
}>()

const selectedSummary = computed(() => (
  props.type === 'mailbox'
    ? t('mailToolbar.selectedMailboxes', { count: props.selectedCount })
    : t('mailToolbar.selectedEmails', { count: props.selectedCount })
))

const handleCloseClick = () => {
  emit('clear-selection')
}

// 处理删除按钮点击
const handleDeleteClick = () => {
  console.log('🟣 MultiSelectToolbar - 批量删除按钮被点击')
  console.log('🟣 selectedCount:', props.selectedCount)
  console.log('🟣 type:', props.type)
  console.log('🟣 准备触发 delete-selected 事件')
  emit('delete-selected')
  console.log('🟣 delete-selected 事件已触发')
}

// 处理分享按钮点击
const handleShareClick = () => {
  console.log('🟣 MultiSelectToolbar - 批量分享按钮被点击')
  console.log('🟣 selectedCount:', props.selectedCount)
  console.log('🟣 准备触发 share-selected 事件')
  emit('share-selected')
  console.log('🟣 share-selected 事件已触发')
}

// 根据 position 计算定位类名 - 统一居中显示
const positionClass = computed(() => {
  return 'left-1/2'
})
</script>

<style scoped>
.toolbar-action-button {
  display: inline-flex;
  height: 2rem;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  border-radius: 9999px;
  padding: 0 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.toolbar-icon-button {
  display: inline-flex;
  height: 2rem;
  width: 2rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  transition: all 0.2s ease;
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translate(-50%, 20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
</style>
