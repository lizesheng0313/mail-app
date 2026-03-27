<template>
  <div
    ref="triggerRef"
    class="inline-flex"
    @mouseenter="showTooltip"
    @mouseleave="hideTooltip"
    @focusin="showTooltip"
    @focusout="hideTooltip"
  >
    <slot />
  </div>

  <Teleport to="body">
    <div
      v-if="visible && text"
      class="pointer-events-none fixed z-[9999] whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white shadow-sm"
      :style="tooltipStyle"
    >
      {{ text }}
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'

type Placement = 'top' | 'bottom' | 'left' | 'right'

const props = withDefaults(defineProps<{
  text?: string
  placement?: Placement
}>(), {
  text: '',
  placement: 'top'
})

const visible = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const tooltipStyle = ref<Record<string, string>>({})

const updateTooltipPosition = () => {
  if (!triggerRef.value) return

  const rect = triggerRef.value.getBoundingClientRect()
  const gap = 8

  switch (props.placement) {
    case 'bottom':
      tooltipStyle.value = {
        left: `${rect.left + rect.width / 2}px`,
        top: `${rect.bottom + gap}px`,
        transform: 'translateX(-50%)'
      }
      return
    case 'left':
      tooltipStyle.value = {
        left: `${rect.left - gap}px`,
        top: `${rect.top + rect.height / 2}px`,
        transform: 'translate(-100%, -50%)'
      }
      return
    case 'right':
      tooltipStyle.value = {
        left: `${rect.right + gap}px`,
        top: `${rect.top + rect.height / 2}px`,
        transform: 'translateY(-50%)'
      }
      return
    default:
      tooltipStyle.value = {
        left: `${rect.left + rect.width / 2}px`,
        top: `${rect.top - gap}px`,
        transform: 'translate(-50%, -100%)'
      }
  }
}

const showTooltip = async () => {
  if (!props.text) return
  visible.value = true
  await nextTick()
  updateTooltipPosition()
}

const hideTooltip = () => {
  visible.value = false
}
</script>
