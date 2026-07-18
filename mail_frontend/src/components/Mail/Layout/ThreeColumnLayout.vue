<template>
  <div :class="[pageScrollable ? 'min-h-screen' : 'h-screen', 'bg-gray-50 flex flex-col']">
    <!-- 顶部header -->
    <slot name="header">
      <PageHeader />
    </slot>

    <!-- 主要内容区域 -->
    <div
      :class="[
        'w-full py-3 flex-1 flex flex-col',
        compactPanels ? 'overflow-hidden' : (pageScrollable ? 'overflow-y-visible' : 'overflow-y-auto md:overflow-hidden')
      ]"
    >
      <!-- 顶部工具栏 -->
      <div :class="['mail-layout-safe mb-3', workspaceMode ? 'mail-layout-safe--workspace' : '']">
        <slot name="toolbar"></slot>
      </div>

      <!-- 三栏布局 -->
      <div :class="['mail-layout-grid-shell w-full flex-1 flex flex-col', workspaceMode ? 'mail-layout-grid-shell--workspace' : '']">
        <template v-if="resizablePanels && !compactPanels">
          <div
            v-if="useMain && $slots.main"
            ref="resizableMainRef"
            :class="['mail-resizable-grid mail-resizable-grid--main flex-1', (pageScrollable || compactPanels) ? '' : 'md:overflow-hidden']"
            :style="mainGridStyle"
          >
            <div class="min-w-0 relative z-0">
              <div :class="panelContainerClasses">
                <slot name="left"></slot>
              </div>
            </div>

            <button
              type="button"
              class="mail-resize-handle"
              aria-label="调整分栏宽度"
              @pointerdown="startResize('left-main', $event)"
            >
              <span class="mail-resize-handle__line"></span>
            </button>

            <div class="min-w-0">
              <div :class="[...panelContainerClasses, pageScrollable ? '' : 'h-full']">
                <slot name="main"></slot>
              </div>
            </div>
          </div>
          <div
            v-else
            ref="resizableGridRef"
            :class="['mail-resizable-grid mail-resizable-grid--triple flex-1', (pageScrollable || compactPanels) ? '' : 'md:overflow-hidden']"
            :style="tripleGridStyle"
          >
            <div class="min-w-0 relative z-0">
              <div :class="panelContainerClasses">
                <slot name="left"></slot>
              </div>
            </div>

            <button
              type="button"
              class="mail-resize-handle"
              aria-label="调整左侧分栏宽度"
              @pointerdown="startResize('left-middle', $event)"
            >
              <span class="mail-resize-handle__line"></span>
            </button>

            <div class="min-w-0">
              <div :class="panelContainerClasses">
                <slot name="middle"></slot>
              </div>
            </div>

            <button
              type="button"
              class="mail-resize-handle"
              aria-label="调整中间分栏宽度"
              @pointerdown="startResize('middle-right', $event)"
            >
              <span class="mail-resize-handle__line"></span>
            </button>

            <div class="min-w-0">
              <div :class="panelContainerClasses">
                <slot name="right"></slot>
              </div>
            </div>
          </div>
        </template>

        <div
          v-else
          :class="[
            'mail-three-column-grid grid grid-cols-1 gap-6 flex-1',
            workspaceMode ? 'mail-three-column-grid--workspace' : '',
            (pageScrollable || compactPanels) ? '' : 'md:overflow-hidden'
          ]"
        >
          <!-- 左栏 -->
          <div class="lg:col-span-1 relative z-0">
            <div :class="panelContainerClasses">
              <slot name="left"></slot>
            </div>
          </div>

          <!-- 中右合并大块 (可选) -->
          <div v-if="useMain && $slots.main" class="lg:col-span-2">
            <div :class="[...panelContainerClasses, pageScrollable ? '' : 'h-full']">
              <slot name="main"></slot>
            </div>
          </div>

          <template v-else>
            <!-- 中栏 -->
            <div class="lg:col-span-1">
              <div :class="panelContainerClasses">
                <slot name="middle"></slot>
              </div>
            </div>

            <!-- 右栏 -->
            <div class="lg:col-span-1">
              <div :class="panelContainerClasses">
                <slot name="right"></slot>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div v-if="$slots.footer" class="border-t border-gray-100 bg-white">
      <div :class="['mail-layout-safe w-full py-4', workspaceMode ? 'mail-layout-safe--workspace' : '']">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import PageHeader from '@/components/PageHeader/index.vue'

type ResizeMode = 'left-main' | 'left-middle' | 'middle-right'

const DESKTOP_BREAKPOINT = 1024
const HANDLE_SIZE = 10
const LEFT_MIN = 240
const MIDDLE_MIN = 240
const RIGHT_MIN = 320
const MAIN_MIN = 480
const IDEAL_LEFT_WIDTH = 392
const IDEAL_MIDDLE_WIDTH = 392

const props = withDefaults(
  defineProps<{
    pageScrollable?: boolean
    compactPanels?: boolean
    useMain?: boolean
    workspaceMode?: boolean
    resizablePanels?: boolean
  }>(),
  {
    pageScrollable: false,
    compactPanels: false,
    useMain: false,
    workspaceMode: false,
    resizablePanels: false,
  }
)

