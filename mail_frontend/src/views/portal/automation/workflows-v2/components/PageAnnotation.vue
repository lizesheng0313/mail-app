<template>
  <div class="border border-gray-200 rounded-lg bg-white overflow-hidden">
    <div v-if="screenshotB64" class="flex">
      <!-- 左侧：截图（含日志覆盖层） -->
      <div class="flex-1 min-w-0 relative">
        <div class="overflow-auto" ref="scrollContainer" :style="{ maxHeight: containerMaxH + 'px' }">
          <div class="relative inline-block" ref="imageWrapper" @click.self="activeIdx = null">
            <img
              ref="screenshotImg"
              :src="'data:image/png;base64,' + screenshotB64"
              class="block"
              :style="{ width: displayWidth + 'px' }"
              @load="onImageLoad"
            />
            <!-- 编号圆圈（只显示有 rect 坐标的） -->
            <div
              v-for="(marker, idx) in sortedMarkers"
              v-show="marker.rect"
              :key="marker.id"
              class="absolute z-10 flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold shadow-md border-2 cursor-pointer transition-transform"
              :class="[markerColorClass(marker, idx), activeIdx === idx ? 'scale-125 ring-2 ring-blue-300' : 'hover:scale-110']"
              :style="marker.rect ? numberStyle(marker) : {}"
              @click.stop="toggleMarker(idx)"
            >
              {{ marker.order }}
            </div>

            <!-- 点击标号后显示步骤详情卡片 -->
            <div
              v-if="activeIdx !== null && sortedMarkers[activeIdx]?.rect"
              class="absolute z-30 bg-white border border-gray-200 shadow-2xl rounded-xl p-0 w-[300px] overflow-hidden"
              :style="popoverStyle"
              @click.stop
            >
              <!-- 标题栏 -->
              <div class="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                <span class="text-xs font-bold text-gray-800">
                  第{{ sortedMarkers[activeIdx].order }}步
                </span>
                <button @click="activeIdx = null" class="text-gray-400 hover:text-gray-600">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <div class="px-3 py-2.5 space-y-2 text-xs">
                <!-- 元素名称 -->
                <div class="flex items-start gap-2">
                  <span class="text-gray-400 w-14 shrink-0">元素</span>
                  <span class="text-gray-800 font-medium">{{ sortedMarkers[activeIdx].label }}</span>
                </div>
                <!-- 类型 -->
                <div class="flex items-start gap-2">
                  <span class="text-gray-400 w-14 shrink-0">类型</span>
                  <span class="text-gray-700">{{ sortedMarkers[activeIdx].type === 'button' ? '按钮' : sortedMarkers[activeIdx].inputType === 'select' ? '下拉框' : sortedMarkers[activeIdx].inputType === 'checkbox' ? '复选框' : '输入框' }}</span>
                </div>
                <!-- 匹配的操作 -->
                <template v-if="matchedStepForMarker">
                  <div class="border-t border-gray-100 pt-2 mt-1"></div>
                  <div class="flex items-start gap-2">
                    <span class="text-gray-400 w-14 shrink-0">操作</span>
                    <span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{{ actionLabels[matchedStepForMarker.actionKey] || matchedStepForMarker.actionKey }}</span>
                  </div>
                  <div v-if="matchedStepForMarker.value" class="flex items-start gap-2">
                    <span class="text-gray-400 w-14 shrink-0">填入值</span>
                    <span class="text-gray-800 font-mono bg-gray-50 px-1.5 py-0.5 rounded">{{ matchedStepForMarker.value }}</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <span class="text-gray-400 w-14 shrink-0">定位</span>
                    <span class="text-gray-600 font-mono text-[10px] break-all">{{ matchedStepForMarker.selector }}</span>
                  </div>
                </template>
                <template v-else>
                  <div class="border-t border-gray-100 pt-2 mt-1"></div>
                  <div class="text-gray-400 italic">暂无匹配的操作步骤</div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- 运行日志覆盖层：只盖住左侧截图区 -->
        <div
          v-if="showLogPanel"
          class="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex flex-col"
        >
          <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 class="text-sm font-semibold text-gray-800">
              运行日志
              <span class="text-gray-400 font-normal ml-1">({{ debugLogs.length }})</span>
              <span v-if="debugging" class="ml-2 text-xs text-blue-500 animate-pulse">执行中...</span>
            </h3>
            <button
              @click="$emit('close-log-panel')"
              class="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="flex-1 overflow-y-auto px-4 py-2">
            <DebugTimeline :logs="debugLogs" :action-labels="actionLabels" />
          </div>
        </div>
      </div>

      <!-- 右侧：执行步骤列表（始终可见） -->
      <div class="w-[300px] shrink-0 border-l border-gray-200 bg-gray-50 overflow-y-auto" :style="{ maxHeight: containerMaxH + 'px' }">
        <div class="px-3 py-2.5 border-b border-gray-200 bg-white sticky top-0 z-10">
          <h3 class="text-sm font-semibold text-gray-800">
            执行步骤
            <span class="text-gray-400 font-normal">({{ visibleSteps.length }})</span>
          </h3>
        </div>
        <div class="p-2 space-y-1">
          <div
            v-for="(step, idx) in visibleSteps"
            :key="step.id"
            class="px-2.5 py-2 rounded-lg text-xs border transition-colors cursor-pointer"
            :class="expandedStep === step.id ? 'bg-white border-blue-200 shadow-sm' : 'border-transparent hover:bg-white hover:border-gray-200'"
            @click="expandedStep = expandedStep === step.id ? null : step.id"
          >
            <div class="flex items-center gap-2">
              <!-- 状态圆点 -->
              <span v-if="stepStatusMap[step.id] === 'success'"
                class="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                </svg>
              </span>
              <span v-else-if="stepStatusMap[step.id] === 'failed'"
                class="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </span>
              <span v-else-if="stepStatusMap[step.id] === 'running'"
                class="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                <svg class="w-3 h-3 text-white animate-spin" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
              </span>
              <span v-else-if="stepStatusMap[step.id] === 'retrying'"
                class="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                <svg class="w-3 h-3 text-white animate-spin" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
              </span>
              <span v-else
                class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                {{ idx + 1 }}
              </span>

              <div class="flex-1 min-w-0">
                <div class="font-medium text-gray-700 truncate">{{ step.label }}</div>
                <div class="text-[10px] text-gray-400">
                  {{ actionLabels[step.actionKey] || step.actionKey }}
                  <template v-if="step.actualValue">
                    <span class="text-green-600 ml-1">→ {{ step.actualValue }}</span>
                  </template>
                  <template v-else-if="step.value">
                    <span class="text-blue-500 ml-1">→ {{ step.value }}</span>
                  </template>
                </div>
              </div>
              <!-- 展开箭头 -->
              <svg class="w-3.5 h-3.5 text-gray-400 transition-transform shrink-0"
                :class="{ 'rotate-180': expandedStep === step.id }"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
            <!-- 展开：显示步骤详情 -->
            <div v-if="expandedStep === step.id" class="mt-2 pt-2 border-t border-gray-100 space-y-1.5 text-[11px]">
              <div class="flex gap-2">
                <span class="text-gray-400 w-10 shrink-0">操作</span>
                <span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{{ actionLabels[step.actionKey] || step.actionKey }}</span>
              </div>
              <div v-if="step.value" class="flex gap-2">
                <span class="text-gray-400 w-10 shrink-0">值</span>
                <span class="text-gray-800 font-mono bg-gray-50 px-1.5 py-0.5 rounded">{{ step.value }}</span>
              </div>
              <div class="flex gap-2">
                <span class="text-gray-400 w-10 shrink-0">定位</span>
                <span class="text-gray-600 font-mono text-[10px] break-all">{{ step.selector }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-if="!visibleSteps.length" class="p-4 text-center text-xs text-gray-400">
          暂无步骤
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="h-[400px] flex items-center justify-center text-sm text-gray-400">
      页面截图将在分析完成后显示
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import DebugTimeline from './DebugTimeline.vue'

const props = defineProps({
  screenshotB64: { type: String, default: null },
  viewport: { type: Object, default: null },
  snapshot: { type: Object, default: null },
  draft: { type: Object, required: true },
  actionLabels: { type: Object, default: () => ({}) },
  debugLogs: { type: Array, default: () => [] },
  debugging: { type: Boolean, default: false },
  showLogPanel: { type: Boolean, default: false },
})

defineEmits(['close-log-panel'])

const screenshotImg = ref(null)
const scrollContainer = ref(null)
const naturalWidth = ref(1280)
const naturalHeight = ref(900)
const displayWidth = ref(0)
const containerMaxH = ref(800)
const activeIdx = ref(null)
const expandedStep = ref(null)


const onImageLoad = () => {
  if (screenshotImg.value) {
    naturalWidth.value = screenshotImg.value.naturalWidth || 1280
    naturalHeight.value = screenshotImg.value.naturalHeight || 900
    // 让截图宽度 = 父容器宽度，不缩小
    const containerW = scrollContainer.value?.parentElement?.clientWidth || 900
    displayWidth.value = Math.min(naturalWidth.value, Math.max(containerW - 4, 600))
    // 长图：不限制高度，允许滚动查看
    containerMaxH.value = Math.max(800, window.innerHeight - 200)
  }
}

// 响应窗口变化
watch(() => props.screenshotB64, () => {
  activeIdx.value = null
})

const scale = computed(() => {
  const vw = props.viewport?.width || naturalWidth.value || 1280
  return displayWidth.value / vw
})

// 直接从 snapshot 的 inputs/buttons 生成标记，不依赖 AI 步骤
const sortedMarkers = computed(() => {
  const result = []
  const inputs = props.snapshot?.inputs || []
  const buttons = props.snapshot?.buttons || []

  // 从 snapshot 收集元素
  for (const inp of inputs) {
    if (inp.type === 'hidden') continue
    if (inp.visible === false && !inp.rect) continue
    const label = inp.label || inp.placeholder || inp.ariaLabel || inp.name || inp.type
    result.push({
      id: inp.selector,
      selector: inp.selector,
      rect: inp.rect || null,
      label: label,
      type: 'input',
      inputType: inp.type,
      order: 0,
    })
  }
  for (const btn of buttons) {
    if (btn.visible === false && !btn.rect) continue
    const text = (btn.text || '').toLowerCase()
    const isSubmit = btn.type === 'submit' || /submit|注册|提交|create|sign.?up|continue|next/i.test(text)
    if (isSubmit) {
      result.push({
        id: btn.selector,
        selector: btn.selector,
        rect: btn.rect || null,
        label: btn.text || '提交',
        type: 'button',
        inputType: 'submit',
        order: 0,
      })
    }
  }

  // 如果 snapshot 元素全没 rect，从 draft 步骤取 _rect
  const hasRect = result.some(m => m.rect)
  if (!hasRect) {
    result.length = 0
    const actionTypes = { fill: 'input', select: 'input', check: 'input', click: 'button' }
    for (const block of (props.draft?.blocks || [])) {
      for (const step of (block.internal_steps || [])) {
        if (!actionTypes[step.action_key]) continue
        const params = step.parameters || {}
        const rect = params._rect || null
        result.push({
          id: step.id,
          selector: params.selector || '',
          rect: rect,
          label: step.name || step.action_key,
          type: actionTypes[step.action_key],
          inputType: step.action_key,
          order: 0,
        })
      }
    }
  }

  // 按 Y 坐标排序
  result.sort((a, b) => {
    const ay = a.rect?.y ?? 0
    const by = b.rect?.y ?? 0
    const dy = ay - by
    if (Math.abs(dy) > 10) return dy
    return (a.rect?.x ?? 0) - (b.rect?.x ?? 0)
  })
  result.forEach((m, i) => { m.order = i + 1 })
  return result
})

const USER_ACTIONS = new Set(['fill', 'click', 'select', 'check'])

// 从 draft 提取用户可见的交互步骤（fill/click/select/check）
const visibleSteps = computed(() => {
  const result = []
  for (const block of (props.draft?.blocks || [])) {
    for (const step of (block.internal_steps || [])) {
      if (!USER_ACTIONS.has(step.action_key)) continue
      const params = step.parameters || {}
      // 从 debugLogs 取实际执行结果
      const log = props.debugLogs.find(l => l.step_id === step.id && l.status === 'success')
      let actualValue = ''
      if (log?.summary && log.summary !== '执行成功') {
        actualValue = log.summary
      }
      result.push({
        id: step.id,
        label: step.name || step.action_key,
        actionKey: step.action_key,
        value: params.value || '',
        actualValue: actualValue,
        selector: params.selector || '',
      })
    }
  }
  return result
})

// 根据 debugLogs 构建步骤执行状态 map（step_id → status）
const stepStatusMap = computed(() => {
  const m = {}
  for (const log of props.debugLogs) {
    m[log.step_id] = log.status
  }
  return m
})

const activeMarker = computed(() => activeIdx.value !== null ? sortedMarkers.value[activeIdx.value] : null)

const numberStyle = (marker) => {
  const s = scale.value
  const r = marker.rect
  return {
    left: `${r.x * s - 10}px`,
    top: `${r.y * s - 10}px`,
  }
}

const toggleMarker = (idx) => {
  activeIdx.value = activeIdx.value === idx ? null : idx
}

const markerColorClass = (marker, idx) => {
  if (activeIdx.value === idx) return 'bg-blue-600 text-white border-blue-700'
  if (marker.type === 'button') return 'bg-green-500 text-white border-green-600'
  return 'bg-amber-400 text-amber-900 border-amber-500'
}

const formatStepJson = (step) => {
  return JSON.stringify({ id: step.id, action: step.actionKey, label: step.label, value: step.value, selector: step.selector }, null, 2)
}

// 气泡定位：在标号右下方
const popoverStyle = computed(() => {
  if (activeIdx.value === null) return {}
  const marker = sortedMarkers.value[activeIdx.value]
  if (!marker?.rect) return {}
  const s = scale.value
  return {
    left: `${marker.rect.x * s + 20}px`,
    top: `${marker.rect.y * s + 10}px`,
  }
})

// 匹配标号对应的 draft 步骤（通过 selector 匹配）
const matchedStepForMarker = computed(() => {
  if (activeIdx.value === null) return null
  const marker = sortedMarkers.value[activeIdx.value]
  if (!marker) return null
  return visibleSteps.value.find(s => s.selector === marker.selector) || null
})

// 标号详情 JSON
const markerDetailJson = computed(() => {
  if (activeIdx.value === null) return ''
  const marker = sortedMarkers.value[activeIdx.value]
  const step = matchedStepForMarker.value
  const info = {
    marker: { label: marker.label, selector: marker.selector, type: marker.type, rect: marker.rect },
  }
  if (step) {
    info.step = { id: step.id, action: step.actionKey, label: step.label, value: step.value, selector: step.selector }
  }
  return JSON.stringify(info, null, 2)
})
</script>
