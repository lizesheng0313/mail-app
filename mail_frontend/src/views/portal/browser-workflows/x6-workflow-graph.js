import { Graph, Path } from '@antv/x6'

export const WORKFLOW_NODE_SHAPE = 'browser-workflow-node'
export const WORKFLOW_LOOP_BODY_SHAPE = 'browser-workflow-loop-body'
const DEFAULT_NODE_SIZE = { width: 224, height: 68 }
const WORKFLOW_EDGE_TOOLS_NAME = 'workflow-edge-edit'
const BRANCHING_NODE_KINDS = new Set(['condition', 'loop', 'pagination'])
let shapeRegistered = false
let connectorRegistered = false

function registerWorkflowEdgeConnector() {
  if (connectorRegistered) return
  Graph.registerConnector('curveConnector', (sourcePoint, targetPoint, routePoints = []) => {
    const path = new Path()
    path.appendSegment(Path.createSegment('M', sourcePoint.x - 4, sourcePoint.y))
    path.appendSegment(Path.createSegment('L', sourcePoint.x + 12, sourcePoint.y))

    let controlPoint1
    let controlPoint2
    if (routePoints.length >= 2) {
      [controlPoint1, controlPoint2] = routePoints
    } else if (routePoints.length === 1) {
      controlPoint1 = routePoints[0]
      controlPoint2 = {
        x: (routePoints[0].x + targetPoint.x) / 2,
        y: (routePoints[0].y + targetPoint.y) / 2,
      }
    } else {
      const hgap = Math.abs(targetPoint.x - sourcePoint.x)
      controlPoint1 = {
        x: sourcePoint.x < targetPoint.x ? sourcePoint.x + hgap / 2 : sourcePoint.x - hgap / 2,
        y: sourcePoint.y,
      }
      controlPoint2 = {
        x: sourcePoint.x < targetPoint.x ? targetPoint.x - hgap / 2 : targetPoint.x + hgap / 2,
        y: targetPoint.y,
      }
    }

    path.appendSegment(Path.createSegment(
      'C',
      controlPoint1.x,
      controlPoint1.y,
      controlPoint2.x,
      controlPoint2.y,
      targetPoint.x - 6,
      targetPoint.y,
    ))
    path.appendSegment(Path.createSegment('L', targetPoint.x + 2, targetPoint.y))
    return path.serialize()
  }, true)
  connectorRegistered = true
}

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
  if (node.kind === 'loop') {
    return [
      { id: 'output-loop', label: '循环体', group: 'loopBody' },
      { id: 'output-done', label: '循环完成', group: 'out' },
    ]
  }
  if (node.kind === 'pagination') return [{ id: 'output-next', label: '下一页' }, { id: 'output-done', label: '结束分页' }]
  return node.kind === 'end' ? [] : [{ id: 'output', label: '出口' }]
}

function edgeVertices(edge) {
  // Old Manhattan vertices are ignored; only explicit user adjustments persist.
  return edge?.routing === 'manual' && Array.isArray(edge?.vertices)
    ? edge.vertices.filter(vertex => Number.isFinite(Number(vertex?.x)) && Number.isFinite(Number(vertex?.y)))
      .map(vertex => ({ x: Number(vertex.x), y: Number(vertex.y) }))
    : []
}

function horizontalEdgeVertices(sourcePoint, targetPoint) {
  if (!sourcePoint || !targetPoint) return []
  const sourceX = Number(sourcePoint.x)
  const sourceY = Number(sourcePoint.y)
  const targetX = Number(targetPoint.x)
  const targetY = Number(targetPoint.y)
  if (![sourceX, sourceY, targetX, targetY].every(Number.isFinite)) return []

  const hgap = Math.abs(targetX - sourceX)
  const direction = sourceX < targetX ? 1 : -1
  return [
    { x: sourceX + direction * (hgap / 3), y: sourceY },
    { x: sourceX + direction * ((hgap * 2) / 3), y: targetY },
  ]
}