const resizableGridRef = ref<HTMLElement | null>(null)
const resizableMainRef = ref<HTMLElement | null>(null)
const isDesktop = ref(false)
const leftWidth = ref(IDEAL_LEFT_WIDTH)
const middleWidth = ref(IDEAL_MIDDLE_WIDTH)
const activeResizeMode = ref<ResizeMode | null>(null)

const panelContainerClasses = computed(() => [
  'panel-container',
  {
    'panel-container--scroll': props.pageScrollable,
    'panel-container--compact': props.compactPanels,
    'panel-container--workspace': props.workspaceMode,
  },
])

const tripleGridStyle = computed(() => {
  if (!props.resizablePanels || props.compactPanels || props.useMain || !isDesktop.value) {
    return undefined
  }
  return {
    gridTemplateColumns: `${leftWidth.value}px ${HANDLE_SIZE}px ${middleWidth.value}px ${HANDLE_SIZE}px minmax(${RIGHT_MIN}px, 1fr)`,
  }
})

const mainGridStyle = computed(() => {
  if (!props.resizablePanels || props.compactPanels || !props.useMain || !isDesktop.value) {
    return undefined
  }
  return {
    gridTemplateColumns: `${leftWidth.value}px ${HANDLE_SIZE}px minmax(${MAIN_MIN}px, 1fr)`,
  }
})

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const getTripleMinWidths = (containerWidth: number) => {
  const available = Math.max(containerWidth - HANDLE_SIZE * 2, 0)
  if (available >= LEFT_MIN + MIDDLE_MIN + RIGHT_MIN) {
    return { leftMin: LEFT_MIN, middleMin: MIDDLE_MIN, rightMin: RIGHT_MIN }
  }

  const scale = available / (LEFT_MIN + MIDDLE_MIN + RIGHT_MIN || 1)
  return {
    leftMin: Math.max(180, Math.floor(LEFT_MIN * scale)),
    middleMin: Math.max(180, Math.floor(MIDDLE_MIN * scale)),
    rightMin: Math.max(220, Math.floor(RIGHT_MIN * scale)),
  }
}

const syncTripleWidths = (preferredLeft?: number, preferredMiddle?: number) => {
  const containerWidth = resizableGridRef.value?.clientWidth || 0
  if (!containerWidth) return

  const { leftMin, middleMin, rightMin } = getTripleMinWidths(containerWidth)
  const contentWidth = Math.max(containerWidth - HANDLE_SIZE * 2, leftMin + middleMin + rightMin)
  const defaultWidth = Math.min(
    IDEAL_LEFT_WIDTH,
    Math.floor((contentWidth - rightMin) / 2)
  )

  let nextLeft = preferredLeft ?? leftWidth.value ?? defaultWidth
  let nextMiddle = preferredMiddle ?? middleWidth.value ?? defaultWidth

  const maxLeft = Math.max(leftMin, contentWidth - middleMin - rightMin)
  nextLeft = clamp(nextLeft, leftMin, maxLeft)

  const maxMiddle = Math.max(middleMin, contentWidth - nextLeft - rightMin)
  nextMiddle = clamp(nextMiddle, middleMin, maxMiddle)

  let rightWidth = contentWidth - nextLeft - nextMiddle
  if (rightWidth < rightMin) {
    const deficit = rightMin - rightWidth
    const reducibleMiddle = Math.max(0, nextMiddle - middleMin)
    const middleReduction = Math.min(deficit, reducibleMiddle)
    nextMiddle -= middleReduction
    rightWidth += middleReduction

    if (rightWidth < rightMin) {
      const reducibleLeft = Math.max(0, nextLeft - leftMin)
      const leftReduction = Math.min(rightMin - rightWidth, reducibleLeft)
      nextLeft -= leftReduction
      rightWidth += leftReduction
    }
  }

  leftWidth.value = Math.round(nextLeft)
  middleWidth.value = Math.round(nextMiddle)
}

const syncMainWidths = (preferredLeft?: number) => {
  const containerWidth = resizableMainRef.value?.clientWidth || 0
  if (!containerWidth) return

  const contentWidth = Math.max(containerWidth - HANDLE_SIZE, LEFT_MIN + MAIN_MIN)
  const maxLeft = Math.max(LEFT_MIN, contentWidth - MAIN_MIN)
  const defaultWidth = Math.min(IDEAL_LEFT_WIDTH, maxLeft)

  leftWidth.value = Math.round(
    clamp(preferredLeft ?? leftWidth.value ?? defaultWidth, LEFT_MIN, maxLeft)
  )
}

const syncDesktopWidths = () => {
  if (!props.resizablePanels || props.compactPanels || !isDesktop.value) return
  if (props.useMain) {
    syncMainWidths()
    return
  }
  syncTripleWidths()
}

const updateDesktopState = () => {
  isDesktop.value = window.innerWidth >= DESKTOP_BREAKPOINT
  nextTick(syncDesktopWidths)
}

