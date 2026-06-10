<template>
  <div class="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
    <div class="font-medium">当前账号还没开通邮件触达</div>
    <div class="mt-2">{{ reason || '请先完成开通后再使用当前功能。' }}</div>
  </div>
</template>

<script setup>
defineProps({
  reason: {
    type: String,
    default: ''
  }
})
</script>
