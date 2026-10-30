<template>
  <button
    type="button"
    class="mailbox-header-action inline-flex min-h-7 min-w-0 max-w-full shrink-0 items-center justify-center rounded-md bg-transparent px-2 py-1 text-xs font-medium leading-5 text-primary-600 transition-colors hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
    :disabled="disabled"
    :aria-label="label"
    :title="label"
    @click="emit('click')"
  >
    <span class="whitespace-normal break-words">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
defineProps<{ label: string; disabled?: boolean }>()
const emit = defineEmits<{ click: [] }>()
</script>