const stopResize = () => {
  if (!activeResizeMode.value) return
  activeResizeMode.value = null
  document.body.style.removeProperty('cursor')
  document.body.style.removeProperty('user-select')
}

const handlePointerMove = (event: PointerEvent) => {
  const mode = activeResizeMode.value
  if (!mode || !isDesktop.value) return

  if (mode === 'left-main') {
    const container = resizableMainRef.value
    if (!container) return
    const rect = container.getBoundingClientRect()
    const preferredLeft = event.clientX - rect.left
    syncMainWidths(preferredLeft)
    return
  }

  const container = resizableGridRef.value
  if (!container) return
  const rect = container.getBoundingClientRect()

  if (mode === 'left-middle') {
    syncTripleWidths(event.clientX - rect.left, middleWidth.value)
    return
  }

  const middleFromLeft = event.clientX - rect.left - leftWidth.value - HANDLE_SIZE
  syncTripleWidths(leftWidth.value, middleFromLeft)
}

const startResize = (mode: ResizeMode, event: PointerEvent) => {
  if (!props.resizablePanels || props.compactPanels || !isDesktop.value) return
  event.preventDefault()
  activeResizeMode.value = mode
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

watch(
  () => [props.useMain, props.resizablePanels, props.compactPanels],
  () => nextTick(syncDesktopWidths)
)

onMounted(() => {
  updateDesktopState()
  window.addEventListener('resize', updateDesktopState)
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', stopResize)
  window.addEventListener('pointercancel', stopResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateDesktopState)
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', stopResize)
  window.removeEventListener('pointercancel', stopResize)
  stopResize()
})
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
  box-shadow: 0 1px 2px 0 rgb(15 23 42 / 0.08);
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

.panel-container--workspace {
  border-radius: 0.5rem;
  padding: 1rem 1.125rem;
  background: #ffffff;
  border: 1px solid #eef2f7;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.05);
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

.mail-layout-safe--workspace,
.mail-layout-grid-shell--workspace {
  max-width: none;
  padding-left: 1.25rem;
  padding-right: 1.25rem;
}

.mail-three-column-grid--workspace {
  gap: 0.875rem;
}

.mail-resizable-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.625rem;
}

.mail-layout-grid-shell--workspace {
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  padding: 0;
}

.mail-resize-handle {
  display: none;
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

  .mail-layout-safe--workspace,
  .mail-layout-grid-shell--workspace {
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

  .mail-layout-safe--workspace,
  .mail-layout-grid-shell--workspace {
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

@media (min-width: 1024px) {
  .mail-resizable-grid {
    gap: 0;
    align-items: stretch;
  }

  .mail-resize-handle {
    display: flex;
    position: relative;
    width: 10px;
    min-width: 10px;
    align-items: center;
    justify-content: center;
    border: 0;
    background: transparent;
    padding: 0;
    cursor: col-resize;
    touch-action: none;
    overflow: visible;
    appearance: none;
    -webkit-appearance: none;
    outline: none;
  }

  .mail-resize-handle__line {
    width: 1px;
    height: 100%;
    border-radius: 999px;
    background: transparent;
    transition: background-color 0.15s ease;
  }

  .mail-resize-handle::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 1;
    width: 16px;
    height: 48px;
    transform: translate(-50%, -50%);
    border-radius: 6px;
    border: 1px solid #cbd5e1;
    background: #ffffff;
    box-shadow: 0 1px 3px rgb(15 23 42 / 0.12);
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  }

  .mail-resize-handle::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 2;
    width: 4px;
    height: 24px;
    transform: translate(-50%, -50%);
    pointer-events: none;
    background: radial-gradient(circle, #64748b 1.5px, transparent 1.7px) center / 4px 8px repeat-y;
  }

  .mail-resize-handle:hover::after,
  .mail-resize-handle:focus-visible::after,
  .mail-resize-handle:active::after {
    border-color: #16a34a;
    background: #ffffff;
    box-shadow: 0 2px 8px rgb(22 163 74 / 0.2);
  }

  .mail-layout-grid-shell--workspace .mail-resizable-grid,
  .mail-layout-grid-shell--workspace .mail-three-column-grid {
    background: transparent;
  }
}

/* 宽屏保持整体更像工作区，左右留白再收一档。 */
@media (min-width: 1440px) {
  .mail-layout-safe--workspace,
  .mail-layout-grid-shell--workspace {
    padding-left: 2.5rem;
    padding-right: 2.5rem;
  }
}

@media (min-width: 1920px) {
  .mail-layout-safe,
  .mail-layout-grid-shell {
    max-width: none;
    padding-left: clamp(1.5rem, 3vw, 4rem);
    padding-right: clamp(1.5rem, 3vw, 4rem);
  }

  .mail-layout-safe--workspace,
  .mail-layout-grid-shell--workspace {
    padding-left: clamp(2rem, 2.5vw, 3.25rem);
    padding-right: clamp(2rem, 2.5vw, 3.25rem);
  }
}

</style>
