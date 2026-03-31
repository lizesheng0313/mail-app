<template>
  <div class="bg-white rounded-lg shadow-sm border flex-1 flex flex-col overflow-hidden">
    <!-- 标题区域 -->
    <div v-if="title || $slots.header" class="px-6 py-4 border-b border-gray-200">
      <slot name="header">
        <h2 class="text-xl font-semibold text-black">{{ title }}</h2>
      </slot>
    </div>
    
    <!-- 表格容器 -->
    <div class="flex-1 overflow-hidden">
      <div class="h-full overflow-y-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50 sticky top-0">
            <slot name="thead" />
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading">
              <td :colspan="columnCount" class="px-6 py-12 text-center text-black">
                <div class="inline-flex items-center">
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-success-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ t('adminDataTable.loading') }}
                </div>
              </td>
            </tr>
            <slot v-else name="tbody" />
          </tbody>
        </table>
      </div>
    </div>

    <!-- 分页 -->
    <AdminPagination
      v-if="pagination"
      :current-page="pagination.page || pagination.currentPage || 1"
      :total-pages="pagination.pages || pagination.totalPages || pagination.total_pages || 1"
      :total="pagination.total || 0"
      :page-size="pagination.limit || pagination.pageSize || pagination.page_size || 20"
      :loading="loading"
      :show-page-size-selector="showPageSizeSelector"
      @page-change="$emit('page-change', $event)"
      @page-size-change="$emit('page-size-change', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AdminPagination from '../AdminPagination/index.vue'

interface Props {
  title?: string
  pagination?: any
  loading?: boolean
  showPageSizeSelector?: boolean
  columnCount?: number
}

withDefaults(defineProps<Props>(), {
  loading: false,
  showPageSizeSelector: false,
  columnCount: 1
})

const { t } = useI18n()

defineEmits<{
  'page-change': [page: number]
  'page-size-change': [pageSize: number]
}>()
</script>
