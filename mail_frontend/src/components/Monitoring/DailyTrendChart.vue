<template>
  <MonitoringChart :option="option" :label="label" :height="height" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MonitoringChart from './MonitoringChart.vue'
import { buildDailyTrendOption, type TrendRow, type TrendSeries } from './dailyTrendOptions'

const props = withDefaults(
  defineProps<{
    rows: TrendRow[]
    series: TrendSeries[]
    label: string
    showValues?: boolean
    height?: number
  }>(),
  { showValues: false, height: 320 }
)
const option = computed(() =>
  props.rows.length
    ? buildDailyTrendOption(props.rows, props.series, { showValues: props.showValues })
    : null
)
</script>
