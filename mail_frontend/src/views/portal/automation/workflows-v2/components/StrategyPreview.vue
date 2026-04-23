<template>
  <div class="strategy-preview text-xs">
    <div v-if="!strategy || !strategy.type" class="text-gray-400">无策略</div>

    <div v-else-if="strategy.type === 'fixed'" class="text-gray-600">
      固定值：<span class="font-medium">{{ strategy.value || '(空)' }}</span>
    </div>

    <div v-else-if="strategy.type === 'variable'" class="text-purple-600">
      引用变量：<code class="bg-purple-50 px-1 rounded">{{ '{{' + (strategy.var_name || '?') + '}}' }}</code>
    </div>

    <div v-else-if="strategy.type === 'random_from_list'" class="text-amber-600">
      随机选一条
      <span v-if="strategy.items?.length" class="text-gray-500">
        （共 {{ strategy.items.length }} 条：{{ strategy.items.slice(0, 3).join('、') }}{{ strategy.items.length > 3 ? '...' : '' }}）
      </span>
    </div>

    <div v-else-if="strategy.type === 'sequential_from_list'" class="text-teal-600">
      按序循环
      <span v-if="strategy.items?.length" class="text-gray-500">
        （共 {{ strategy.items.length }} 条：{{ strategy.items.slice(0, 3).join('、') }}{{ strategy.items.length > 3 ? '...' : '' }}）
      </span>
    </div>

    <div v-else-if="strategy.type === 'random_name'" class="text-green-600">
      随机{{ strategy.locale === 'zh' ? '中文' : '英文' }}姓名
    </div>

    <div v-else-if="strategy.type === 'random_int'" class="text-blue-600">
      随机整数：{{ strategy.min ?? 0 }} ~ {{ strategy.max ?? 100 }}
    </div>

    <div v-else-if="strategy.type === 'random_string'" class="text-indigo-600">
      随机字符串：{{ strategy.length ?? 8 }} 位
      <span class="text-gray-400">({{ charsetLabel }})</span>
    </div>

    <div v-else class="text-gray-500">
      {{ strategy.type }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  strategy: { type: Object, default: null },
})

const charsetLabel = computed(() => {
  const map = {
    alphanumeric: '字母+数字',
    alpha: '纯字母',
    lowercase: '小写',
    uppercase: '大写',
    digits: '纯数字',
  }
  return map[props.strategy?.charset] || '字母+数字'
})
</script>
