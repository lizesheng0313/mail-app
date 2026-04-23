<template>
  <div v-if="step" class="lg:col-span-4 space-y-4">
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-black">步骤详情</h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 text-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 步骤名称 -->
      <div>
        <label class="text-xs text-gray-500 mb-1 block">步骤名称</label>
        <input
          v-model="step.step.name"
          class="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:border-primary-400 focus:outline-none"
        />
      </div>

      <!-- 操作类型 -->
      <div>
        <label class="text-xs text-gray-500 mb-1 block">操作类型</label>
        <select
          v-model="step.step.action_key"
          class="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white focus:border-primary-400 focus:outline-none"
        >
          <optgroup label="插件能力">
            <option v-for="a in pluginActions" :key="a.key" :value="a.key">{{ a.label }}</option>
          </optgroup>
          <optgroup label="浏览器操作">
            <option v-for="a in browserActions" :key="a.key" :value="a.key">{{ a.label }}</option>
          </optgroup>
          <optgroup label="数据处理">
            <option v-for="a in dataActions" :key="a.key" :value="a.key">{{ a.label }}</option>
          </optgroup>
        </select>
      </div>

      <!-- 参数编辑 -->
      <div>
        <label class="text-xs text-gray-500 mb-1 block">参数</label>
        <StepParamEditor
          :action="step.step.action_key"
          :params="step.step.parameters || {}"
          :element-context="elementContext"
          @update:params="step.step.parameters = $event"
        />
      </div>

      <!-- 步骤说明 -->
      <div v-if="step.step.description">
        <label class="text-xs text-gray-500 mb-1 block">说明</label>
        <p class="text-xs text-gray-600 leading-relaxed">{{ step.step.description }}</p>
      </div>

      <!-- 操作按钮 -->
      <div class="flex gap-2">
        <button
          @click="$emit('add-step')"
          class="flex-1 py-1.5 text-xs text-primary-600 border border-primary-200 rounded hover:bg-primary-50 transition-colors"
        >
          + 在下方插入步骤
        </button>
        <button
          @click="$emit('remove-step')"
          class="flex-1 py-1.5 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors"
        >
          删除此步骤
        </button>
      </div>

      <!-- 删除分组 -->
      <button
        @click="$emit('remove-block', step.blockIndex)"
        class="w-full py-1.5 text-xs text-gray-400 border border-gray-200 rounded hover:bg-gray-50 hover:text-red-500 transition-colors"
      >
        删除整个分组
      </button>
    </div>
  </div>
</template>

<script setup>
import StepParamEditor from './StepParamEditor.vue'

defineProps({
  step: { type: Object, default: null },
  elementContext: { type: Object, default: () => ({}) },
  pluginActions: { type: Array, required: true },
  browserActions: { type: Array, required: true },
  dataActions: { type: Array, required: true },
})

defineEmits(['close', 'add-step', 'remove-step', 'remove-block'])
</script>
