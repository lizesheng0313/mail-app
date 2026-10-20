<template>
  <div
    v-if="option"
    ref="container"
    class="monitoring-chart"
    :style="{ height: `${height}px` }"
    role="img"
    :aria-label="label"
  ></div>
  <div
    v-else
    class="monitoring-chart flex items-center justify-center text-sm text-gray-400"
    :style="{ height: `${height}px` }"
  >
    {{ emptyText }}
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

const props = withDefaults(
  defineProps<{
    option: EChartsOption | null
    label: string
    height?: number
    emptyText?: string
  }>(),
  { height: 320, emptyText: '暂无趋势数据' }
)
const container = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null
let observer: ResizeObserver | undefined
let disposed = false

const render = async () => {
  await nextTick()
  if (disposed) return
  if (!container.value || !props.option) {
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
  chart.setOption(props.option, { notMerge: true })
  chart.resize()
}

const resize = () => {
  if (chart) chart.resize()
  else void render()
}

watch([() => props.option, () => props.height], render, { deep: true })
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
