<template>
  <div :class="[pageScrollable ? 'min-h-screen' : 'h-screen', 'bg-gray-50 flex flex-col']">
    <!-- 顶部header -->
    <slot name="header">
      <PageHeader />
    </slot>

    <!-- 主要内容区域 -->
    <div
      :class="[
        'w-full py-4 flex-1 flex flex-col',
        compactPanels ? 'overflow-hidden' : (pageScrollable ? 'overflow-y-visible' : 'overflow-y-auto md:overflow-hidden')
      ]"
    >
      <!-- 顶部工具栏 -->
      <div class="mail-layout-safe mb-4">
        <slot name="toolbar"></slot>
      </div>

      <!-- 三栏布局 -->
      <div class="mail-layout-grid-shell w-full flex-1 flex flex-col">
        <div :class="['mail-three-column-grid grid grid-cols-1 gap-6 flex-1', (pageScrollable || compactPanels) ? '' : 'md:overflow-hidden']">
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
    </div>

    <div v-if="$slots.footer" class="border-t border-gray-100 bg-white">
      <div class="mail-layout-safe w-full py-4">
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

.mail-layout-safe,
.mail-layout-grid-shell {
  margin: 0 auto;
  padding-left: 1rem;
  padding-right: 1rem;
  width: 100%;
}

.mail-layout-safe {
  max-width: 80rem;
}

.mail-layout-grid-shell {
  max-width: 80rem;
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

@media (min-width: 640px) {
  .mail-layout-safe,
  .mail-layout-grid-shell {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .mail-layout-safe,
  .mail-layout-grid-shell {
    padding-left: 2rem;
    padding-right: 2rem;
  }
}

/* 普通桌面保持三栏等宽，延续原有紧凑布局。 */
@media (min-width: 1024px) {
  .mail-three-column-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

/* 宽屏保持左栏和中栏接近原来的宽度，额外空间只给右栏。 */
@media (min-width: 1920px) {
  .mail-layout-safe,
  .mail-layout-grid-shell {
    max-width: none;
    padding-left: clamp(1.5rem, 3vw, 4rem);
    padding-right: clamp(1.5rem, 3vw, 4rem);
  }

  .mail-three-column-grid {
    grid-template-columns:
      calc((80rem - 4rem - 3rem) / 3)
      calc((80rem - 4rem - 3rem) / 3)
      minmax(0, 1fr);
  }
}

</style>
