<template>
  <div 
    class="fixed bottom-6 z-40 transform -translate-x-1/2"
    :class="positionClass"
  >
    <div class="bg-white rounded-lg shadow-xl border border-gray-200 px-6 py-4 flex items-center space-x-4 min-w-[400px]">
      <!-- 选中信息 -->
      <div class="flex items-center space-x-2">
        <div class="w-5 h-5 bg-primary-100 rounded-full flex items-center justify-center">
          <svg class="w-3 h-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <span class="text-sm font-medium text-black">
          已选择 <span class="text-primary-600 font-semibold inline-block w-6 text-center">{{ selectedCount }}</span> 个{{ type === 'mailbox' ? '邮箱' : '邮件' }}
        </span>
      </div>

      <!-- 操作按钮 -->
      <div class="flex items-center space-x-3">
        <!-- 全选/取消全选 -->
        <button
          @click="$emit('toggle-all')"
          class="px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-white hover:bg-primary-600 border border-primary-600 rounded-md transition-colors whitespace-nowrap"
        >
          {{ isAllSelected ? '取消全选' : '全选' }}
        </button>

        <!-- 批量分享（仅邮箱） -->
        <button
          v-if="type === 'mailbox'"
          @click="handleShareClick"
          :disabled="loading || selectedCount === 0"
          class="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
          </svg>
          <span>批量分享</span>
        </button>

        <!-- 批量操作 -->
        <button
          @click="handleDeleteClick"
          :disabled="loading || selectedCount === 0"
          class="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <svg v-if="loading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
          <span>{{ loading ? '删除中...' : '批量操作' }}</span>
        </button>

        <!-- 关闭批量模式（圆形 X 按钮） -->
        <button
          @click="handleCloseClick"
          class="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:text-gray-800 transition-colors"
          style="background-color: rgb(225 228 234)"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

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

const handleCloseClick = () => {
  emit('clear-selection')
}

// 处理删除按钮点击
const handleDeleteClick = () => {
  console.log('🟣 MultiSelectToolbar - 批量操作按钮被点击')
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