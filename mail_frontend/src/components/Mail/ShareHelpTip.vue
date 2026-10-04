<template>
  <span class="inline-flex align-middle">
    <button
      ref="triggerRef"
      type="button"
      class="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-xs font-semibold text-gray-600 hover:border-primary-500 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200"
      :aria-label="text"
      :aria-expanded="visible"
      @mouseenter="show"
      @mouseleave="hideUnlessPinned"
      @focus="show"
      @blur="close"
      @click.stop="togglePinned"
      @keydown.esc.stop="close"
    >
      ?
    </button>
  </span>

  <Teleport to="body">
    <div
      v-if="visible"
      ref="tooltipRef"
      role="tooltip"
      class="pointer-events-none fixed z-[11020] w-72 max-w-[calc(100vw-2rem)] whitespace-normal rounded-lg bg-gray-900 px-3 py-2 text-sm leading-5 text-white shadow-lg"
      :style="position"
    >
      {{ text }}
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'

defineProps<{ text: string }>()

const triggerRef = ref<HTMLButtonElement | null>(null)
const tooltipRef = ref<HTMLElement | null>(null)
const visible = ref(false)
const pinned = ref(false)
const position = ref({ top: '0px', left: '0px' })

const show = async () => {
  visible.value = true
  await nextTick()
  if (!triggerRef.value || !tooltipRef.value) return

  const trigger = triggerRef.value.getBoundingClientRect()
  const tooltip = tooltipRef.value.getBoundingClientRect()
  const margin = 16
  const left = Math.max(margin, Math.min(
    trigger.left + trigger.width / 2 - tooltip.width / 2,
    window.innerWidth - tooltip.width - margin
  ))
  const below = trigger.bottom + 8
  const top = below + tooltip.height <= window.innerHeight - margin
    ? below
    : Math.max(margin, trigger.top - tooltip.height - 8)
  position.value = { top: `${top}px`, left: `${left}px` }
}

const close = () => {
  pinned.value = false
  visible.value = false
}

const hideUnlessPinned = () => {
  if (!pinned.value && document.activeElement !== triggerRef.value) visible.value = false
}

const togglePinned = () => {
  pinned.value = !pinned.value
  if (pinned.value) void show()
  else visible.value = false
}
</script>
