<template>
  <div class="flex flex-col h-full">
    <!-- 标题栏 -->
    <div class="border-b border-gray-200 pb-4 mb-4">
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2">
          <h2 class="text-base font-semibold text-black whitespace-nowrap">{{ title }}</h2>
          <slot name="title-extra"></slot>
        </div>
        <div class="flex items-center gap-2">
          <slot name="header-actions"></slot>
        </div>
      </div>
    </div>
    
    <!-- 邮件列表 -->
    <div class="flex-1 overflow-y-auto scrollbar-stable space-y-2">
      <slot name="content"></slot>
      
      <!-- 空状态 -->
      <div v-if="isEmpty" class="p-8 text-center text-gray-400">
        <slot name="empty">
          <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"></path>
          </svg>
          <p class="text-sm">{{ emptyText }}</p>
        </slot>
      </div>
    </div>
    
    <!-- 底部分页 -->
    <div v-if="showPagination" class="mt-4">
      <slot name="pagination"></slot>
    </div>
    
    <!-- 批量操作工具栏 -->
    <slot name="batch-toolbar"></slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface Props {
  title: string
  isEmpty?: boolean
  emptyText?: string
  showPagination?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isEmpty: false,
  emptyText: '',
  showPagination: false
})

const { t } = useI18n()

const emptyText = computed(() => props.emptyText || t('mail.noEmails'))
</script>
