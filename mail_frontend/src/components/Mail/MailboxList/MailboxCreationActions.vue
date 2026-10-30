<template>
  <div class="mailbox-creation-actions flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5">
    <button
      type="button"
      class="inline-flex min-h-7 max-w-full items-center justify-center whitespace-normal rounded-md bg-transparent px-2 py-1 text-xs font-medium leading-5 text-primary-600 transition-colors hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
      :disabled="primaryDisabled"
      @click="emit('primary')"
    >
      {{ primaryLabel }}
    </button>
    <button
      type="button"
      class="inline-flex min-h-7 max-w-full items-center justify-center whitespace-normal rounded-md bg-transparent px-2 py-1 text-xs font-medium leading-5 text-primary-600 transition-colors hover:bg-primary-50 hover:text-primary-700"
      @click="emit('custom')"
    >
      {{ customLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  primaryLabel: string
  customLabel: string
  primaryDisabled?: boolean
}>()

const emit = defineEmits<{
  primary: []
  custom: []
}>()
</script>