function workflowPortPoint(node, portId, size, position) {
  const ports = getWorkflowPortItems(node)
  const port = ports.find(item => item.id === portId)
  if (port?.group === 'loopBody') {
    return { x: position.x + (size.width / 2), y: position.y + size.height }
  }

  const outputPorts = ports.filter(item => item.group === 'out')
  const outputIndex = outputPorts.findIndex(item => item.id === portId)
  const y = outputPorts.length <= 1 || outputIndex < 0
    ? size.height / 2
    : size.height * ((outputIndex + 1) / (outputPorts.length + 1))
  return { x: position.x + size.width, y: position.y + y }
}

function automaticEdgeVertices(edge, options = {}) {
  const sourceNode = options.nodeById?.get(edge.source)
  const targetNode = options.nodeById?.get(edge.target)
  if (!sourceNode?.position || !targetNode?.position) return []

  const sourceSize = options.getNodeSize?.(sourceNode) || DEFAULT_NODE_SIZE
  const targetSize = options.getNodeSize?.(targetNode) || DEFAULT_NODE_SIZE
  const sourcePosition = {
    x: Number(sourceNode.position.x || 0),
    y: Number(sourceNode.position.y || 0),
  }
  const targetPosition = {
    x: Number(targetNode.position.x || 0),
    y: Number(targetNode.position.y || 0),
  }
  const sourcePoint = workflowPortPoint(sourceNode, branchPortId(edge), sourceSize, sourcePosition)
  const targetPoint = {
    x: targetPosition.x,
    y: targetPosition.y + (targetSize.height / 2),
  }
  return horizontalEdgeVertices(sourcePoint, targetPoint)
}

function refreshAutomaticEdgeVertices(edge) {
  const workflowEdge = edge?.getData?.()?.workflowEdge
  if (!edge || workflowEdge?.routing === 'manual') return
  const sourcePoint = edge.getSourcePoint?.()
  const targetPoint = edge.getTargetPoint?.()
  const vertices = horizontalEdgeVertices(sourcePoint, targetPoint)
  if (vertices.length) edge.setVertices(vertices)
  edge.setConnector('curveConnector')
}

function workflowEdgePortKey(edge, sourceNode) {
  if (!BRANCHING_NODE_KINDS.has(sourceNode?.kind)) return 'output'
  return edge.condition?.branch || (edge.condition?.default ? 'default' : 'output')
}

export function getWorkflowPortItems(node) {
  const outputs = branchPorts(node).map((port, index, ports) => ({
    id: port.id,
    group: port.group || 'out',
    args: port.group === 'loopBody'
      ? { x: '50%' }
      : { y: ports.filter(item => (item.group || 'out') === 'out').length === 1 ? '50%' : `${((index + 1) / (ports.length + 1)) * 100}%` },
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
        loopBody: {
          position: 'bottom',
          markup: [{ tagName: 'circle', selector: 'circle' }],
        },
      },
      items: getWorkflowPortItems(node),
    },
  }
}

export function buildWorkflowEdgeCell(edge, options = {}) {
  const sourceNode = options.nodeById?.get(edge.source)
  const targetNode = options.nodeById?.get(edge.target)
  const isLoopReturn = sourceNode?.kind === 'return_to_page' && targetNode?.kind === 'loop'
  const vertices = edgeVertices(edge)
  return {
    id: edge.id,
    shape: 'edge',
    source: { cell: edge.source, port: branchPortId(edge) },
    target: { cell: edge.target, port: 'input' },
    vertices: vertices.length ? vertices : automaticEdgeVertices(edge, options),
    router: { name: 'normal' },
    connector: { name: 'curveConnector' },
    attrs: {
      line: {
        stroke: '#91a197',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        targetMarker: { name: 'classic', width: 8, height: 6 },
      },
    },
    labels: edge.label ? [{ position: 0.5, attrs: { label: { text: edge.label } } }] : [],
    data: { workflowEdge: edge },
    visible: !isLoopReturn,
  }
}

