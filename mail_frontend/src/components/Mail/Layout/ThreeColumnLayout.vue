<template>
  <div :class="[embedded ? 'h-full min-h-0 mail-layout--embedded' : (pageScrollable ? 'min-h-screen' : 'h-screen'), 'bg-gray-50 flex flex-col']">
    <!-- 顶部header -->
    <slot v-if="!embedded" name="header">
      <PageHeader />
    </slot>

    <!-- 主要内容区域 -->
    <div
      :class="[
        'w-full py-3 flex-1 flex flex-col',
        pageScrollable ? '' : 'min-h-0',
        compactPanels ? 'overflow-hidden' : (pageScrollable ? 'overflow-y-visible' : 'overflow-y-auto lg:overflow-hidden')
      ]"
    >
      <!-- 顶部工具栏 -->
      <div v-if="$slots.toolbar" :class="['mail-layout-safe mb-3 shrink-0', workspaceMode ? 'mail-layout-safe--workspace' : '']">
        <slot name="toolbar"></slot>
      </div>

      <nav
        v-if="mobilePanes.length"
        class="mail-mobile-tabs mb-2 flex shrink-0 gap-1 overflow-x-auto border-b border-gray-200 lg:hidden"
        :aria-label="mobileNavigationLabel"
      >
        <button
          v-for="pane in mobilePanes"
          :key="pane.key"
          type="button"
          class="min-w-0 flex-1 whitespace-nowrap border-b-2 px-2 py-2 text-sm font-medium transition-colors"
          :class="mobileActivePane === pane.key
            ? 'border-primary-600 text-primary-700'
            : 'border-transparent text-gray-500 hover:text-gray-700'"
          :aria-current="mobileActivePane === pane.key ? 'page' : undefined"
          @click="emit('update:mobileActivePane', pane.key)"
        >
          {{ pane.label }}
        </button>
      </nav>

      <!-- 三栏布局 -->
      <div :class="['mail-layout-grid-shell w-full flex-1 flex flex-col', pageScrollable ? '' : 'min-h-0', workspaceMode ? 'mail-layout-grid-shell--workspace' : '']">
        <template v-if="resizablePanels && !compactPanels">
          <div
            v-if="useMain && $slots.main"
            ref="resizableMainRef"
            :class="['mail-resizable-grid mail-resizable-grid--main flex-1', pageScrollable ? '' : 'min-h-0', (pageScrollable || compactPanels) ? '' : 'lg:overflow-hidden', mobilePanes.length ? 'mail-mobile-pane-grid' : '']"
            :style="mainGridStyle"
          >
            <div class="mail-pane mail-pane--left min-h-0 min-w-0 relative z-0" :class="{ 'mail-pane--active': mobileActivePane === 'left' }">
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

            <div class="mail-pane mail-pane--main min-h-0 min-w-0" :class="{ 'mail-pane--active': mobileActivePane === 'main' }">
              <div :class="[...panelContainerClasses, pageScrollable ? '' : 'h-full']">
                <slot name="main"></slot>
              </div>
            </div>
          </div>
          <div
            v-else
            ref="resizableGridRef"
            :class="['mail-resizable-grid mail-resizable-grid--triple flex-1', pageScrollable ? '' : 'min-h-0', (pageScrollable || compactPanels) ? '' : 'lg:overflow-hidden', mobilePanes.length ? 'mail-mobile-pane-grid' : '']"
            :style="tripleGridStyle"
          >
            <div class="mail-pane mail-pane--left min-h-0 min-w-0 relative z-0" :class="{ 'mail-pane--active': mobileActivePane === 'left' }">
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

            <div class="mail-pane mail-pane--middle min-h-0 min-w-0" :class="{ 'mail-pane--active': mobileActivePane === 'middle' }">
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

            <div class="mail-pane mail-pane--right min-h-0 min-w-0" :class="{ 'mail-pane--active': mobileActivePane === 'right' }">
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
            useMain && $slots.main ? 'mail-three-column-grid--main' : 'mail-three-column-grid--triple',
            workspaceMode ? 'mail-three-column-grid--workspace' : '',
            (pageScrollable || compactPanels) ? '' : 'lg:overflow-hidden',
            mobilePanes.length ? 'mail-mobile-pane-grid' : ''
          ]"
        >
          <!-- 左栏 -->
          <div class="mail-pane mail-pane--left lg:col-span-1 relative z-0" :class="{ 'mail-pane--active': mobileActivePane === 'left' }">
            <div :class="panelContainerClasses">
              <slot name="left"></slot>
            </div>
          </div>

          <!-- 中右合并大块 (可选) -->
          <div v-if="useMain && $slots.main" class="mail-pane mail-pane--main lg:col-span-2" :class="{ 'mail-pane--active': mobileActivePane === 'main' }">
            <div :class="[...panelContainerClasses, pageScrollable ? '' : 'h-full']">
              <slot name="main"></slot>
            </div>
          </div>

          <template v-else>
            <!-- 中栏 -->
            <div class="mail-pane mail-pane--middle lg:col-span-1" :class="{ 'mail-pane--active': mobileActivePane === 'middle' }">
              <div :class="panelContainerClasses">
                <slot name="middle"></slot>
              </div>
            </div>

            <!-- 右栏 -->
            <div class="mail-pane mail-pane--right lg:col-span-1" :class="{ 'mail-pane--active': mobileActivePane === 'right' }">
              <div :class="panelContainerClasses">
                <slot name="right"></slot>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div v-if="$slots.footer" class="shrink-0 border-t border-gray-100 bg-white">
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
type MobilePane = 'left' | 'middle' | 'right' | 'main'

