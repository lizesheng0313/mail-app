<template>
  <div
    class="group rounded-lg border border-transparent p-3"
    :class="[cardClass]"
    @click="$emit('click')"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 flex-1 items-center">
        <input
          v-if="batchMode"
          type="checkbox"
          :checked="checked"
          class="mailbox-checkbox mr-3 h-4 w-4 flex-shrink-0 cursor-pointer"
          @click.stop="$emit('toggle-check')"
        />
        <slot name="leading"></slot>
        <div class="flex-1 min-w-0">
          <slot></slot>
        </div>
      </div>
      <div v-if="!batchMode" class="relative flex-shrink-0">
        <slot name="actions"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    batchMode?: boolean
    checked?: boolean
    cardClass?: string | string[] | Record<string, boolean>
  }>(),
  {
    batchMode: false,
    checked: false,
    cardClass: ''
  }
)

defineEmits<{
  click: []
  'toggle-check': []
}>()
</script>

<style scoped>
.mailbox-checkbox {
  appearance: none;
  -webkit-appearance: none;
  border: 2px solid #d1d5db;
  border-radius: 3px;
  background-color: white;
  position: relative;
}

.mailbox-checkbox:checked {
  background-color: #22c55e;
  border-color: #22c55e;
}

.mailbox-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
</style>
