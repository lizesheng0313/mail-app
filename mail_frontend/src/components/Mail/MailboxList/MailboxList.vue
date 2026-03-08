<template>
  <div class="flex flex-col h-full">
    <!-- 标题栏 -->
    <div class="border-b border-gray-200 pb-4 mb-4">
      <div class="flex justify-between items-center">
        <h2 class="text-base font-semibold text-black">{{ title }}</h2>
        <div class="flex items-center gap-2">
          <slot name="header-actions"></slot>
          
          <button
            v-if="!hideBatchMode && !batchSelection.isBatchMode.value && mailboxes.length > 0"
            @click="startBatchMode"
            class="px-2 py-1 text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors"
          >
            批量操作
          </button>
        </div>
      </div>
    </div>
    
    <!-- 邮箱列表 -->
    <div class="flex-1 overflow-y-auto scrollbar-stable space-y-2">
      <slot
        name="content"
        :mailboxes="mailboxes"
        :selectedId="selectedId"
        :batchMode="batchSelection.isBatchMode.value"
        :selectedIds="batchSelection.selectedIds.value"
        :toggleSelection="batchSelection.toggleSelection"
        :onSelect="handleSelect"
      ></slot>
      
      <!-- 空状态 -->
      <div v-if="mailboxes.length === 0" class="p-8 text-center text-gray-400">
        <slot name="empty">
          <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
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
      type="mailbox"
      :selectedCount="batchSelection.selectedCount.value"
      :isAllSelected="batchSelection.isAllSelected.value"
      @toggle-all="batchSelection.toggleSelectAll"
      @delete-selected="handleBatchDelete"
      @share-selected="handleBatchShare"
      @clear-selection="batchSelection.cancelBatchMode()"
    />
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import { useBatchSelection } from '@/composables/useBatchSelection'
import MultiSelectToolbar from '@/components/MultiSelectToolbar/index.vue'

interface Mailbox {
  id: number
  email: string
  [key: string]: any
}

interface Props {
  title?: string
  mailboxes: Mailbox[]
  selectedId?: number | null
  emptyText?: string
  showPagination?: boolean
  hideBatchMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '我的邮箱',
  selectedId: null,
  emptyText: '暂无邮箱',
  showPagination: false,
  hideBatchMode: false
})

const emit = defineEmits<{
  'select': [mailbox: Mailbox]
  'batch-delete': [ids: number[]]
  'batch-share': [ids: number[]]
  'batch-mode-start': []
}>()

// 批量选择逻辑 - 使用 toRef 保持响应式
const batchSelection = useBatchSelection(toRef(props, 'mailboxes'))

// 选择邮箱
const handleSelect = (mailbox: Mailbox) => {
  if (!batchSelection.isBatchMode.value) {
    emit('select', mailbox)
  }
}

// 开启批量模式
const startBatchMode = () => {
  console.log('🔵 MailboxList - startBatchMode 被调用')
  emit('batch-mode-start')  // 通知父组件，让其他批量模式关闭
  batchSelection.startBatchMode()
  console.log('🔵 批量模式已开启，isBatchMode:', batchSelection.isBatchMode.value)
}

// 批量操作
const handleBatchDelete = () => {
  const ids = batchSelection.getSelectedIds()
  console.log('🔴 MailboxList基础组件 - handleBatchDelete 被调用')
  console.log('🔴 当前批量模式:', batchSelection.isBatchMode.value)
  console.log('🔴 选中的ids:', ids)
  console.log('🔴 选中数量:', ids.length)
  if (ids.length === 0) {
    console.warn('⚠️ MailboxList基础组件 - 没有选中任何项')
    return
  }
  console.log('🔴 准备触发 batch-delete 事件，ids:', ids)
  emit('batch-delete', ids)
  // 不要清空选中项，保持选中状态直到删除完成
}

// 批量分享
const handleBatchShare = () => {
  const ids = batchSelection.getSelectedIds()
  console.log('🔴 MailboxList基础组件 - handleBatchShare 被调用')
  console.log('🔴 选中的ids:', ids)
  if (ids.length === 0) {
    console.warn('⚠️ MailboxList基础组件 - 没有选中任何项')
    return
  }
  console.log('🔴 准备触发 batch-share 事件，ids:', ids)
  emit('batch-share', ids)
}

// 暴露取消批量模式方法给父组件
const cancelBatchMode = () => {
  batchSelection.cancelBatchMode()
}

defineExpose({
  cancelBatchMode,
  isBatchMode: batchSelection.isBatchMode,
  selectedIds: batchSelection.selectedIds,
  toggleSelection: batchSelection.toggleSelection
})
</script>
