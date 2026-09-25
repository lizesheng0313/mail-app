<template>
  <button
    type="button"
    class="mailbox-header-action inline-flex h-7 shrink-0 items-center justify-center rounded-md bg-transparent px-2 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
    :class="{ 'mailbox-header-action--long': label.length > 12 }"
    :disabled="disabled"
    :aria-label="label"
    :title="label"
    @click="emit('click')"
  >
    <span class="mailbox-header-action__label whitespace-nowrap">{{ label }}</span>
    <svg class="mailbox-header-action__icon h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14" />
    </svg>
  </button>
</template>

<script setup lang="ts">
defineProps<{ label: string; disabled?: boolean }>()
const emit = defineEmits<{ click: [] }>()
</script>

<style scoped>
.mailbox-header-action__icon {
  display: none;
}

@container mailbox-header (max-width: 340px) {
  .mailbox-header-action__label {
    display: none;
  }

  .mailbox-header-action__icon {
    display: block;
  }
}

@container mailbox-header (max-width: 500px) {
  .mailbox-header-action--long .mailbox-header-action__label {
    display: none;
  }

  .mailbox-header-action--long .mailbox-header-action__icon {
    display: block;
  }
}
</style>
