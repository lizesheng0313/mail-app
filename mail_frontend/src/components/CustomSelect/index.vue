<template>
  <div ref="selectRef" class="relative">
    <button
      type="button"
      :aria-expanded="isOpen"
      :disabled="disabled"
      @click="toggleDropdown"
      :class="[buttonClass, { 'border-primary-500 ring-2 ring-primary-500': isOpen && !disabled }]"
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

    <Teleport to="body">
      <transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="scale-95 opacity-0"
        enter-to-class="scale-100 opacity-100"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="scale-100 opacity-100"
        leave-to-class="scale-95 opacity-0"
      >
        <div
          v-if="isOpen"
          ref="dropdownRef"
          class="fixed z-[9999] max-h-60 overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none"
          :style="dropdownStyle"
        >
          <button
            v-for="option in options"
            :key="option.value"
            type="button"
            class="w-full px-3 py-2 text-left transition-colors hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
            :class="{ 'bg-primary-50 text-primary-700': option.value === modelValue }"
            @click="selectOption(option)"
          >
            <span class="block truncate">{{ option.label }}</span>
          </button>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'

interface Option {
  label: string
  value: string | number
}

interface Props {
  modelValue: string | number
  options: Option[]
  placeholder?: string
  placement?: 'top' | 'bottom'
  size?: 'md' | 'sm'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择',
  placement: 'bottom',
  size: 'md',
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  'change': [value: string | number]
}>()

const isOpen = ref(false)
const selectRef = ref<HTMLElement>()
const dropdownRef = ref<HTMLElement>()
const dropdownStyle = ref<Record<string, string>>({})

const buttonClass = computed(() => {
  const disabledClass = props.disabled ? 'cursor-not-allowed bg-gray-50 text-gray-500 opacity-75' : 'cursor-pointer bg-white'
  if (props.size === 'sm') {
    return `relative h-10 w-full rounded-lg border border-gray-300 pl-3 pr-9 text-left text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${disabledClass}`
  }
  return `relative h-[46px] w-full rounded-lg border border-gray-300 pl-4 pr-10 text-left text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${disabledClass}`
})

// 显示文本
const displayText = computed(() => {
  const selected = props.options.find(option => option.value === props.modelValue)
  return selected ? selected.label : props.placeholder
})

// 切换下拉状态
const updateDropdownPosition = () => {
  if (!isOpen.value || !selectRef.value) return
  const rect = selectRef.value.getBoundingClientRect()
  const dropdownHeight = dropdownRef.value?.offsetHeight || 240
  const spaceBelow = window.innerHeight - rect.bottom
  const shouldOpenTop = props.placement === 'top' || (spaceBelow < dropdownHeight + 8 && rect.top > spaceBelow)
  const top = shouldOpenTop
    ? Math.max(8, rect.top - dropdownHeight - 4)
    : Math.min(window.innerHeight - 8, rect.bottom + 4)

  dropdownStyle.value = {
    left: `${Math.max(8, rect.left)}px`,
    top: `${top}px`,
    width: `${rect.width}px`,
    transformOrigin: shouldOpenTop ? 'bottom' : 'top'
  }
}

const toggleDropdown = async () => {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    await nextTick()
    updateDropdownPosition()
  }
}

// 选择选项
const selectOption = (option: Option) => {
  if (props.disabled) return
  emit('update:modelValue', option.value)
  emit('change', option.value)
  isOpen.value = false
}

// 点击外部关闭
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node
  if (
    selectRef.value
    && !selectRef.value.contains(target)
    && !dropdownRef.value?.contains(target)
  ) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('resize', updateDropdownPosition)
  window.addEventListener('scroll', updateDropdownPosition, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', updateDropdownPosition)
  window.removeEventListener('scroll', updateDropdownPosition, true)
})
</script>
