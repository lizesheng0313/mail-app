<template>
  <div
    v-if="rows.length"
    ref="container"
    class="monitoring-chart"
    role="img"
    :aria-label="label"
  ></div>
  <div v-else class="monitoring-chart flex items-center justify-center text-sm text-gray-400">
    暂无趋势数据
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { buildDailyTrendOption, type TrendRow, type TrendSeries } from './dailyTrendOptions'

const props = defineProps<{ rows: TrendRow[]; series: TrendSeries[]; label: string }>()
const container = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null
let observer: ResizeObserver | undefined
let disposed = false

const render = async () => {
  await nextTick()
  if (disposed) return
  if (!container.value || !props.rows.length) {
    chart?.dispose()
    chart = null
    return
  }
  if (chart && chart.getDom() !== container.value) {
    chart.dispose()
    chart = null
  }
  if (!container.value.clientWidth) return
  if (!chart) chart = echarts.init(container.value)
  chart.setOption(buildDailyTrendOption(props.rows, props.series), { notMerge: true })
  chart.resize()
}

const resize = () => {
  if (chart) chart.resize()
  else void render()
}

watch([() => props.rows, () => props.series], render, { deep: true })
watch(container, (element) => {
  observer?.disconnect()
  if (element) observer?.observe(element)
})

onMounted(() => {
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(resize)
    if (container.value) observer.observe(container.value)
  }
  window.addEventListener('resize', resize)
  void render()
})

onUnmounted(() => {
  disposed = true
  observer?.disconnect()
  window.removeEventListener('resize', resize)
  chart?.dispose()
  chart = null
})
</script>
