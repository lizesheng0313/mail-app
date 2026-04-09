<template>
  <div :class="[pageScrollable ? 'min-h-screen' : 'h-screen', 'bg-gray-50 flex flex-col']">
    <!-- 顶部header -->
    <slot name="header">
      <PageHeader />
    </slot>

    <!-- 主要内容区域 -->
    <div
      :class="[
        'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex-1 flex flex-col',
        compactPanels ? 'overflow-hidden' : (pageScrollable ? 'overflow-y-visible' : 'overflow-y-auto md:overflow-hidden')
      ]"
    >
      <!-- 顶部工具栏 -->
      <div class="mb-4">
        <slot name="toolbar"></slot>
      </div>

      <!-- 三栏布局 -->
      <div :class="['grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1', (pageScrollable || compactPanels) ? '' : 'md:overflow-hidden']">
        <!-- 左栏 -->
        <div class="lg:col-span-1 relative z-0">
          <div :class="['panel-container', { 'panel-container--scroll': pageScrollable, 'panel-container--compact': compactPanels }]">
            <slot name="left"></slot>
          </div>
        </div>

        <!-- 中右合并大块 (可选) -->
        <div v-if="useMain && $slots.main" class="lg:col-span-2">
          <div :class="['panel-container', { 'panel-container--scroll': pageScrollable, 'panel-container--compact': compactPanels }, pageScrollable ? '' : 'h-full']">
            <slot name="main"></slot>
          </div>
        </div>

        <template v-else>
          <!-- 中栏 -->
          <div class="lg:col-span-1">
            <div :class="['panel-container', { 'panel-container--scroll': pageScrollable, 'panel-container--compact': compactPanels }]">
              <slot name="middle"></slot>
            </div>
          </div>

          <!-- 右栏 -->
          <div class="lg:col-span-1">
            <div :class="['panel-container', { 'panel-container--scroll': pageScrollable, 'panel-container--compact': compactPanels }]">
              <slot name="right"></slot>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div v-if="$slots.footer" class="border-t border-gray-100 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHeader from '@/components/PageHeader/index.vue'

withDefaults(
  defineProps<{
    pageScrollable?: boolean
    compactPanels?: boolean
    useMain?: boolean
  }>(),
  {
    pageScrollable: false,
    compactPanels: false,
    useMain: false,
  }
)
</script>

<style scoped>
/* 三栏布局样式 */
.panel-container {
  height: 75vh;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  padding: 1.5rem;
}

.panel-container--scroll {
  height: auto;
  min-height: clamp(460px, 68vh, 760px);
}

.panel-container--compact {
  height: 100%;
  min-height: 0;
}

/* 滚动条样式 */
:deep(.scrollbar-stable) {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
}

:deep(.scrollbar-stable::-webkit-scrollbar) {
  width: 8px;
}

:deep(.scrollbar-stable::-webkit-scrollbar-track) {
  background: #f1f5f9;
  border-radius: 4px;
}

:deep(.scrollbar-stable::-webkit-scrollbar-thumb) {
  background: #cbd5e1;
  border-radius: 4px;
}

:deep(.scrollbar-stable::-webkit-scrollbar-thumb:hover) {
  background: #94a3b8;
}

/* 强制确保大屏幕下的三列布局 */
@media (min-width: 1024px) {
  .grid.grid-cols-1.lg\\:grid-cols-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }
}

/* 强制确保容器宽度一致性 */
:deep(.max-w-7xl) {
  max-width: 80rem !important;
  width: 100% !important;
}
</style>
