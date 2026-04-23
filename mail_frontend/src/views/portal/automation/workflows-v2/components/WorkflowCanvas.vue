<template>
  <div class="relative border border-gray-200 rounded-lg bg-white overflow-hidden">
    <div ref="containerRef" class="h-[700px] w-full"></div>
    <div
      v-if="!hasBlocks"
      class="absolute inset-0 flex items-center justify-center text-sm text-gray-500 bg-white/80"
    >
      先生成流程草图，画布会自动渲染
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Graph } from '@antv/x6'

const PLUGIN_ACTIONS = new Set([
  'allocate_email', 'wait_email_code', 'solve_captcha',
  'get_phone_number', 'wait_sms_code'
])

const props = defineProps({
  draft: {
    type: Object,
    required: true
  },
  customerPreview: {
    type: Boolean,
    default: false
  },
  debugLogs: {
    type: Array,
    default: () => []
  },
  actionLabels: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['node-click'])

const containerRef = ref(null)
let graph = null

const hasBlocks = computed(() => (props.draft?.blocks || []).length > 0)

const latestStatusByStepId = computed(() => {
  const map = new Map()
  for (const log of props.debugLogs || []) {
    if (log?.step_id) {
      map.set(log.step_id, log.status || 'unknown')
    }
  }
  return map
})

const statusStyleMap = {
  success: { fill: '#ecfdf3', stroke: '#22c55e' },
  failed: { fill: '#fef2f2', stroke: '#ef4444' },
  retrying: { fill: '#fffbeb', stroke: '#f59e0b' },
  unknown: { fill: '#f8fafc', stroke: '#94a3b8' }
}

const provisionStyle = { fill: '#eff6ff', stroke: '#3b82f6' }

const getStatusStyle = (status, actionKey) => {
  if (status === 'unknown' && PLUGIN_ACTIONS.has(actionKey)) {
    return provisionStyle
  }
  return statusStyleMap[status] || statusStyleMap.unknown
}

const buildVisibleNodes = (block) => {
  if (props.customerPreview) {
    return [
      {
        id: `${block.id || 'block'}__public`,
        name: block.customer_label || block.name || '分组步骤',
        action_key: 'group',
        source_step_id: null
      }
    ]
  }
  return (block.internal_steps || []).map((step, index) => ({
    id: step.id || `${block.id || 'block'}__${index}`,
    name: step.name || `步骤${index + 1}`,
    action_key: step.action_key || 'log',
    source_step_id: step.id || null
  }))
}

// 记录 nodeId -> { blockIndex, stepIndex } 的映射，用于点击事件
let nodeStepMap = {}

const renderGraph = () => {
  if (!graph) return
  graph.clearCells()
  nodeStepMap = {}
  if (!hasBlocks.value) return

  const blocks = props.draft.blocks || []
  let top = 24
  let lastNodeId = null

  blocks.forEach((block, blockIndex) => {
    const blockId = block.id || `v2_block_${blockIndex}`
    const nodes = buildVisibleNodes(block)
    const blockHeight = Math.max(86, 36 + nodes.length * 58)

    graph.addNode({
      id: blockId,
      shape: 'rect',
      x: 30,
      y: top,
      width: 460,
      height: blockHeight,
      attrs: {
        body: {
          fill: '#f8fafc',
          stroke: '#cbd5e1',
          strokeWidth: 1.2,
          rx: 10,
          ry: 10
        },
        label: {
          text: `${blockIndex + 1}. ${block.name || '分组步骤'}`,
          fill: '#0f172a',
          fontSize: 13,
          fontWeight: 600,
          textAnchor: 'start',
          refX: 16,
          refY: 22
        }
      }
    })

    let prevInBlockId = null
    nodes.forEach((node, index) => {
      const stepStatus = node.source_step_id ? latestStatusByStepId.value.get(node.source_step_id) : 'unknown'
      const style = getStatusStyle(stepStatus || 'unknown', node.action_key)
      const nodeId = node.id

      // 记录映射
      nodeStepMap[nodeId] = { blockIndex, stepIndex: index }

      const actionLabel = props.actionLabels[node.action_key] || node.action_key
      const labelText = props.customerPreview
        ? node.name
        : `${actionLabel} - ${node.name}`

      graph.addNode({
        id: nodeId,
        shape: 'rect',
        x: 50,
        y: top + 34 + index * 56,
        width: 420,
        height: 42,
        attrs: {
          body: {
            fill: style.fill,
            stroke: style.stroke,
            strokeWidth: 1.2,
            rx: 8,
            ry: 8,
            cursor: 'pointer'
          },
          label: {
            text: labelText,
            fill: '#111827',
            fontSize: 12,
            cursor: 'pointer',
            textWrap: {
              width: 390,
              height: 42,
              ellipsis: true
            }
          }
        }
      })

      if (prevInBlockId) {
        graph.addEdge({
          source: prevInBlockId,
          target: nodeId,
          attrs: {
            line: {
              stroke: '#94a3b8',
              strokeWidth: 1.2,
              targetMarker: {
                name: 'block',
                width: 8,
                height: 8
              }
            }
          }
        })
      }

      if (lastNodeId && index === 0) {
        graph.addEdge({
          source: lastNodeId,
          target: nodeId,
          attrs: {
            line: {
              stroke: '#64748b',
              strokeDasharray: '6 4',
              strokeWidth: 1.2,
              targetMarker: {
                name: 'block',
                width: 8,
                height: 8
              }
            }
          }
        })
      }

      prevInBlockId = nodeId
      lastNodeId = nodeId
    })

    top += blockHeight + 24
  })

  graph.centerContent()
}

onMounted(() => {
  graph = new Graph({
    container: containerRef.value,
    background: {
      color: '#ffffff'
    },
    grid: {
      size: 10,
      visible: true
    },
    panning: true,
    mousewheel: {
      enabled: true,
      modifiers: ['ctrl', 'meta'],
      minScale: 0.5,
      maxScale: 1.8
    },
    connecting: {
      allowBlank: false,
      allowLoop: false,
      allowNode: false,
      allowEdge: false
    },
    interacting: {
      nodeMovable: false,
      edgeMovable: false,
      edgeLabelMovable: false,
      arrowheadMovable: false
    }
  })

  // 监听节点点击，发射到父组件
  graph.on('cell:click', ({ cell }) => {
    const nodeId = cell.id
    const mapping = nodeStepMap[nodeId]
    if (mapping) {
      emit('node-click', {
        nodeId,
        blockIndex: mapping.blockIndex,
        stepIndex: mapping.stepIndex
      })
    }
  })

  renderGraph()
})

watch(
  () => [props.draft, props.customerPreview, props.debugLogs],
  () => {
    renderGraph()
  },
  { deep: true }
)

onBeforeUnmount(() => {
  if (graph) {
    graph.dispose()
    graph = null
  }
})
</script>
