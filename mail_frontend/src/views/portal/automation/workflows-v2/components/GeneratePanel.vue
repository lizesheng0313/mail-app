<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-bold text-black">自动化工作流</h1>
        <p class="mt-1 text-sm text-gray-500">
          输入网址和目标，AI 分析页面后自动生成操作步骤，邮箱/密码/用户名全部自动生成
        </p>
      </div>
      <router-link
        to="/automation/workflows"
        class="px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
      >
        返回工作流列表
      </router-link>
    </div>

    <!-- 输入行 -->
    <div class="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div class="lg:col-span-5">
        <label class="block text-sm font-medium text-gray-700 mb-1">目标网址</label>
        <input
          :value="form.url"
          @input="$emit('update:form', { ...form, url: $event.target.value.trim() })"
          type="url"
          placeholder="https://example.com/register"
          class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          @keydown.enter="$emit('generate')"
        />
      </div>
      <div class="lg:col-span-5">
        <label class="block text-sm font-medium text-gray-700 mb-1">要做什么</label>
        <input
          :value="form.goal"
          @input="$emit('update:form', { ...form, goal: $event.target.value.trim() })"
          type="text"
          placeholder="帮我自动注册这个网站"
          class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          @keydown.enter="$emit('generate')"
        />
      </div>
      <div class="lg:col-span-2 flex items-end">
        <button
          @click="$emit('generate')"
          :disabled="generating"
          class="w-full px-4 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-60 transition-colors"
        >
          <span v-if="generating" class="flex items-center justify-center gap-2">
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            {{ generatingTip || '分析中' }}
          </span>
          <span v-else>开始分析</span>
        </button>
      </div>
    </div>

    <!-- 页面快照预览 -->
    <div v-if="snapshotInfo" class="mt-4 p-3 bg-blue-50 rounded-lg">
      <div class="flex items-center gap-3 text-sm flex-wrap">
        <span class="text-blue-600 font-medium">{{ snapshotInfo.title || '页面已分析' }}</span>
        <span class="text-blue-400">|</span>
        <span class="text-blue-500">发现 {{ snapshotInfo.inputs?.length || 0 }} 个输入框</span>
        <span class="text-blue-400">|</span>
        <span class="text-blue-500">{{ snapshotInfo.buttons?.length || 0 }} 个按钮</span>
        <span class="text-blue-400">|</span>
        <span class="text-blue-500">{{ snapshotInfo.forms?.length || 0 }} 个表单</span>
        <span
          class="ml-auto text-[11px] px-1.5 py-0.5 rounded"
          :class="snapshotInfo.source === 'playwright'
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-200 text-gray-600'"
        >
          {{ snapshotInfo.source === 'playwright' ? '完整渲染' : '快速扫描' }}
        </span>
      </div>
    </div>

    <!-- 示例 -->
    <slot name="examples" />
  </div>
</template>

<script setup>
defineProps({
  form: { type: Object, required: true },
  generating: { type: Boolean, default: false },
  generatingTip: { type: String, default: '' },
  snapshotInfo: { type: Object, default: null },
})

defineEmits(['update:form', 'generate'])
</script>
