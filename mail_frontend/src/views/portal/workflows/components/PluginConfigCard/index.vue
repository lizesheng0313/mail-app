<template>
  <div class="border border-gray-300 rounded-lg bg-white">
    <!-- 插件头部 -->
    <div class="bg-gray-100 px-4 py-3 border-b border-gray-300 rounded-t-lg">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <!-- 拖拽手柄 -->
          <div class="drag-handle cursor-move p-1 text-gray-400 hover:text-black">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
            </svg>
          </div>
          <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-500 text-white text-sm font-medium">
            {{ index + 1 }}
          </span>
          <div class="flex-1 min-w-0">
            <CustomSelect
              v-model="group.plugin_id"
              :options="pluginOptions"
              :placeholder="t('workflowEditor.pluginSelect')"
              @change="$emit('plugin-change')"
            />
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <button
            type="button"
            @click="$emit('add-step')"
            class="inline-flex items-center px-2 py-1 text-xs font-medium text-primary-700 bg-primary-100 rounded hover:bg-primary-200"
          >
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            {{ t('workflowEditor.addStep') }}
          </button>
          <button
            type="button"
            @click="$emit('remove')"
            class="text-red-400 hover:text-red-600"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 插件配置 -->
    <div class="p-4 bg-gray-50 border-b border-gray-200">
      <div class="grid grid-cols-1 gap-4">
        <!-- 插件配置 -->
        <div v-if="group.plugin_id">
          <label class="block text-sm font-medium text-black mb-2">
            {{ t('workflowEditor.pluginConfig') }}
          </label>
          <textarea
            v-model="group.plugin_config"
            placeholder='{"headless": true, "timeout": 30}'
            class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
            rows="2"
          />
        </div>
      </div>
    </div>

    <!-- 步骤列表 -->
    <div class="p-4">
      <div v-if="group.steps.length === 0" class="text-center py-6 text-black text-sm">
        <p>{{ t('workflowEditor.emptySteps') }}</p>
      </div>

      <div v-else class="space-y-3">
        <StepConfigCard
          v-for="(step, stepIndex) in group.steps"
          :key="step.step_id"
          :step="step"
          :step-index="stepIndex"
          :total-steps="group.steps.length"
          :group="group"
          :get-plugin-action-options="getPluginActionOptions"
          :get-selected-action-schema="getSelectedActionSchema"
          @remove="$emit('remove-step', stepIndex)"
          @action-change="$emit('step-action-change', stepIndex)"
          @move-up="$emit('move-step-up', stepIndex)"
          @move-down="$emit('move-step-down', stepIndex)"
          @insert-before="$emit('insert-step-before', stepIndex)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import CustomSelect from '@/components/CustomSelect/index.vue'
import StepConfigCard from '../StepConfigCard/index.vue'

const { t } = useI18n()

defineProps({
  group: {
    type: Object,
    required: true
  },
  index: {
    type: Number,
    required: true
  },
  pluginOptions: {
    type: Array,
    default: () => []
  },
  getPluginActionOptions: {
    type: Function,
    required: true
  },
  getSelectedActionSchema: {
    type: Function,
    required: true
  }
})

defineEmits([
  'add-step',
  'remove',
  'plugin-change',
  'remove-step',
  'step-action-change'
])
</script>
