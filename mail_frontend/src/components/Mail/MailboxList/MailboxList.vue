<template>
  <div
    class="flex h-full flex-col"
    :class="batchSelection.isBatchMode.value ? 'pb-24' : ''"
  >
    <!-- 标题栏 -->
    <div class="border-b border-gray-200 pb-4 mb-4">
      <div class="flex min-h-8 justify-between items-center">
        <div>
          <h2 class="text-base font-semibold text-black">{{ resolvedTitle }}</h2>
          <p v-if="subtitle" class="mt-1 text-xs text-gray-500">{{ subtitle }}</p>
        </div>
        <div class="flex min-h-8 min-w-8 items-center justify-end gap-2">
          <slot name="header-actions"></slot>

          <button
            v-if="!hideBatchMode && !batchSelection.isBatchMode.value && mailboxes.length > 0"
            @click="startBatchMode"
            class="inline-flex h-7 items-center justify-center rounded-md bg-transparent px-2 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-50 hover:text-primary-700"
          >
            {{ batchActionText || t('mail.batchAction') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="searchable" class="pb-3 mb-1">
      <div class="relative flex items-center">
        <svg class="absolute left-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          v-model="searchText"
          type="text"
          :placeholder="resolvedSearchPlaceholder"
          class="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100 transition-colors"
          @input="handleSearch"
          @keyup.escape="clearSearch"
        />
        <button
          v-if="searchText"
          @click="clearSearch"
          class="absolute right-2 text-gray-400 hover:text-gray-600"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
    
    <!-- 邮箱列表 -->
    <div
      class="flex-1 overflow-y-auto scrollbar-stable space-y-2"
      :class="batchSelection.isBatchMode.value ? 'pb-4' : ''"
    >
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
          <p class="text-sm">{{ resolvedEmptyText }}</p>
        </slot>
      </div>
    </div>
    
    <!-- 分页 -->
    <div
      v-if="showPagination"
      class="mt-4"
      :class="batchSelection.isBatchMode.value ? 'mb-2' : ''"
    >
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
import { computed, ref, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBatchSelection } from '@/composables/useBatchSelection'
import MultiSelectToolbar from '@/components/MultiSelectToolbar/index.vue'

interface Mailbox {
  id: number
  email: string
  [key: string]: any
}

interface Props {
  title?: string
  subtitle?: string
  mailboxes: Mailbox[]
  selectedId?: number | null
  emptyText?: string
  showPagination?: boolean
  hideBatchMode?: boolean
  searchable?: boolean
  searchKeyword?: string
  searchPlaceholder?: string
  batchActionText?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  subtitle: '',
  selectedId: null,
  emptyText: '',
  showPagination: false,
  hideBatchMode: false,
  searchable: false,
  searchKeyword: '',
  searchPlaceholder: '',
  batchActionText: ''
})
const { t } = useI18n()
const resolvedTitle = computed(() => props.title || t('mail.myMailbox'))
const resolvedEmptyText = computed(() => props.emptyText || t('mail.noMailbox'))
const resolvedSearchPlaceholder = computed(() => props.searchPlaceholder || t('mail.searchMailboxesPlaceholder'))

const emit = defineEmits<{
  'select': [mailbox: Mailbox]
  'batch-delete': [ids: number[]]
  'batch-share': [ids: number[]]
  'batch-mode-start': []
  'search': [keyword: string]
}>()

const searchText = ref(props.searchKeyword || '')
let searchTimer: any = null

watch(
  () => props.searchKeyword,
  (value) => {
    searchText.value = value || ''
  }
)

const handleSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    emit('search', searchText.value.trim())
  }, 400)
}

const clearSearch = () => {
  searchText.value = ''
  emit('search', '')
}

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
