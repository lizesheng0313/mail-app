/**
 * 规则构建器组件 - 可视化配置触发器规则
 */
<template>
  <div class="rule-builder">
    <!-- 规则组 -->
    <RuleGroup 
      v-model="rules"
      :level="0"
      @update="$emit('update:modelValue', rules)"
    />

  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import RuleGroup from '../RuleGroup/index.vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      logic: 'and',
      conditions: []
    })
  }
})

const emit = defineEmits(['update:modelValue'])

const rules = ref(props.modelValue)

// 监听props变化
watch(() => props.modelValue, (newValue) => {
  rules.value = newValue
}, { deep: true })
</script>

<style scoped>
.rule-builder {
  @apply space-y-4;
}
</style>
