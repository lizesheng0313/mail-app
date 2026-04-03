<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto px-4 py-20 sm:py-10"
        @click.self="handleBackdropClick"
      >
        <!-- 背景遮罩 -->
        <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>

        <!-- 弹窗内容 -->
        <div
          class="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[calc(100vh-5rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col"
          :class="sizeClass"
        >
          <!-- 头部 -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">
              {{ resolvedTitle }}
            </h3>
            <button
              v-if="showClose"
              @click="handleClose"
              class="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- 内容区域 -->
          <div class="px-6 py-4 overflow-y-auto flex-1">
            <slot></slot>
          </div>

          <!-- 底部按钮 -->
          <div v-if="showFooter" class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
            <button
              v-if="showCancel"
              @click="handleCancel"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              {{ resolvedCancelText }}
            </button>
            <button
              v-if="showConfirm"
              @click="handleConfirm"
              class="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              :class="{ 'opacity-50 cursor-not-allowed': confirmLoading || confirmDisabled }"
              :disabled="confirmLoading || confirmDisabled"
            >
              <span v-if="confirmLoading" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
              {{ resolvedConfirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg', 'xl', 'full'].includes(value)
  },
  showClose: {
    type: Boolean,
    default: true
  },
  showFooter: {
    type: Boolean,
    default: true
  },
  showCancel: {
    type: Boolean,
    default: true
  },
  showConfirm: {
    type: Boolean,
    default: true
  },
  cancelText: {
    type: String,
    default: ''
  },
  confirmText: {
    type: String,
    default: ''
  },
  confirmLoading: {
    type: Boolean,
    default: false
  },
  confirmDisabled: {
    type: Boolean,
    default: false
  },
  closeOnClickOutside: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel', 'close'])

const resolvedTitle = computed(() => props.title || t('common.tip'))
const resolvedCancelText = computed(() => props.cancelText || t('common.cancel'))
const resolvedConfirmText = computed(() => props.confirmText || t('common.confirm'))

const sizeClass = computed(() => {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-[95vw]'
  }
  return sizes[props.size]
})

const handleClose = () => {
  emit('update:modelValue', false)
  emit('close')
}

const handleCancel = () => {
  emit('cancel')
  handleClose()
}

const handleConfirm = () => {
  emit('confirm')
}

const handleBackdropClick = () => {
  if (props.closeOnClickOutside) {
    handleClose()
  }
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from .relative {
  transform: scale(0.95);
  opacity: 0;
}

.modal-leave-to .relative {
  transform: scale(0.95);
  opacity: 0;
}
</style>
