<template>
  <div class="mailbox-creation-actions shrink-0" :class="{ 'mailbox-creation-actions--long': hasLongLabels }">
    <div class="mailbox-creation-actions__wide items-center gap-1.5">
      <button
        type="button"
        class="inline-flex h-7 items-center justify-center whitespace-nowrap rounded-md bg-transparent px-2 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="primaryDisabled"
        @click="emit('primary')"
      >
        {{ primaryLabel }}
      </button>
      <button
        type="button"
        class="inline-flex h-7 items-center justify-center whitespace-nowrap rounded-md bg-transparent px-2 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-50 hover:text-primary-700"
        @click="emit('custom')"
      >
        {{ customLabel }}
      </button>
    </div>

    <details ref="compactMenu" class="mailbox-creation-actions__compact relative" @keydown.esc="closeMenu">
      <summary
        class="flex h-7 cursor-pointer list-none items-center justify-center gap-1 whitespace-nowrap rounded-md bg-transparent px-2 text-xs font-medium text-primary-600 hover:bg-primary-50 hover:text-primary-700"
        :aria-label="menuLabel"
        :title="menuLabel"
      >
        {{ menuLabel }}
        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div class="absolute right-0 top-full z-30 mt-1 min-w-32 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
        <button
          type="button"
          class="block w-full whitespace-nowrap rounded-md px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="primaryDisabled"
          @click="choose('primary')"
        >
          {{ primaryLabel }}
        </button>
        <button
          type="button"
          class="block w-full whitespace-nowrap rounded-md px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
          @click="choose('custom')"
        >
          {{ customLabel }}
        </button>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  menuLabel: string
  primaryLabel: string
  customLabel: string
  primaryDisabled?: boolean
}>()

const hasLongLabels = computed(() => props.primaryLabel.length + props.customLabel.length > 16)

const emit = defineEmits<{
  primary: []
  custom: []
}>()

const compactMenu = ref<HTMLDetailsElement | null>(null)

const closeMenu = () => {
  if (compactMenu.value) compactMenu.value.open = false
}

const choose = (action: 'primary' | 'custom') => {
  closeMenu()
  if (action === 'primary') emit('primary')
  else emit('custom')
}

const closeOnOutsideClick = (event: PointerEvent) => {
  if (compactMenu.value && !compactMenu.value.contains(event.target as Node)) closeMenu()
}

onMounted(() => document.addEventListener('pointerdown', closeOnOutsideClick))
onBeforeUnmount(() => document.removeEventListener('pointerdown', closeOnOutsideClick))
</script>

<style scoped>
.mailbox-creation-actions__wide {
  display: flex;
}

.mailbox-creation-actions__compact {
  display: none;
}

.mailbox-creation-actions--long .mailbox-creation-actions__wide {
  display: none;
}

.mailbox-creation-actions--long .mailbox-creation-actions__compact {
  display: block;
}

.mailbox-creation-actions__compact summary::-webkit-details-marker {
  display: none;
}

@container mailbox-header (max-width: 340px) {
  .mailbox-creation-actions__wide {
    display: none;
  }

  .mailbox-creation-actions__compact {
    display: block;
  }
}

@container mailbox-header (min-width: 500px) {
  .mailbox-creation-actions--long .mailbox-creation-actions__wide {
    display: flex;
  }

  .mailbox-creation-actions--long .mailbox-creation-actions__compact {
    display: none;
  }
}
</style>
