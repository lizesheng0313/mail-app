<template>
  <div>
    <!-- 底部固定操作栏 -->
    <div class="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
        <!-- 试运行 -->
        <button
          @click="$emit('debug-run')"
          :disabled="debugging"
          class="px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="debugging
            ? 'bg-gray-100 text-gray-400 cursor-wait'
            : 'bg-gray-900 text-white hover:bg-black'"
        >
          <span v-if="debugging" class="flex items-center gap-2">
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            执行中...
          </span>
          <span v-else>试运行</span>
        </button>

        <!-- 保存 -->
        <button
          @click="$emit('save')"
          :disabled="saving"
          class="px-5 py-2 rounded-lg text-sm font-medium border border-green-600 text-green-700 hover:bg-green-50 disabled:opacity-60 transition-colors"
        >
          {{ saving ? '保存中...' : '保存为正式流程' }}
        </button>

        <span class="flex-1"></span>

        <!-- 执行结果摘要 -->
        <div v-if="runResult" class="flex items-center gap-2 text-xs">
          <span :class="runResult.status === 'completed' ? 'text-green-600' : 'text-red-600'" class="font-medium">
            {{ runResult.status === 'completed' ? '全部通过' : '存在失败' }}
          </span>
          <span class="text-gray-400">
            {{ runResult.success_steps }}/{{ runResult.total_steps }} 成功
          </span>
        </div>

        <!-- 运行日志按钮 -->
        <button
          @click="drawerOpen = !drawerOpen"
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors"
          :class="drawerOpen
            ? 'bg-gray-900 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          运行日志
          <span v-if="debugLogs.length" class="text-[10px] px-1.5 py-0.5 rounded-full" :class="drawerOpen ? 'bg-white/20' : 'bg-gray-900 text-white'">
            {{ debugLogs.length }}
          </span>
        </button>
      </div>
    </div>

    <!-- 日志抽屉（从底部滑出） -->
    <Transition name="drawer">
      <div
        v-if="drawerOpen"
        class="fixed bottom-[57px] left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]"
      >
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between py-2 border-b border-gray-100">
            <h3 class="text-sm font-semibold text-gray-800">
              运行日志
              <span v-if="userVisibleLogs.length" class="text-gray-400 font-normal ml-1">({{ userVisibleLogs.length }})</span>
            </h3>
            <button @click="drawerOpen = false" class="text-gray-400 hover:text-gray-600 p-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="py-3 overflow-y-auto" style="max-height: 50vh">
            <DebugTimeline :logs="userVisibleLogs" :action-labels="actionLabels" />
          </div>
        </div>
      </div>
    </Transition>

    <!-- 底栏占位（防止内容被遮挡） -->
    <div class="h-[57px]"></div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import DebugTimeline from './DebugTimeline.vue'

const SYSTEM_ACTIONS = new Set([
  'navigate', 'allocate_email', 'generate_password', 'generate_username',
  'wait_for', 'switch_to_frame', 'switch_to_main', 'close_overlay',
  'wait_for_navigation', 'set_variable', 'delay', 'log', 'scroll',
  'get_phone_number', 'screenshot', 'replan', 'dismiss_dialog',
  'wait_for_url', 'handle_new_tab', 'close_tab', 'keyboard',
])

const props = defineProps({
  debugging: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  runResult: { type: Object, default: null },
  debugLogs: { type: Array, default: () => [] },
  actionLabels: { type: Object, default: () => ({}) },
})

defineEmits(['debug-run', 'save'])

const drawerOpen = ref(false)

const userVisibleLogs = computed(() => {
  if (props.debugging) return props.debugLogs
  return props.debugLogs.filter(log => {
    const action = log.debug_output?.action_key || ''
    return !SYSTEM_ACTIONS.has(action)
  })
})

// 开始调试时自动打开日志抽屉
watch(() => props.debugging, (val) => {
  if (val) drawerOpen.value = true
})
</script>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