export function sanitizeWorkflowGraphDocument(document = {}) {
  const nodes = Array.isArray(document.nodes) ? document.nodes : []
  const nodeIds = new Set(nodes.map(node => node.id))
  const nodeById = new Map(nodes.map(node => [node.id, node]))
  const usedOutputPorts = new Set()
  const edges = []
  for (const edge of Array.isArray(document.edges) ? document.edges : []) {
    if (!edge?.id || !nodeIds.has(edge.source) || !nodeIds.has(edge.target) || edge.source === edge.target) continue
    const outputPortKey = `${edge.source}:${workflowEdgePortKey(edge, nodeById.get(edge.source))}`
    if (usedOutputPorts.has(outputPortKey)) continue
    usedOutputPorts.add(outputPortKey)
    edges.push(edge)
  }
  return { nodes, edges }
}

function loopBodyNodeIds(loopNode, edges, nodeById) {
  const bodyEdge = edges.find(edge => edge.source === loopNode.id && edge.condition?.branch === 'loop')
  if (!bodyEdge) return []
  const found = []
  const visited = new Set()
  const pending = [bodyEdge.target]
  while (pending.length) {
    const nodeId = pending.shift()
    if (!nodeId || nodeId === loopNode.id || visited.has(nodeId) || !nodeById.has(nodeId)) continue
    visited.add(nodeId)
    found.push(nodeId)
    edges.filter(edge => edge.source === nodeId).forEach(edge => {
      if (edge.target !== loopNode.id) pending.push(edge.target)
    })
  }
  return found
}