const DESKTOP_BREAKPOINT = 1024
const WIDE_DESKTOP_BREAKPOINT = 1920
const HANDLE_SIZE = 10
const LEFT_MIN = 240
const MIDDLE_MIN = 240
const RIGHT_MIN = 320
const MAIN_MIN = 480
const IDEAL_LEFT_WIDTH = 392
const DEFAULT_TRIPLE_SIDE_RATIO = 0.3
const WIDE_TRIPLE_SIDE_RATIO = 0.27

const props = withDefaults(
  defineProps<{
    pageScrollable?: boolean
    compactPanels?: boolean
    useMain?: boolean
    workspaceMode?: boolean
    resizablePanels?: boolean
    embedded?: boolean
    mobilePanes?: Array<{ key: MobilePane; label: string }>
    mobileActivePane?: MobilePane
    mobileNavigationLabel?: string
  }>(),
  {
    pageScrollable: false,
    compactPanels: false,
    useMain: false,
    workspaceMode: false,
    resizablePanels: false,
    embedded: false,
    mobilePanes: () => [],
    mobileActivePane: 'left',
    mobileNavigationLabel: '邮箱视图',
  }
)

const emit = defineEmits<{ 'update:mobileActivePane': [pane: MobilePane] }>()

const resizableGridRef = ref<HTMLElement | null>(null)
const resizableMainRef = ref<HTMLElement | null>(null)
const isDesktop = ref(false)
const leftWidth = ref(IDEAL_LEFT_WIDTH)
const middleWidth = ref(IDEAL_LEFT_WIDTH)
const mainLeftWidth = ref(IDEAL_LEFT_WIDTH)
const tripleWidthRatios = ref<{ left: number; middle: number } | null>(null)
const mainLeftRatio = ref<number | null>(null)
const activeResizeMode = ref<ResizeMode | null>(null)
let didResize = false

const panelStorageKey = () => `mail-panel-widths:v1:${props.embedded ? 'workspace' : 'standalone'}`
const isValidRatio = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 1

const restorePanelWidths = () => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(panelStorageKey()) || 'null')
    if (!saved || typeof saved !== 'object') return

    const triple = saved.triple
    if (isValidRatio(triple?.left) && isValidRatio(triple?.middle) && triple.left + triple.middle < 1) {
      tripleWidthRatios.value = { left: triple.left, middle: triple.middle }
    }
    if (isValidRatio(saved.main)) mainLeftRatio.value = saved.main
  } catch {
    // 无法读取或设置已损坏时，保留默认布局。
  }
}

const savePanelWidths = () => {
  try {
    window.localStorage.setItem(panelStorageKey(), JSON.stringify({
      triple: tripleWidthRatios.value,
      main: mainLeftRatio.value,
    }))
  } catch {
    // 本地存储不可用时，仍允许调整当前页面的分栏。
  }
}

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
    gridTemplateColumns: `${leftWidth.value}px ${HANDLE_SIZE}px ${middleWidth.value}px ${HANDLE_SIZE}px minmax(${getTripleMinWidths(resizableGridRef.value?.clientWidth || 0).rightMin}px, 1fr)`,
  }
})

