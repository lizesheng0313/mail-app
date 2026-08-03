import { Graph } from '@antv/x6'

export const WORKFLOW_NODE_SHAPE = 'browser-workflow-node'
const DEFAULT_NODE_SIZE = { width: 224, height: 68 }
let shapeRegistered = false

function branchPortId(edgeOrBranch = {}) {
  const branch = edgeOrBranch.condition?.branch || (edgeOrBranch.condition?.default ? 'default' : '')
  return branch ? `output-${branch}` : 'output'
}

function branchPorts(node) {
  if (node.kind === 'condition') {
    const branches = node.config?.branches || []
    return [
      ...branches.map(branch => ({ id: `output-${branch.id}`, label: 'IF' })),
      { id: 'output-default', label: 'ELSE' },
    ]
  }
  if (node.kind === 'loop') return [{ id: 'output-loop', label: '循环' }, { id: 'output-done', label: '循环结束' }]
  if (node.kind === 'pagination') return [{ id: 'output-next', label: '下一页' }, { id: 'output-done', label: '结束分页' }]
  return node.kind === 'end' ? [] : [{ id: 'output', label: '出口' }]
}

export function getWorkflowPortItems(node) {
  const outputs = branchPorts(node).map((port, index, ports) => ({
    id: port.id,
    group: 'out',
    args: { y: ports.length === 1 ? '50%' : `${((index + 1) / (ports.length + 1)) * 100}%` },
    attrs: { circle: { r: 4, magnet: true, fill: '#fff', stroke: '#4b9566', strokeWidth: 1.8 } },
  }))
  return [
    ...(node.kind === 'start' ? [] : [{ id: 'input', group: 'in', attrs: { circle: { r: 4, magnet: true, fill: '#fff', stroke: '#4c89a8', strokeWidth: 1.8 } } }]),
    ...outputs,
  ]
}

export function buildWorkflowNodeCell(node, options = {}) {
  const size = options.getNodeSize?.(node) || DEFAULT_NODE_SIZE
  return {
    id: node.id,
    shape: WORKFLOW_NODE_SHAPE,
    x: Number(node.position?.x || 0),
    y: Number(node.position?.y || 0),
    width: size.width,
    height: size.height,
    data: {
      workflowNode: node,
      onDelete: options.onDelete,
      icon: options.getNodeIcon?.(node),
      tone: options.getNodeTone?.(node),
    },
    ports: {
      groups: {
        in: {
          position: 'left',
          markup: [{ tagName: 'circle', selector: 'circle' }],
        },
        out: {
          position: 'right',
          markup: [{ tagName: 'circle', selector: 'circle' }],
        },
      },
      items: getWorkflowPortItems(node),
    },
  }
}

export function buildWorkflowEdgeCell(edge) {
  return {
    id: edge.id,
    shape: 'edge',
    source: { cell: edge.source, port: branchPortId(edge) },
    target: { cell: edge.target, port: 'input' },
    router: { name: 'manhattan' },
    connector: { name: 'rounded', args: { radius: 5 } },
    attrs: {
      line: {
        stroke: '#91a197',
        strokeWidth: 1.6,
        strokeLinecap: 'round',
        targetMarker: { name: 'block', width: 6, height: 6 },
      },
    },
    labels: edge.label ? [{ position: 0.5, attrs: { label: { text: edge.label } } }] : [],
    data: { workflowEdge: edge },
  }
}

export function sanitizeWorkflowGraphDocument(document = {}) {
  const nodes = Array.isArray(document.nodes) ? document.nodes : []
  const nodeIds = new Set(nodes.map(node => node.id))
  const edges = (Array.isArray(document.edges) ? document.edges : [])
    .filter(edge => edge?.id && nodeIds.has(edge.source) && nodeIds.has(edge.target) && edge.source !== edge.target)
  return { nodes, edges }
}

