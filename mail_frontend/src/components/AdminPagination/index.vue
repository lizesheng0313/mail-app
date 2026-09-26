<template>
  <div class="flex-shrink-0 border-t border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
    <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
      <!-- 左侧：记录信息和每页数量选择 -->
      <div class="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div class="text-sm text-black">
          共 {{ total }} 条记录，第 {{ currentPage }} / {{ totalPages }} 页
        </div>
        <div v-if="showPageSizeSelector" class="flex items-center gap-2">
          <label class="text-sm text-black">每页显示:</label>
          <div class="w-24">
            <CustomSelect
              :model-value="String(pageSize)"
              :options="pageSizeOptions"
              @update:model-value="handlePageSizeChange"
            />
          </div>
        </div>
      </div>

      <!-- 右侧：分页按钮 -->
      <div v-if="totalPages > 1" class="flex items-center space-x-2">
        <button
          @click="$emit('page-change', 1)"
          :disabled="currentPage <= 1 || loading"
          class="hidden px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50 sm:inline-flex"
        >
          首页
        </button>
        <button
          @click="$emit('page-change', currentPage - 1)"
          :disabled="currentPage <= 1 || loading"
          class="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
        >
          上一页
        </button>

        <!-- 页码数字 -->
        <div v-if="showPageNumbers" class="hidden items-center space-x-1 sm:flex">
          <template v-for="pageNum in visiblePages" :key="pageNum">
            <button
              v-if="pageNum !== '...'"
              @click="$emit('page-change', pageNum as number)"
              :class="[
                'px-3 py-1 border rounded text-sm',
                pageNum === currentPage
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'border-gray-300 hover:bg-gray-50'
              ]"
            >
              {{ pageNum }}
            </button>
            <span v-else class="px-2 text-black">...</span>
          </template>
        </div>

        <button
          @click="$emit('page-change', currentPage + 1)"
          :disabled="currentPage >= totalPages || loading"
          class="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
        >
          下一页
        </button>
        <button
          @click="$emit('page-change', totalPages)"
          :disabled="currentPage >= totalPages || loading"
          class="hidden px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50 sm:inline-flex"
        >
          末页
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CustomSelect from '../CustomSelect/index.vue'

interface Props {
  currentPage: number
  totalPages: number
  total: number
  pageSize?: number
  loading?: boolean
  showPageSizeSelector?: boolean
  showPageNumbers?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  pageSize: 20,
  loading: false,
  showPageSizeSelector: true,
  showPageNumbers: true
})

const emit = defineEmits<{
  'page-change': [page: number]
  'page-size-change': [pageSize: number]
}>()

// 每页数量选项
const pageSizeOptions = [
  { label: '20条', value: '20' },
  { label: '50条', value: '50' },
  { label: '100条', value: '100' },
  { label: '300条', value: '300' },
  { label: '500条', value: '500' }
]

// 处理每页数量变化
const handlePageSizeChange = (value: string) => {
  emit('page-size-change', parseInt(value))
}

// 获取可见的页码
const visiblePages = computed(() => {
  const current = props.currentPage
  const total = props.totalPages
  const pages: (number | string)[] = []

  if (total <= 7) {
    // 总页数少于等于7页，显示所有页码
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // 总页数大于7页，显示部分页码
    if (current <= 4) {
      // 当前页在前面
      for (let i = 1; i <= 5; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    } else if (current >= total - 3) {
      // 当前页在后面
      pages.push(1)
      pages.push('...')
      for (let i = total - 4; i <= total; i++) {
        pages.push(i)
      }
    } else {
      // 当前页在中间
      pages.push(1)
      pages.push('...')
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    }
  }

  return pages
})
</script>
