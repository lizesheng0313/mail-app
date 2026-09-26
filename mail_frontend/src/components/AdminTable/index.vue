<template>
  <div class="min-w-0 bg-white rounded-lg shadow-sm border flex-1 flex flex-col overflow-hidden">
    <!-- 标题区域 -->
    <div v-if="title" class="px-4 py-4 border-b border-gray-200 sm:px-6">
      <h2 class="text-xl font-semibold text-black">{{ title }}</h2>
    </div>
    
    <!-- 表格容器 -->
    <div class="flex-1 overflow-hidden">
      <div class="h-full overflow-auto" tabindex="0" aria-label="数据表格，可左右滑动查看完整内容">
        <table class="min-w-[640px] divide-y divide-gray-200 sm:min-w-full">
          <thead class="bg-gray-50 sticky top-0">
            <tr>
              <th 
                v-for="column in columns" 
                :key="column.key"
                :class="column.class"
                class="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider"
              >
                {{ column.label }}
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading" class="hover:bg-gray-50">
              <td :colspan="columns.length" class="px-6 py-12 text-center text-black">
                <div class="inline-flex items-center">
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-success-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  加载中...
                </div>
              </td>
            </tr>
            <tr v-else-if="!data || data.length === 0" class="hover:bg-gray-50">
              <td :colspan="columns.length" class="px-6 py-12 text-center text-black">
                {{ emptyText }}
              </td>
            </tr>
            <template v-else>
              <tr v-for="(item, index) in data" :key="item.id || index" class="hover:bg-gray-50">
                <td 
                  v-for="column in columns" 
                  :key="column.key"
                  class="px-6 py-4 whitespace-nowrap"
                  :class="column.cellClass"
                >
                  <slot :name="`cell-${column.key}`" :item="item" :value="item[column.key]" :column="column">
                    <span v-html="formatCellValue(item[column.key], column, item)"></span>
                  </slot>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 分页 -->
    <AdminPagination 
      v-if="pagination && pagination.total > 0"
      :current-page="pagination.page || pagination.currentPage"
      :total-pages="pagination.pages || pagination.totalPages"
      :total="pagination.total"
      :page-size="pagination.limit || pagination.pageSize"
      :loading="loading"
      :show-page-size-selector="showPageSizeSelector"
      @page-change="$emit('page-change', $event)"
      @page-size-change="$emit('page-size-change', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import AdminPagination from '../AdminPagination/index.vue'

interface Column {
  key: string
  label: string
  class?: string
  cellClass?: string
  formatter?: (value: any, item?: any) => string
  width?: string
}

interface Props {
  title?: string
  columns: Column[]
  data?: any[]
  pagination?: any
  loading?: boolean
  emptyText?: string
  showPageSizeSelector?: boolean
}

withDefaults(defineProps<Props>(), {
  loading: false,
  emptyText: '暂无数据',
  showPageSizeSelector: false
})

defineEmits<{
  'page-change': [page: number]
  'page-size-change': [pageSize: number]
}>()

// 格式化单元格值
const formatCellValue = (value: any, column: Column, item?: any) => {
  if (column.formatter) {
    return column.formatter(value, item)
  }
  if (value === null || value === undefined) {
    return '-'
  }
  return value
}
</script>
