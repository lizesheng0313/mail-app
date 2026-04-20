<template>
  <div class="relative" ref="selectRef">
    <button
      type="button"
      @click="toggleDropdown"
      class="relative w-full bg-white border border-gray-300 rounded-md pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
      :class="{ 'border-primary-500 ring-2 ring-primary-500': isOpen }"
    >
      <span class="block truncate pr-2">{{ displayText }}</span>
      <span class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <svg 
          class="h-4 w-4 text-gray-400 transition-transform duration-200"
          :class="{ 'rotate-180': isOpen }"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    </button>

    <!-- 下拉选项 -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="isOpen"
          class="absolute z-10 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-sm ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none"
          :class="placement === 'top' ? 'bottom-full mb-1' : 'mt-1'"
      >
        <button
          type="button"
          v-for="option in options"
          :key="option.value"
          @click="selectOption(option)"
          class="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors focus:outline-none focus:bg-gray-100"
          :class="{ 'bg-primary-50 text-primary-700': option.value === modelValue }"
        >
          <span class="block truncate">{{ option.label }}</span>
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Option {
  label: string
  value: string | number
}

interface Props {
  modelValue: string | number
  options: Option[]
  placeholder?: string
  placement?: 'top' | 'bottom'
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择',
  placement: 'bottom'
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  'change': [value: string | number]
}>()

const isOpen = ref(false)
const selectRef = ref<HTMLElement>()

// 显示文本
const displayText = computed(() => {
  const selected = props.options.find(option => option.value === props.modelValue)
  return selected ? selected.label : props.placeholder
})

// 切换下拉状态
const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

// 选择选项
const selectOption = (option: Option) => {
  emit('update:modelValue', option.value)
  emit('change', option.value)
  isOpen.value = false
}

// 点击外部关闭
const handleClickOutside = (event: MouseEvent) => {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