const mainGridStyle = computed(() => {
  if (!props.resizablePanels || props.compactPanels || !props.useMain || !isDesktop.value) {
    return undefined
  }
  return {
    gridTemplateColumns: `${mainLeftWidth.value}px ${HANDLE_SIZE}px minmax(${MAIN_MIN}px, 1fr)`,
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
  const defaultSideRatio = window.innerWidth >= WIDE_DESKTOP_BREAKPOINT
    ? WIDE_TRIPLE_SIDE_RATIO
    : DEFAULT_TRIPLE_SIDE_RATIO
  const defaultWidth = Math.min(
    contentWidth * defaultSideRatio,
    (contentWidth - rightMin) / 2
  )

  // 较小桌面默认 30% / 30% / 40%，大屏为 27% / 27% / 46%；优先恢复用户保存的比例。
  const ratios = tripleWidthRatios.value
  let nextLeft = preferredLeft ?? (ratios ? contentWidth * ratios.left : defaultWidth)
  let nextMiddle = preferredMiddle ?? (ratios ? contentWidth * ratios.middle : defaultWidth)

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
  middleWidth.value = Math.min(Math.round(nextMiddle), contentWidth - leftWidth.value - rightMin)
  if (preferredLeft !== undefined || preferredMiddle !== undefined) {
    tripleWidthRatios.value = {
      left: leftWidth.value / contentWidth,
      middle: middleWidth.value / contentWidth,
    }
  }
}

const syncMainWidths = (preferredLeft?: number) => {
  const containerWidth = resizableMainRef.value?.clientWidth || 0
  if (!containerWidth) return

  const contentWidth = Math.max(containerWidth - HANDLE_SIZE, LEFT_MIN + MAIN_MIN)
  const maxLeft = Math.max(LEFT_MIN, contentWidth - MAIN_MIN)
  const defaultWidth = Math.min(IDEAL_LEFT_WIDTH, maxLeft)

  mainLeftWidth.value = Math.round(
    clamp(preferredLeft ?? (mainLeftRatio.value === null ? defaultWidth : contentWidth * mainLeftRatio.value), LEFT_MIN, maxLeft)
  )
  if (preferredLeft !== undefined) mainLeftRatio.value = mainLeftWidth.value / contentWidth
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

let panelResizeObserver: ResizeObserver | undefined

const observePanels = () => {
  panelResizeObserver?.disconnect()
  if (resizableGridRef.value) panelResizeObserver?.observe(resizableGridRef.value)
  if (resizableMainRef.value) panelResizeObserver?.observe(resizableMainRef.value)
}

const stopResize = () => {
  if (!activeResizeMode.value) return
  if (didResize) savePanelWidths()
  didResize = false
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
    didResize = true
    return
  }

  const container = resizableGridRef.value
  if (!container) return
  const rect = container.getBoundingClientRect()

  if (mode === 'left-middle') {
    syncTripleWidths(event.clientX - rect.left, middleWidth.value)
    didResize = true
    return
  }

  const middleFromLeft = event.clientX - rect.left - leftWidth.value - HANDLE_SIZE
  syncTripleWidths(leftWidth.value, middleFromLeft)
  didResize = true
}

const startResize = (mode: ResizeMode, event: PointerEvent) => {
  if (!props.resizablePanels || props.compactPanels || !isDesktop.value) return
  event.preventDefault()
  didResize = false
  activeResizeMode.value = mode
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

watch(
  () => [props.useMain, props.resizablePanels, props.compactPanels, resizableGridRef.value, resizableMainRef.value],
  () => {
    observePanels()
    nextTick(syncDesktopWidths)
  },
  { flush: 'post' }
)

onMounted(() => {
  restorePanelWidths()
  updateDesktopState()
  if (typeof ResizeObserver !== 'undefined') {
    panelResizeObserver = new ResizeObserver(() => syncDesktopWidths())
    observePanels()
  }
  window.addEventListener('resize', updateDesktopState)
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', stopResize)
  window.addEventListener('pointercancel', stopResize)
})

onBeforeUnmount(() => {
  panelResizeObserver?.disconnect()
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
  padding: 0.75rem;
  background: #ffffff;
  border: 1px solid #eef2f7;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.05);
}

.panel-container--workspace:not(.panel-container--scroll) {
  height: 100%;
  min-height: 0;
}

@media (max-width: 1023px) {
  .panel-container:not(.panel-container--compact) {
    height: auto;
    min-height: 32rem;
  }
}

.mail-layout-safe,
.mail-layout-grid-shell {
  margin-inline: auto;
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

/* 三栏默认给邮件详情留出更多空间；两栏撰写视图保留原有布局。 */
@media (min-width: 1024px) {
  .mail-three-column-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .mail-three-column-grid--triple {
    grid-template-columns: minmax(0, 30fr) minmax(0, 30fr) minmax(0, 40fr);
  }

  .mail-resizable-grid--triple {
    grid-template-columns: minmax(0, 30fr) 10px minmax(0, 30fr) 10px minmax(0, 40fr);
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
  .mail-three-column-grid--triple {
    grid-template-columns: minmax(0, 27fr) minmax(0, 27fr) minmax(0, 46fr);
  }

  .mail-resizable-grid--triple {
    grid-template-columns: minmax(0, 27fr) 10px minmax(0, 27fr) 10px minmax(0, 46fr);
  }

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

.mail-layout--embedded > div {
  min-height: 0;
  padding-top: 0;
}

.mail-layout--embedded .mail-layout-safe,
.mail-layout--embedded .mail-layout-grid-shell {
  padding-left: 0;
  padding-right: 0;
}

.mail-layout--embedded .mail-resizable-grid,
.mail-layout--embedded .mail-resizable-grid > div {
  min-height: 0;
}

@media (max-width: 1023px) {
  .mail-layout--embedded .mail-resizable-grid > div {
    min-height: 28rem;
  }

  .mail-mobile-pane-grid {
    min-height: 0;
    height: 100%;
    grid-template-rows: minmax(0, 1fr);
  }

  .mail-mobile-pane-grid > .mail-pane:not(.mail-pane--active) {
    display: none;
  }

  .mail-layout--embedded .mail-mobile-pane-grid > .mail-pane--active,
  .mail-mobile-pane-grid > .mail-pane--active,
  .mail-mobile-pane-grid > .mail-pane--active > .panel-container {
    min-height: 0;
    height: 100%;
  }
}
</style>
