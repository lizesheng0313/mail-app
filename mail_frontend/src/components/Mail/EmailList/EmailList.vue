<template>
  <div class="flex flex-col h-full">
    <!-- 标题栏 -->
    <div class="border-b border-gray-200 pb-4 mb-4">
      <div class="flex justify-between items-center flex-wrap gap-2">
        <div class="flex items-center gap-2 flex-shrink-0">
          <h2 class="text-base font-semibold text-black whitespace-nowrap">{{ title }}</h2>

          <!-- 自动刷新倒计时 -->
          <div v-if="autoRefresh && autoRefresh.countdown.value > 0" class="flex items-center text-xs text-gray-500 whitespace-nowrap">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>{{ autoRefresh.countdown.value }}s</span>
          </div>

          <slot name="title-extra"></slot>
        </div>

        <div class="flex items-center gap-1.5 flex-shrink-0">
          <button
            v-if="!batchSelection.isBatchMode.value && emails.length > 0"
            @click="startBatchMode"
            class="px-2 py-1 text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors whitespace-nowrap"
          >
            批量操作
          </button>

          <slot name="actions"></slot>
        </div>
      </div>
    </div>
    
    <!-- 邮件列表 -->
    <div class="flex-1 overflow-y-auto scrollbar-stable space-y-2">
      <slot 
        name="content"
        :emails="emails"
        :selectedId="selectedId"
        :batchMode="batchSelection.isBatchMode.value"
        :selectedIds="batchSelection.selectedIds"
        :toggleSelection="batchSelection.toggleSelection"
        :onSelect="handleSelect"
      ></slot>
      
      <!-- 空状态 -->
      <div v-if="emails.length === 0" class="p-8 text-center text-gray-400">
        <slot name="empty">
          <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"></path>
          </svg>
          <p class="text-sm">{{ emptyText }}</p>
        </slot>
      </div>
    </div>
    
    <!-- 分页 -->
    <div v-if="showPagination" class="mt-4">
      <slot name="pagination"></slot>
    </div>
    
    <!-- 批量操作工具栏 -->
    <MultiSelectToolbar
      v-if="batchSelection.isBatchMode.value"
      type="email"
      :selectedCount="batchSelection.selectedCount.value"
      :isAllSelected="batchSelection.isAllSelected.value"
      @toggle-all="batchSelection.toggleSelectAll"
      @delete-selected="handleBatchDelete"
      @clear-selection="batchSelection.cancelBatchMode()"
    />
  </div>
</template>

<script setup lang="ts">
import { watch, toRef } from 'vue'
import { useBatchSelection } from '@/composables/useBatchSelection'
import MultiSelectToolbar from '@/components/MultiSelectToolbar/index.vue'

interface Email {
  id: number
  subject: string
  sender: string
  [key: string]: any
}

interface Props {
  title?: string
  emails: Email[]
  selectedId?: number | null
  emptyText?: string
  showPagination?: boolean
  autoRefresh?: any  // 自动刷新对象
}

const props = withDefaults(defineProps<Props>(), {
  title: '我的邮件',
  selectedId: null,
  emptyText: '暂无邮件',
  showPagination: false
})

const emit = defineEmits<{
  'select': [email: Email]
  'batch-delete': [ids: number[]]
  'batch-mode-start': []
}>()

// 批量选择逻辑 - 使用 toRef 保持响应式
const batchSelection = useBatchSelection(toRef(props, 'emails'))

// 选择邮件
const handleSelect = (email: Email) => {
  if (!batchSelection.isBatchMode.value) {
    emit('select', email)
  }
}

// 开启批量模式
const startBatchMode = () => {
  emit('batch-mode-start')  // 通知父组件，让其他批量模式关闭
  batchSelection.startBatchMode()
}

// 批量操作
const handleBatchDelete = () => {
  const ids = batchSelection.getSelectedIds()
  emit('batch-delete', ids)
  // 不要清空选中项，保持选中状态直到删除完成
}

// 暴露取消批量模式方法给父组件
const cancelBatchMode = () => {
  batchSelection.cancelBatchMode()
}

defineExpose({
  cancelBatchMode
})
</script>
