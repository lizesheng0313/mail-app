<template>
  <article class="monitoring-metric">
    <p class="monitoring-metric-label">{{ label }}</p>
    <p class="monitoring-metric-value" :class="valueClass || 'text-gray-900'">{{ value ?? 0 }}</p>
  </article>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    value?: number | string | null
    valueClass?: string
  }>(),
  {
    valueClass: ''
  }
)
</script>

<style scoped>
.monitoring-metric {
  @apply flex min-w-0 flex-col py-1;
}

.monitoring-metric-label {
  @apply text-sm font-medium leading-5 text-gray-600;
  overflow-wrap: anywhere;
}

.monitoring-metric-value {
  @apply mt-2 text-3xl font-semibold leading-9;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
</style>
