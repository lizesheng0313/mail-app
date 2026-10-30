<template>
  <button
    ref="buttonRef"
    type="button"
    class="inline-flex shrink-0 items-center rounded p-1 text-gray-500 transition-colors hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
    :disabled="loading || disabled"
    :aria-label="loading ? t('home.refreshing') : t('home.refreshNow')"
    :aria-busy="loading"
    @mouseenter="showTooltip"
    @mouseleave="hideTooltip"
    @focus="showTooltip"
    @blur="hideTooltip"
    @keydown.esc="hideTooltip"
    @click="handleRefresh"
  >
    <BaseIcon name="refresh" size="sm" :class="{ 'animate-spin': loading }" />
  </button>

  <Teleport to="body">
    <div
      v-if="tooltipVisible && !loading && !disabled"
      role="tooltip"
      class="pointer-events-none fixed z-[9999] whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white shadow-sm"
      :style="tooltipStyle"
    >
      {{ t('home.refreshNow') }}
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseIcon from '@/components/BaseIcon/index.vue'

const props = withDefaults(defineProps<{ loading?: boolean; disabled?: boolean }>(), {
  loading: false,
  disabled: false
})
const emit = defineEmits<{ refresh: [] }>()
const { t } = useI18n()
const buttonRef = ref<HTMLButtonElement | null>(null)
const tooltipVisible = ref(false)
const tooltipStyle = ref<Record<string, string>>({})

const showTooltip = () => {
  if (props.loading || props.disabled || !buttonRef.value) return
  const rect = buttonRef.value.getBoundingClientRect()
  tooltipStyle.value = {
    left: `${rect.left + rect.width / 2}px`,
    top: `${rect.top - 8}px`,
    transform: 'translate(-50%, -100%)'
  }
  tooltipVisible.value = true
}

const hideTooltip = () => {
  tooltipVisible.value = false
}

const handleRefresh = () => {
  if (props.loading || props.disabled) return
  hideTooltip()
  emit('refresh')
}
</script>
