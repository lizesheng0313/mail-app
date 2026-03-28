<template>
  <div class="relative">
    <!-- 标签 -->
    <label 
      v-if="label" 
      :for="inputId" 
      class="block text-sm font-medium text-black mb-2"
    >
      <span class="flex items-center">
        <slot name="label-icon"></slot>
        {{ label }}
        <span v-if="required" class="text-red-500 ml-1">*</span>
      </span>
    </label>

    <!-- 输入框容器 -->
    <div class="relative">
      <!-- 左侧图标 -->
      <div 
        v-if="$slots['left-icon'] || leftIcon" 
        class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
      >
        <slot name="left-icon">
          <component :is="leftIcon" class="h-5 w-5 text-gray-400" />
        </slot>
      </div>

      <!-- 输入框 -->
      <input
        ref="inputRef"
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :readonly="readonly"
        :min="min"
        :max="max"
        :step="step"
        :autocomplete="autocomplete"
        :class="inputClasses"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
        @click="handleClick"
        @keyup.enter="$emit('enter')"
        v-bind="$attrs"
      />

      <!-- 右侧图标/按钮 -->
      <div 
        v-if="$slots['right-icon'] || rightIcon || showClear" 
        class="absolute inset-y-0 right-0 pr-3 flex items-center"
      >
        <!-- 清除按钮 -->
        <button
          v-if="showClear && modelValue"
          type="button"
          @click="handleClear"
          class="text-gray-400 hover:text-black transition-colors"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <!-- 自定义右侧图标 -->
        <slot name="right-icon" v-else>
          <component v-if="rightIcon" :is="rightIcon" class="h-5 w-5 text-gray-400" />
        </slot>
      </div>
    </div>

    <!-- 帮助文本/错误信息 -->
    <div v-if="helpText || errorMessage" class="mt-2">
      <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
      <p v-else-if="helpText" class="text-sm text-black">{{ helpText }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useAttrs, useSlots } from 'vue'

interface Props {
  modelValue?: string | number
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'time' | 'datetime-local'
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  min?: string | number
  max?: string | number
  step?: string | number
  autocomplete?: string
  leftIcon?: any
  rightIcon?: any
  showClear?: boolean
  autoShowPicker?: boolean
  helpText?: string
  errorMessage?: string
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  size: 'md',
  showClear: false,
  autoShowPicker: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  'blur': [event: FocusEvent]
  'focus': [event: FocusEvent]
  'click': [event: MouseEvent]
  'enter': []
  'clear': []
}>()

// 禁用属性继承到根元素
defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()
const slots = useSlots()
const inputRef = ref<HTMLInputElement | null>(null)

// 生成唯一ID
const inputId = computed(() => {
  return attrs.id as string || `input-${Math.random().toString(36).substr(2, 9)}`
})

// 计算输入框样式类
const inputClasses = computed(() => {
  const baseClasses = [
    'block w-full border border-gray-300 rounded-lg',
    'bg-white text-black placeholder-gray-500',
    'focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20',
    'transition-all duration-200',
    'disabled:bg-gray-50 disabled:text-black disabled:cursor-not-allowed',
    'readonly:bg-gray-50 readonly:cursor-default'
  ]

  // 尺寸相关的padding
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-sm',
    lg: 'px-4 py-4 text-base'
  }

  // 左右图标的padding调整
  const paddingClasses = []
  if (props.leftIcon || slots['left-icon']) {
    paddingClasses.push('pl-10')
  }
  if (props.rightIcon || slots['right-icon'] || props.showClear) {
    paddingClasses.push('pr-10')
  }

  // 错误状态样式
  const errorClasses = props.errorMessage
    ? ['border-red-300 focus:border-red-500 focus:ring-red-500']
    : []

  const dateLikeClasses = ['date', 'time', 'datetime-local'].includes(props.type)
    ? ['date-like-input min-h-[48px] cursor-pointer pr-12']
    : []

  return [
    ...baseClasses,
    sizeClasses[props.size],
    ...paddingClasses,
    ...dateLikeClasses,
    ...errorClasses
  ].join(' ')
})

// 事件处理
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = props.type === 'number' ? Number(target.value) : target.value
  emit('update:modelValue', value)
}

const handleBlur = (event: FocusEvent) => {
  emit('blur', event)
}

const handleFocus = (event: FocusEvent) => {
  emit('focus', event)
}

const handleClick = (event: MouseEvent) => {
  emit('click', event)

  if (!props.autoShowPicker || !inputRef.value) return
  if (!['date', 'time', 'datetime-local'].includes(props.type)) return

  const picker = inputRef.value as HTMLInputElement & { showPicker?: () => void }
  if (typeof picker.showPicker === 'function') {
    try {
      picker.showPicker()
    } catch {
      // 部分浏览器不支持或有限制，保留原生行为即可
    }
  }
}

const handleClear = () => {
  emit('update:modelValue', '')
  emit('clear')
}
</script>

<style scoped>
.date-like-input::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: 0.9;
  transform: scale(1.15);
}

.date-like-input::-webkit-date-and-time-value {
  min-height: 1.5rem;
}
</style>
