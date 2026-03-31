<template>
  <div class="bg-white rounded-lg shadow-sm border p-6 mb-8">
    <div class="flex items-center space-x-4">
      <!-- 搜索框 -->
      <BaseInput
        :model-value="searchQuery"
        @update:model-value="$emit('update:searchQuery', $event)"
        :placeholder="t('workflowFilters.searchPlaceholder')"
        class="w-64"
        size="sm"
      >
        <template #left-icon>
          <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </template>
      </BaseInput>

      <!-- 状态筛选 -->
      <CustomSelect
        :model-value="statusFilter"
        @update:model-value="$emit('update:statusFilter', $event)"
        :options="statusOptions"
        :placeholder="t('workflowFilters.allStatuses')"
      />

      <!-- 查询按钮 -->
      <button
        @click="$emit('refresh')"
        :disabled="loading"
        class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm"
      >
        {{ t('workflowFilters.search') }}
      </button>

      <!-- 插件配置模式提示 -->
      <div v-if="isPluginConfigMode" class="flex items-center px-3 py-2 bg-primary-50 border border-primary-200 rounded-lg">
        <svg class="w-4 h-4 text-primary-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-sm text-primary-700">{{ t('workflowFilters.pluginConfigMode') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseInput from '@/components/BaseInput/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'

const { t } = useI18n()

const props = defineProps({
  searchQuery: {
    type: String,
    default: ''
  },
  statusFilter: {
    type: String,
    default: ''
  },
  isPluginConfigMode: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:searchQuery', 'update:statusFilter', 'refresh'])

// 状态选项
const statusOptions = computed(() => [
  { label: t('workflowFilters.allStatuses'), value: '' },
  { label: t('workflowList.statusActive'), value: 'active' },
  { label: t('workflowList.statusInactive'), value: 'inactive' },
  { label: t('workflowList.statusDraft'), value: 'draft' }
])
</script>
