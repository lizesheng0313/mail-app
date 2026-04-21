<template>
  <div
    class="flex h-full flex-col"
    :class="batchSelection.isBatchMode.value ? 'pb-24' : ''"
  >
    <!-- 标题栏 -->
    <div class="border-b border-gray-200 pb-4 mb-4">
      <div class="flex min-h-8 justify-between items-center flex-wrap gap-2">
        <div class="flex min-h-8 items-center flex-shrink-0">
          <h2 class="text-base font-semibold text-black whitespace-nowrap">{{ resolvedTitle }}</h2>

          <!-- 自动刷新倒计时 -->
          <div v-if="autoRefresh && autoRefresh.countdown.value > 0" class="ml-2 flex items-center text-xs text-gray-500 whitespace-nowrap">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="inline-block w-[1.75rem] tabular-nums">{{ autoRefresh.countdown.value }}s</span>
          </div>

          <div class="ml-0.5 flex items-center">
            <slot name="title-extra"></slot>
          </div>
        </div>

        <div class="flex min-h-8 min-w-8 items-center gap-1.5 flex-shrink-0 justify-end">
          <button
            v-if="!batchSelection.isBatchMode.value && emails.length > 0"
            @click="startBatchMode"
            class="inline-flex h-7 items-center justify-center rounded-md bg-transparent px-2 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-50 hover:text-primary-700"
          >
            {{ t('mail.batchAction') }}
          </button>

          <slot name="actions"></slot>
        </div>
      </div>
    </div>
    
    <!-- 搜索框 -->
    <div v-if="searchable" class="pb-3 mb-1">
      <div class="relative flex items-center">
        <svg class="absolute left-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          v-model="searchText"
          type="text"
          :placeholder="t('mail.searchEmailsPlaceholder')"
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
      <div v-if="searchText.trim()" class="mt-1.5 text-xs text-gray-400">
        {{ t('mail.searchResults', { count: emails.length }) }}
      </div>
    </div>

    <!-- 邮件列表 -->
    <div
      ref="listScrollRef"
      class="flex-1 overflow-y-auto scrollbar-stable space-y-2"
      :class="batchSelection.isBatchMode.value ? 'pb-4' : ''"
    >
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
import { computed, ref, watch, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
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
  autoRefresh?: any
  searchable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  selectedId: null,
  emptyText: '',
  showPagination: false,
  searchable: false
})
const { t } = useI18n()
const resolvedTitle = computed(() => props.title || t('mail.myEmails'))
const resolvedEmptyText = computed(() => props.emptyText || t('mail.noEmails'))

const emit = defineEmits<{
  'select': [email: Email]
  'batch-delete': [ids: number[]]
  'batch-mode-start': []
  'search': [keyword: string]
}>()

const searchText = ref('')
const showSearch = ref(false)
let searchTimer: any = null
const listScrollRef = ref<HTMLElement | null>(null)

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

const scrollToTop = () => {
  if (!listScrollRef.value) return
  listScrollRef.value.scrollTop = 0
}

defineExpose({
  cancelBatchMode,
  clearSearch,
  scrollToTop
})
</script>
