<template>
  <Popover as="div" class="relative inline-flex" v-slot="{ open }">
    <PopoverButton
      type="button"
      :disabled="disabled"
      :title="label"
      :aria-label="label"
      class="inline-flex h-7 shrink-0 items-center justify-center gap-0.5 rounded px-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-35"
      :class="{ 'bg-primary-50 text-primary-700': open || active }"
      @click="position"
      @keydown="position"
    >
      <component :is="icon" class="h-4 w-4" aria-hidden="true" />
      <ChevronDownIcon class="h-3 w-3" aria-hidden="true" />
    </PopoverButton>
    <Portal>
      <PopoverPanel
        :style="menuStyle"
        :aria-label="label"
        class="fixed z-[250] w-60 max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain rounded-lg border border-gray-200 bg-white p-1 shadow-lg focus:outline-none"
        v-slot="{ close }"
      >
        <slot :close="close" />
      </PopoverPanel>
    </Portal>
  </Popover>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Component } from 'vue'
import { Popover, PopoverButton, PopoverPanel, Portal } from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/24/outline'

defineProps<{ label: string; icon: Component; disabled?: boolean; active?: boolean }>()
const emit = defineEmits<{ open: [] }>()
const menuStyle = ref<Record<string, string>>({})
const position = (event: Event) => {
  emit('open')
  const element = event.currentTarget as HTMLElement | null
  if (!element) return
  const rect = element.getBoundingClientRect()
  const below = window.innerHeight - rect.bottom - 12
  const above = rect.top - 12
  const upwards = below < 240 && above > below
  menuStyle.value = {
    left: `${Math.max(8, Math.min(rect.left, window.innerWidth - 248))}px`,
    maxHeight: `${Math.min(384, Math.max(96, upwards ? above : below))}px`,
    ...(upwards
      ? { bottom: `${window.innerHeight - rect.top + 4}px` }
      : { top: `${rect.bottom + 4}px` })
  }
}
</script>
