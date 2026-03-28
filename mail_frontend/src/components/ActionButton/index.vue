<template>
  <div class="relative inline-block" @mouseenter="handleMouseEnter" @mouseleave="showTooltip = false">
    <button 
      ref="buttonRef"
      :class="buttonClass"
      @click="handleClick"
      :disabled="disabled"
    >
      <BaseIcon :name="icon" :size="iconSize" />
      <span v-if="text" class="ml-1">{{ text }}</span>
    </button>
    
    <!-- Tooltip - 使用 fixed 定位确保不被父容器遮挡 -->
    <div 
      v-if="showTooltip && tooltip"
      class="fixed z-[9999] px-2 py-1 text-xs text-white bg-gray-800 rounded shadow-lg whitespace-nowrap pointer-events-none"
      :style="tooltipStyle"
    >
      {{ tooltip }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import BaseIcon from '../BaseIcon/index.vue'

const props = defineProps({
  icon: {
    type: String,
    required: true
  },
  tooltip: {
    type: String,
    default: ''
  },
  text: {
    type: String,
    default: ''
  },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'edit', 'delete', 'view', 'copy', 'enable', 'disable', 'primary', 'secondary', 'warning', 'success', 'danger'].includes(value)
  },
  size: {
    type: String,
    default: 'sm'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  tooltipDirection: {
    type: String,
    default: 'auto',
    validator: (value) => ['auto', 'top', 'bottom', 'left', 'right'].includes(value)
  }
})

const emit = defineEmits(['click'])

const showTooltip = ref(false)
const buttonRef = ref(null)
const tooltipStyle = ref({})

// 处理点击事件
const handleClick = (event) => {
  emit('click', event)
}

const buttonClass = computed(() => {
  const base = 'inline-flex items-center font-medium transition-colors focus:outline-none rounded'
  
  const variants = {
    default: 'text-black hover:text-black',
    edit: 'text-primary-600 hover:text-primary-900',
    delete: 'text-red-600 hover:text-red-900',
    view: 'text-black hover:text-black',
    copy: 'text-primary-600 hover:text-primary-900',
    enable: 'text-primary-600 hover:text-primary-900',
    disable: 'text-red-600 hover:text-red-900',
    primary: 'text-primary-600 hover:text-blue-900',
    secondary: 'text-black hover:text-black',
    warning: 'text-orange-600 hover:text-orange-900',
    success: 'text-green-600 hover:text-green-900',
    danger: 'text-red-600 hover:text-red-900'
  }
  
  const sizes = {
    xs: 'p-1',
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5'
  }
  
  const disabledClass = props.disabled ? 'opacity-50 cursor-not-allowed' : ''
  
  return `${base} ${variants[props.variant]} ${sizes[props.size]} ${disabledClass}`
})

const iconSize = computed(() => {
  const sizeMap = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }
  
  return sizeMap[props.size] || 'w-4 h-4'
})

// 鼠标进入时计算 tooltip 位置
const handleMouseEnter = () => {
  if (!props.tooltip || !buttonRef.value) return
  
  showTooltip.value = true
  
  // 等待下一帧确保元素已渲染
  setTimeout(() => {
    if (!buttonRef.value) return
    
    const rect = buttonRef.value.getBoundingClientRect()
    const direction = props.tooltipDirection === 'auto' ? 'top' : props.tooltipDirection
    
    let left = 0
    let top = 0
    
    switch (direction) {
      case 'top':
        left = rect.left + rect.width / 2
        top = rect.top - 8
        tooltipStyle.value = {
          left: `${left}px`,
          top: `${top}px`,
          transform: 'translate(-50%, -100%)'
        }
        break
      case 'bottom':
        left = rect.left + rect.width / 2
        top = rect.bottom + 8
        tooltipStyle.value = {
          left: `${left}px`,
          top: `${top}px`,
          transform: 'translateX(-50%)'
        }
        break
      case 'left':
        left = rect.left - 8
        top = rect.top + rect.height / 2
        tooltipStyle.value = {
          left: `${left}px`,
          top: `${top}px`,
          transform: 'translate(-100%, -50%)'
        }
        break
      case 'right':
        left = rect.right + 8
        top = rect.top + rect.height / 2
        tooltipStyle.value = {
          left: `${left}px`,
          top: `${top}px`,
          transform: 'translateY(-50%)'
        }
        break
      default:
        left = rect.left + rect.width / 2
        top = rect.top - 8
        tooltipStyle.value = {
          left: `${left}px`,
          top: `${top}px`,
          transform: 'translate(-50%, -100%)'
        }
    }
  }, 0)
}
</script>
