<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- 弹窗内容 -->
    <div class="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
      <div class="flex items-center mb-4">
        <div class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
             :class="iconBgClass">
          <component :is="iconComponent" class="h-6 w-6" :class="iconColor" />
        </div>
        <div class="ml-4">
          <h3 class="text-lg font-medium text-black">{{ title }}</h3>
          <p class="text-sm text-black mt-1">
            {{ message }}
            <span v-if="showWarning" class="block text-red-600 mt-1">此操作无法撤销。</span>
          </p>
        </div>
      </div>

      <div class="flex justify-end space-x-3">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md disabled:opacity-50"
          :class="confirmButtonClass"
          @click="handleConfirm"
          :disabled="loading"
        >
          <span v-if="loading">{{ loadingText }}...</span>
          <span v-else>{{ confirmText }}</span>
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-black bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          @click="handleClose"
        >
          关闭
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '确认操作'
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'danger', // danger, warning, info, success
    validator: value => ['danger', 'warning', 'info', 'success'].includes(value)
  },
  confirmText: {
    type: String,
    default: '确认'
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  loading: {
    type: Boolean,
    default: false
  },
  loadingText: {
    type: String,
    default: '处理中'
  },
  showWarning: {
    type: Boolean,
    default: true
  },
  position: {
    type: String,
    default: 'center', // center, mailbox, email
    validator: value => ['center', 'mailbox', 'email'].includes(value)
  }
})

const emit = defineEmits(['confirm', 'cancel', 'update:visible'])

const iconBgClass = computed(() => {
  const classes = {
    danger: 'bg-red-100',
    warning: 'bg-yellow-100', 
    info: 'bg-primary-100',
    success: 'bg-success-100'
  }
  return classes[props.type] || classes.danger
})

const iconColor = computed(() => {
  const classes = {
    danger: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-primary-600',
    success: 'text-success-600'
  }
  return classes[props.type] || classes.danger
})

const confirmButtonClass = computed(() => {
  const classes = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-yellow-600 hover:bg-yellow-700',
    info: 'bg-primary-600 hover:bg-primary-700',
    success: 'bg-success-600 hover:bg-success-700'
  }
  return classes[props.type] || classes.danger
})

const iconComponent = computed(() => {
  return ExclamationTriangleIcon // 统一使用警告图标
})

const handleClose = () => {
  emit('cancel')
  emit('update:visible', false)
}

const handleConfirm = () => {
  // 不再自动关闭对话框，由父组件通过 :loading 状态控制
  // 父组件完成操作后自己关闭对话框
  if (props.loading) {
    return // 如果正在加载，不响应点击
  }
  emit('confirm')
  // 移除自动关闭，让父组件在操作完成后关闭
  // emit('update:visible', false)
}

const handleCancel = () => {
  emit('cancel')
  emit('update:visible', false)
}
</script>