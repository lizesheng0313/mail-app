<template>
  <MonitoringChart
    :option="option"
    :height="Math.max(320, providers.length * 58 + 52)"
    label="邮箱公司接入数量"
    empty-text="所选周期暂无第三方邮箱接入数据"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MonitoringChart from './MonitoringChart.vue'
import { buildProviderBarOption, type MailboxProvider } from './providerBarOptions'

const props = defineProps<{ providers: MailboxProvider[] }>()
const option = computed(() =>
  props.providers.length ? buildProviderBarOption(props.providers) : null
)
</script>
