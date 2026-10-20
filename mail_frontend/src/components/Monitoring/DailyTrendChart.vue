<template>
  <MonitoringChart :option="option" :label="label" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MonitoringChart from './MonitoringChart.vue'
import { buildDailyTrendOption, type TrendRow, type TrendSeries } from './dailyTrendOptions'

const props = defineProps<{ rows: TrendRow[]; series: TrendSeries[]; label: string }>()
const option = computed(() =>
  props.rows.length ? buildDailyTrendOption(props.rows, props.series) : null
)
</script>
