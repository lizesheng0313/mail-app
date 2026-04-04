<template>
  <div class="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-gray-200 flex flex-col h-full">
    <div class="p-6 flex-1 flex flex-col">
      <div class="flex items-start space-x-4">
        <PluginIcon :plugin-id="plugin.plugin_id" size="md" />

        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <h3 style="font-size: 14px;" class="font-semibold text-black truncate">{{ plugin.name }}</h3>
          </div>

          <p style="font-size: 12px;" class="text-black mt-1">作者: {{ plugin.author }}</p>
          <p style="font-size: 12px;" class="text-black mt-2 line-clamp-2">{{ plugin.description }}</p>

          <div v-if="plugin.tags && plugin.tags.length > 0" class="flex flex-wrap gap-1 mt-3">
            <span
              v-for="tag in plugin.tags.slice(0, 3)"
              :key="tag"
              class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700 border border-primary-200"
            >
              {{ tag }}
            </span>
            <span v-if="plugin.tags.length > 3" class="text-xs text-black">
              +{{ plugin.tags.length - 3 }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex-1"></div>

      <div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div class="flex items-center space-x-4 text-black" style="font-size: 12px;">
          <div class="flex items-center">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            {{ formatNumber(plugin.install_count) }}
          </div>

          <div class="flex items-center">
            <svg class="w-4 h-4 mr-1 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {{ plugin.rating ? plugin.rating.toFixed(1) : '0.0' }}
            <span class="ml-1">({{ plugin.rating_count || 0 }})</span>
          </div>

          <div class="flex items-center">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            v{{ plugin.version }}
          </div>
        </div>

        <div class="text-right">
          <div v-if="plugin.is_free" style="font-size: 12px;" class="font-semibold text-accent-600">
            免费
          </div>
          <div v-else style="font-size: 12px;" class="font-semibold text-primary-600">
            付费插件
          </div>
        </div>
      </div>

      <slot name="actions" :plugin="plugin"></slot>
    </div>
  </div>
</template>

<script setup>
import PluginIcon from '@/components/PluginIcon/index.vue'

defineProps({
  plugin: {
    type: Object,
    required: true
  },
  showPrice: {
    type: Boolean,
    default: false
  }
})

const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