function createNodeElement(cell) {
  const data = cell.getData() || {}
  const node = data.workflowNode || {}
  const element = document.createElement('div')
  element.className = `x6-workflow-node node-${node.kind || 'default'} tone-${data.tone || 'blue'}`
  element.dataset.nodeId = node.id || ''
  const detail = node.kind === 'condition'
    ? (node.config?.branches || []).map((branch, index) => `<div class="x6-workflow-node-detail-row"><span>${index === 0 ? 'IF' : 'ELSE IF'}</span><small>${escapeHtml(branch.label || '未配置条件')}</small></div>`).join('') + '<div class="x6-workflow-node-detail-row"><span>ELSE</span><small>以上条件均未命中</small></div>'
    : node.kind === 'loop'
      ? `<div class="x6-workflow-node-detail-row"><span>循环方式</span><strong>${escapeHtml(node.config?.loop_type || 'array')}</strong></div><div class="x6-workflow-node-detail-row"><span>循环来源</span><small>${escapeHtml(node.config?.source || '未配置')}</small></div>`
      : ['http_request', 'text_process', 'json_stringify', 'set_variable'].includes(node.kind)
        ? `<div class="x6-workflow-node-detail-row"><span>输入输出</span><small>${escapeHtml((node.inputs || []).map(item => item.name).filter(Boolean).join('、') || '未配置')}</small></div>`
        : ''
  element.innerHTML = `
    <div class="x6-workflow-node-heading">
      <span class="x6-workflow-node-icon">${escapeHtml(data.icon || node.icon || '·')}</span>
      <div class="x6-workflow-node-copy">
        <strong>${escapeHtml(node.title || node.id || '未命名节点')}</strong>
        <small>${escapeHtml(node.description || '未配置')}</small>
      </div>
    </div>
    ${detail ? `<div class="x6-workflow-node-detail">${detail}</div>` : ''}
  `
  return element
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function registerWorkflowNodeShape() {
  if (shapeRegistered) return
  Graph.registerNode(WORKFLOW_NODE_SHAPE, {
    inherit: 'html',
    width: DEFAULT_NODE_SIZE.width,
    height: DEFAULT_NODE_SIZE.height,
    effect: ['data', 'position', 'size'],
    html: createNodeElement,
  }, true)
  shapeRegistered = true
}

export function createWorkflowGraph(container, options = {}) {
  registerWorkflowNodeShape()
  const graph = new Graph({
    container,
    width: options.width || container.clientWidth || 1200,
    height: options.height || 3000,
    background: { color: '#fbfdfb' },
    grid: { size: 20, visible: true, type: 'dot', args: { color: '#d5e2d6', thickness: 1 } },
    panning: true,
    mousewheel: { enabled: true, modifiers: ['ctrl', 'meta'] },
    selecting: { enabled: true, rubberband: false, showNodeSelectionBox: true },
    connecting: {
      allowBlank: false,
      allowLoop: false,
      allowMulti: false,
      snap: true,
      highlight: true,
      validateMagnet({ magnet }) {
        return magnet?.getAttribute('port-group') === 'out'
      },
      validateConnection({ sourceView, targetView, sourceMagnet, targetMagnet }) {
        if (!sourceView || !targetView || sourceView === targetView) return false
        return sourceMagnet?.getAttribute('port-group') === 'out'
          && targetMagnet?.getAttribute('port-group') === 'in'
      },
      sourceAnchor: 'right',
      targetAnchor: 'left',
      router: { name: 'manhattan' },
      connector: { name: 'rounded', args: { radius: 5 } },
    },
  })
  graph.on('node:click', options.onNodeClick)
  graph.on('edge:click', options.onEdgeClick)
  graph.on('node:moved', options.onNodeMoved)
  graph.on('edge:connected', options.onEdgeConnected)
  graph.on('edge:removed', options.onEdgeRemoved)
  graph.on('blank:click', options.onBlankClick)
  return graph
}

export function syncWorkflowGraph(graph, document, options = {}) {
  const { nodes, edges } = sanitizeWorkflowGraphDocument(document)
  const validIds = new Set([...nodes.map(node => node.id), ...edges.map(edge => edge.id)])

  graph.batchUpdate(() => {
    graph.getCells().forEach(cell => {
      if (!validIds.has(cell.id)) cell.remove()
    })
    nodes.forEach(node => {
      const cell = graph.getCellById(node.id)
      const next = buildWorkflowNodeCell(node, options)
      if (cell) {
        cell.position(next.x, next.y)
        cell.resize(next.width, next.height)
        cell.setData(next.data)
        cell.removePorts()
        cell.addPorts(next.ports.items)
      } else {
        graph.addNode(next)
      }
    })
    edges.forEach(edge => {
      const cell = graph.getCellById(edge.id)
      const next = buildWorkflowEdgeCell(edge)
      if (cell) {
        cell.setSource(next.source)
        cell.setTarget(next.target)
        cell.setRouter(next.router.name, next.router.args)
        cell.setConnector(next.connector.name, next.connector.args)
        cell.setAttrs(next.attrs)
        cell.setData(next.data)
      } else {
        graph.addEdge(next)
      }
    })
  })
  return graph
}

export function readWorkflowPositions(graph, nodes = []) {
  return new Map(nodes.map(node => {
    const cell = graph.getCellById(node.id)
    const position = cell?.getPosition() || node.position || { x: 0, y: 0 }
    return [node.id, { x: position.x, y: position.y }]
  }))
}

export function disposeWorkflowGraph(graph) {
  graph?.dispose()
}