function buildLoopBodyFrameCells(nodes, edges, options = {}) {
  const nodeById = new Map(nodes.map(node => [node.id, node]))
  return nodes.filter(node => node.kind === 'loop').map(loopNode => {
    const bodyNodes = loopBodyNodeIds(loopNode, edges, nodeById).map(nodeId => nodeById.get(nodeId)).filter(Boolean)
    if (!bodyNodes.length) return null
    const embeddedNodes = [loopNode, ...bodyNodes]
    const bounds = embeddedNodes.map(node => {
      const size = options.getNodeSize?.(node) || DEFAULT_NODE_SIZE
      return {
        left: Number(node.position?.x || 0),
        top: Number(node.position?.y || 0),
        right: Number(node.position?.x || 0) + size.width,
        bottom: Number(node.position?.y || 0) + size.height,
      }
    })
    const left = Math.min(...bounds.map(item => item.left)) - 34
    const top = Math.min(...bounds.map(item => item.top)) - 58
    const right = Math.max(...bounds.map(item => item.right)) + 34
    const bottom = Math.max(...bounds.map(item => item.bottom)) + 34
    return {
      id: `${loopNode.id}::loop-body`,
      shape: WORKFLOW_LOOP_BODY_SHAPE,
      x: left,
      y: top,
      width: Math.max(360, right - left),
      height: Math.max(180, bottom - top),
      zIndex: -10,
      data: {
        loopTitle: loopNode.title || '循环处理',
        bodyCount: bodyNodes.length,
        loopNodeId: loopNode.id,
        embeddedNodeIds: embeddedNodes.map(node => node.id),
      },
    }
  }).filter(Boolean)
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
      ? `<div class="x6-workflow-node-detail-row"><span>处理范围</span><strong>${escapeHtml(node.config?.loop_type === 'count' ? `重复 ${node.config?.max_iterations || 20} 次` : (node.config?.loop_type === 'infinite' ? `最多 ${node.config?.max_iterations || 20} 次` : '列表中的每个项目'))}</strong></div><div class="x6-workflow-node-detail-row"><span>当前数据</span><small>当前项目、当前序号</small></div><div class="x6-workflow-loop-ports"><span>↓ 循环体</span><span>循环完成 →</span></div>`
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

function createLoopBodyElement(cell) {
  const data = cell.getData() || {}
  const element = document.createElement('div')
  element.className = 'x6-workflow-loop-body'
  element.innerHTML = `
    <div class="x6-workflow-loop-body-heading">
      <strong>↻ ${escapeHtml(data.loopTitle || '循环处理')}</strong>
      <span>里面包含 ${Number(data.bodyCount || 0)} 个步骤</span>
    </div>
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
  Graph.registerNode(WORKFLOW_LOOP_BODY_SHAPE, {
    inherit: 'html',
    width: 360,
    height: 180,
    effect: ['data', 'position', 'size'],
    html: createLoopBodyElement,
  }, true)
  shapeRegistered = true
}

const htmlPositionSyncedViews = new WeakSet()

function syncWorkflowHtmlPosition(view, graph, position = view?.cell?.getPosition?.()) {
  if (!view || !position) return
  const foreignObject = view?.selectors?.fo
  if (!foreignObject) return
  const translation = graph?.translate?.() || { tx: 0, ty: 0 }
  const x = String(Number(position.x || 0) + Number(translation.tx || 0))
  const y = String(Number(position.y || 0) + Number(translation.ty || 0))
  if (foreignObject.getAttribute('x') !== x) foreignObject.setAttribute('x', x)
  if (foreignObject.getAttribute('y') !== y) foreignObject.setAttribute('y', y)
}

function installWorkflowHtmlPositionSync(view, graph) {
  if (!view || htmlPositionSyncedViews.has(view) || typeof view.translate !== 'function') return
  const translate = view.translate
  view.translate = function syncWorkflowNodeTranslation(...args) {
    translate.apply(this, args)
    syncWorkflowHtmlPosition(this, graph)
  }
  htmlPositionSyncedViews.add(view)
  syncWorkflowHtmlPosition(view, graph)
}

function syncWorkflowHtmlCellPosition(graph, cell, position) {
  const view = graph.findViewByCell(cell)
  if (!view) return
  installWorkflowHtmlPositionSync(view, graph)
  syncWorkflowHtmlPosition(view, graph, position)
}

function hideWorkflowEdgeTools(graph) {
  graph.getEdges().forEach(edge => graph.findViewByCell(edge)?.removeTools())
}

function showWorkflowEdgeTools(graph, edge, onVerticesChanged) {
  hideWorkflowEdgeTools(graph)
  const view = graph.findViewByCell(edge)
  if (!view) return
  view.addTools({
    name: WORKFLOW_EDGE_TOOLS_NAME,
    items: [
      {
        name: 'vertices',
        args: {
          addable: true,
          removable: true,
          removeRedundancies: true,
          attrs: { r: 5, fill: '#fff', stroke: '#4b9566', 'stroke-width': 2, cursor: 'move' },
          onChanged: onVerticesChanged,
        },
      },
      {
        name: 'source-arrowhead',
        args: {
          attrs: { d: 'M 8 -6 -8 0 8 6 Z', fill: '#fff', stroke: '#4c89a8', 'stroke-width': 2, cursor: 'move' },
        },
      },
      {
        name: 'target-arrowhead',
        args: {
          attrs: { d: 'M -8 -6 8 0 -8 6 Z', fill: '#fff', stroke: '#4b9566', 'stroke-width': 2, cursor: 'move' },
        },
      },
    ],
  })
}

export function createWorkflowGraph(container, options = {}) {
  registerWorkflowNodeShape()
  registerWorkflowEdgeConnector()
  const graph = new Graph({
    container,
    width: options.width || container.clientWidth || 1200,
    height: options.height || 3000,
    background: { color: '#f8faf8' },
    grid: { size: 20, visible: true, type: 'dot', args: { color: '#d2ded4', thickness: 1 } },
    panning: { enabled: true },
    mousewheel: { enabled: true, modifiers: ['ctrl', 'meta'] },
    selecting: { enabled: true, rubberband: false, showNodeSelectionBox: false },
    interacting: {
      nodeMovable: true,
      edgeMovable: true,
      edgeLabelMovable: false,
      arrowheadMovable: true,
      vertexMovable: true,
      vertexAddable: true,
      magnetConnectable: true,
    },
    connecting: {
      allowBlank: false,
      allowLoop: false,
      allowNode: false,
      allowEdge: false,
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
      connector: 'curveConnector',
      createEdge(args) {
        const vertices = horizontalEdgeVertices(args?.sourcePoint, args?.targetPoint)
        return graph.createEdge({
          shape: 'edge',
          vertices: vertices.length ? vertices : undefined,
          connector: 'curveConnector',
          attrs: {
            line: {
              stroke: '#91a197',
              strokeWidth: 1.8,
              strokeLinecap: 'round',
              targetMarker: { name: 'classic', width: 8, height: 6 },
            },
          },
        })
      },
    },
  })
  graph.on('node:click', (args) => {
    hideWorkflowEdgeTools(graph)
    if (args?.node?.shape === WORKFLOW_LOOP_BODY_SHAPE) {
      const loopNode = graph.getCellById(args.node.getData()?.loopNodeId)
      if (loopNode) options.onNodeClick?.({ ...args, node: loopNode })
      return
    }
    options.onNodeClick?.(args)
  })
  graph.on('edge:click', (args) => {
    if (args?.edge) showWorkflowEdgeTools(graph, args.edge, options.onEdgeVerticesChanged)
    options.onEdgeClick?.(args)
  })
  graph.on('view:mounted', ({ view }) => {
    if (![WORKFLOW_NODE_SHAPE, WORKFLOW_LOOP_BODY_SHAPE].includes(view?.cell?.shape)) return
    installWorkflowHtmlPositionSync(view, graph)
    Promise.resolve().then(() => syncWorkflowHtmlPosition(view, graph))
  })
  graph.on('translate', () => {
    graph.getNodes().forEach(node => {
      const view = graph.findViewByCell(node)
      if (!view) return
      installWorkflowHtmlPositionSync(view, graph)
      syncWorkflowHtmlPosition(view, graph)
    })
  })
  graph.on('node:moved', ({ node, ...args }) => {
    options.onNodeMoved?.({ node, ...args })
    graph.getConnectedEdges(node).forEach(refreshAutomaticEdgeVertices)
  })
  graph.on('edge:connected', ({ edge, ...args }) => {
    options.onEdgeConnected?.({ edge, ...args })
    refreshAutomaticEdgeVertices(edge)
  })
  graph.on('edge:move', ({ edge, e, view }) => {
    if (!edge || edge.getVertices?.().length || !view?.getEventData || !e) return
    const dragStart = view.getEventData(e)
    const x = Number(dragStart?.x)
    const y = Number(dragStart?.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
    edge.insertVertex({ x, y }, 0, { ui: true })
  })
  graph.on('edge:moved', options.onEdgeMoved)
  graph.on('edge:removed', options.onEdgeRemoved)
  graph.on('blank:click', (args) => {
    hideWorkflowEdgeTools(graph)
    options.onBlankClick?.(args)
  })
  return graph
}

export function syncWorkflowGraph(graph, document, options = {}) {
  const { nodes, edges } = sanitizeWorkflowGraphDocument(document)
  const nodeById = new Map(nodes.map(node => [node.id, node]))
  const loopBodyFrames = buildLoopBodyFrameCells(nodes, edges, options)
  const loopFrameByNodeId = new Map()
  loopBodyFrames.forEach(frame => {
    for (const nodeId of frame.data.embeddedNodeIds || []) loopFrameByNodeId.set(nodeId, frame.id)
  })
  const validIds = new Set([...nodes.map(node => node.id), ...edges.map(edge => edge.id), ...loopBodyFrames.map(frame => frame.id)])

  graph.batchUpdate(() => {
    graph.getCells().forEach(cell => {
      if (validIds.has(cell.id)) return
      if (cell.shape === WORKFLOW_LOOP_BODY_SHAPE) {
        for (const child of [...(cell.getChildren() || [])]) cell.unembed(child, { silent: true })
      }
      cell.remove({ deep: false })
    })
    loopBodyFrames.forEach(frame => {
      const cell = graph.getCellById(frame.id)
      if (cell) {
        cell.position(frame.x, frame.y)
        cell.resize(frame.width, frame.height)
        cell.setData(frame.data)
        cell.setZIndex(frame.zIndex)
        syncWorkflowHtmlCellPosition(graph, cell, { x: frame.x, y: frame.y })
      } else {
        const addedCell = graph.addNode(frame)
        syncWorkflowHtmlCellPosition(graph, addedCell, { x: frame.x, y: frame.y })
      }
    })
    nodes.forEach(node => {
      const cell = graph.getCellById(node.id)
      const next = buildWorkflowNodeCell(node, options)
      if (cell) {
        cell.position(next.x, next.y)
        cell.resize(next.width, next.height)
        syncWorkflowHtmlCellPosition(graph, cell, { x: next.x, y: next.y })
        cell.setData(next.data)
        cell.removePorts()
        cell.addPorts(next.ports.items)
      } else {
        const addedCell = graph.addNode(next)
        syncWorkflowHtmlCellPosition(graph, addedCell, { x: next.x, y: next.y })
      }
    })
    nodes.forEach(node => {
      const cell = graph.getCellById(node.id)
      if (!cell) return
      const desiredParentId = loopFrameByNodeId.get(node.id)
      const currentParent = cell.getParent?.()
      if (currentParent?.id && currentParent.id !== desiredParentId) {
        currentParent.unembed(cell, { silent: true })
      }
      if (!desiredParentId || cell.getParentId?.() === desiredParentId) return
      graph.getCellById(desiredParentId)?.addChild(cell, { silent: true })
    })
    edges.forEach(edge => {
      const cell = graph.getCellById(edge.id)
      const next = buildWorkflowEdgeCell(edge, { nodeById, getNodeSize: options.getNodeSize })
      if (cell) {
        cell.setSource(next.source)
        cell.setTarget(next.target)
        cell.setRouter(next.router.name, next.router.args)
        cell.setConnector(next.connector.name, next.connector.args)
        cell.setVertices(next.vertices)
        cell.setAttrs(next.attrs)
        cell.setData(next.data)
        if (next.visible === false) cell.hide()
        else cell.show()
      } else {
        graph.addEdge(next)
      }
    })
  })
  graph.getEdges().forEach(refreshAutomaticEdgeVertices)
  return graph
}

export function syncWorkflowGraphSelection(graph, selection = {}) {
  if (!graph) return
  const selectedNodeId = String(selection.nodeId || '')
  const selectedEdgeId = String(selection.edgeId || '')

  graph.getNodes().forEach(node => {
    if (node.shape !== WORKFLOW_NODE_SHAPE) return
    const view = graph.findViewByCell(node)
    view?.container?.classList.toggle('x6-node-selected', node.id === selectedNodeId)
  })

  graph.getEdges().forEach(edge => {
    const workflowEdge = edge.getData()?.workflowEdge || {}
    const isSelected = edge.id === selectedEdgeId
    const isConnected = Boolean(selectedNodeId)
      && (workflowEdge.source === selectedNodeId || workflowEdge.target === selectedNodeId)
    const view = graph.findViewByCell(edge)
    view?.container?.classList.toggle('workflow-edge-selected', isSelected)
    view?.container?.classList.toggle('workflow-edge-connected', !isSelected && isConnected)
    edge.attr('line/stroke', isSelected ? '#b37b20' : (isConnected ? '#287d4f' : '#91a197'))
    edge.attr('line/strokeWidth', isSelected ? 3 : (isConnected ? 2.8 : 1.6))
  })
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
