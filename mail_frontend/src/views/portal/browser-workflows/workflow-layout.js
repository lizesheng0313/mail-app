const DEFAULT_NODE_WIDTH = 224
const DEFAULT_NODE_HEIGHT = 68

function edgePortKey(edge = {}) {
  return edge.condition?.branch || (edge.condition?.default ? 'default' : '')
}

function centeredLaneOffset(index, count, spread) {
  return (index - (count - 1) / 2) * spread
}

export function getWorkflowEdgeLaneOffsets(edge, edges = []) {
  const sourcePeers = edges.filter(candidate => (
    candidate.source === edge.source && edgePortKey(candidate) === edgePortKey(edge)
  ))
  const targetPeers = edges.filter(candidate => candidate.target === edge.target)
  const sourceIndex = Math.max(0, sourcePeers.findIndex(candidate => candidate.id === edge.id))
  const targetIndex = Math.max(0, targetPeers.findIndex(candidate => candidate.id === edge.id))

  return {
    source: centeredLaneOffset(sourceIndex, sourcePeers.length || 1, 16),
    target: centeredLaneOffset(targetIndex, targetPeers.length || 1, 12),
  }
}

function buildLevels(nodes, edges) {
  const ids = new Set(nodes.map(node => node.id))
  const incoming = new Map(nodes.map(node => [node.id, 0]))
  const outgoing = new Map(nodes.map(node => [node.id, []]))

  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) continue
    incoming.set(edge.target, incoming.get(edge.target) + 1)
    outgoing.get(edge.source).push(edge.target)
  }

  const queue = nodes.filter(node => incoming.get(node.id) === 0).map(node => node.id)
  const levels = new Map(queue.map(id => [id, 0]))
  while (queue.length) {
    const source = queue.shift()
    const nextLevel = levels.get(source) + 1
    for (const target of outgoing.get(source)) {
      levels.set(target, Math.max(levels.get(target) || 0, nextLevel))
      incoming.set(target, incoming.get(target) - 1)
      if (incoming.get(target) === 0) queue.push(target)
    }
  }

  let fallbackLevel = Math.max(-1, ...levels.values()) + 1
  for (const node of nodes) {
    if (levels.has(node.id)) continue
    levels.set(node.id, fallbackLevel)
    fallbackLevel += 1
  }
  return levels
}

export function getWorkflowExecutionOrder(nodes = [], edges = []) {
  const nodeById = new Map(nodes.map(node => [node.id, node]))
  const outgoing = new Map(nodes.map(node => [node.id, []]))
  const incoming = new Map(nodes.map(node => [node.id, 0]))

  edges.forEach((edge, index) => {
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) return
    outgoing.get(edge.source).push({ edge, index })
    incoming.set(edge.target, incoming.get(edge.target) + 1)
  })

  const branchOrder = (source, edge) => {
    const branch = edge.condition?.branch || (edge.condition?.default ? 'default' : '')
    if (source.kind === 'condition') {
      const branches = source.config?.branches || []
      const index = branches.findIndex(item => item.id === branch)
      return index >= 0 ? index : branches.length + (branch === 'default' ? 0 : 1)
    }
    if (source.kind === 'loop') return branch === 'loop' ? 0 : 1
    if (source.kind === 'pagination') return branch === 'next' ? 0 : 1
    return 0
  }

  for (const [sourceId, connections] of outgoing) {
    const source = nodeById.get(sourceId)
    connections.sort((left, right) => (
      branchOrder(source, left.edge) - branchOrder(source, right.edge)
      || left.index - right.index
    ))
  }

  const canvasOrder = (left, right) => (
    Number(left.position?.x || 0) - Number(right.position?.x || 0)
    || Number(left.position?.y || 0) - Number(right.position?.y || 0)
    || nodes.indexOf(left) - nodes.indexOf(right)
  )

  // A depth-first walk is not an execution order for a branching graph:
  // it can put a merge node before the remaining branch. Use the graph's
  // dependency order instead, while keeping branch order deterministic.
  const compareKeys = (left = [], right = []) => {
    for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
      const leftValue = left[index] ?? -1
      const rightValue = right[index] ?? -1
      if (leftValue !== rightValue) return leftValue - rightValue
    }
    return 0
  }

  const primaryStart = nodes.find(node => node.kind === 'start')
  const priorityKeys = new Map()
  const assignPriority = (nodeId, key, path = new Set()) => {
    const node = nodeById.get(nodeId)
    if (!node || path.has(nodeId)) return
    const previous = priorityKeys.get(nodeId)
    if (previous && compareKeys(previous, key) <= 0) return
    priorityKeys.set(nodeId, key)
    const nextPath = new Set(path)
    nextPath.add(nodeId)
    for (const connection of outgoing.get(nodeId) || []) {
      assignPriority(connection.edge.target, [
        ...key,
        branchOrder(node, connection.edge),
        connection.index,
      ], nextPath)
    }
  }

  if (primaryStart) assignPriority(primaryStart.id, [0])
  const fallbackRoots = nodes
    .filter(node => incoming.get(node.id) === 0 && node.id !== primaryStart?.id)
    .sort(canvasOrder)
  fallbackRoots.forEach((node, index) => assignPriority(node.id, [1, index]))
  for (const node of [...nodes].sort(canvasOrder)) {
    if (!priorityKeys.has(node.id)) assignPriority(node.id, [2, nodes.indexOf(node)])
  }

  const ready = []
  const remainingIncoming = new Map(incoming)
  // The runtime always starts at the first start node, even if malformed data
  // happens to contain an incoming edge to it.
  if (primaryStart) remainingIncoming.set(primaryStart.id, 0)
  for (const node of nodes) {
    if (remainingIncoming.get(node.id) === 0) ready.push(node.id)
  }

  const compareNodeIds = (leftId, rightId) => {
    const keyOrder = compareKeys(priorityKeys.get(leftId), priorityKeys.get(rightId))
    if (keyOrder) return keyOrder
    return canvasOrder(nodeById.get(leftId), nodeById.get(rightId))
  }
  const ordered = []
  const visited = new Set()
  while (ready.length) {
    ready.sort(compareNodeIds)
    const nodeId = ready.shift()
    if (visited.has(nodeId)) continue
    visited.add(nodeId)
    ordered.push(nodeById.get(nodeId))
    for (const connection of outgoing.get(nodeId) || []) {
      if (visited.has(connection.edge.target)) continue
      const nextIncoming = remainingIncoming.get(connection.edge.target) - 1
      remainingIncoming.set(connection.edge.target, nextIncoming)
      if (nextIncoming === 0) ready.push(connection.edge.target)
    }
  }

  // Loops and malformed graphs can contain cycles. They do not have a strict
  // topological order, so append the remaining nodes deterministically.
  for (const node of [...nodes].sort((left, right) => compareNodeIds(left.id, right.id))) {
    if (!visited.has(node.id)) ordered.push(node)
  }
  return ordered
}

export function calculateWorkflowLayout(nodes, edges, options = {}) {
  const nodeWidth = options.nodeWidth || DEFAULT_NODE_WIDTH
  const nodeHeight = options.nodeHeight || DEFAULT_NODE_HEIGHT
  const getNodeSize = options.getNodeSize || (() => ({ width: nodeWidth, height: nodeHeight }))
  const marginX = options.marginX || 56
  const marginY = options.marginY || 56
  const columnGap = options.columnGap || 48
  const rowGap = options.rowGap || 42
  const bandGap = options.bandGap || 92
  const viewportWidth = Math.max(options.viewportWidth || 1200, nodeWidth * 2)
  const availableWidth = Math.max(nodeWidth, viewportWidth - marginX * 2)
  const columnsPerBand = Math.max(2, Math.min(
    options.maxColumns || 12,
    Math.floor((availableWidth + columnGap) / (nodeWidth + columnGap)),
  ))

  const levelById = buildLevels(nodes, edges)
  const groups = new Map()
  for (const node of [...nodes].sort((left, right) => (left.position?.y || 0) - (right.position?.y || 0))) {
    const level = levelById.get(node.id)
    if (!groups.has(level)) groups.set(level, [])
    groups.get(level).push(node)
  }

  const orderedLevels = [...groups.keys()].sort((left, right) => left - right)
  const positions = new Map()
  let bandStartY = marginY

  for (let offset = 0; offset < orderedLevels.length; offset += columnsPerBand) {
    const bandLevels = orderedLevels.slice(offset, offset + columnsPerBand)
    const bandIndex = Math.floor(offset / columnsPerBand)
    const reverse = bandIndex % 2 === 1
    const levelWidths = bandLevels.map(level => Math.max(...groups.get(level).map(node => getNodeSize(node).width)))
    const columnOffsets = []
    levelWidths.reduce((current, width, index) => {
      columnOffsets[index] = current
      return current + width + columnGap
    }, marginX)
    let bandHeight = 0

    bandLevels.forEach((level, localIndex) => {
      const column = reverse ? bandLevels.length - 1 - localIndex : localIndex
      let rowY = bandStartY
      groups.get(level).forEach(node => {
        positions.set(node.id, {
          x: columnOffsets[column],
          y: rowY,
        })
        rowY += getNodeSize(node).height + rowGap
      })
      bandHeight = Math.max(bandHeight, rowY - bandStartY - rowGap)
    })
    bandStartY += bandHeight + bandGap
  }

  return positions
}

function overlaps(left, leftSize, right, rightSize, gap) {
  return !(
    left.x + leftSize.width + gap <= right.x
    || right.x + rightSize.width + gap <= left.x
    || left.y + leftSize.height + gap <= right.y
    || right.y + rightSize.height + gap <= left.y
  )
}

export function resolveWorkflowCollisions(nodes, options = {}) {
  const nodeWidth = options.nodeWidth || DEFAULT_NODE_WIDTH
  const nodeHeight = options.nodeHeight || DEFAULT_NODE_HEIGHT
  const getNodeSize = options.getNodeSize || (() => ({ width: nodeWidth, height: nodeHeight }))
  const gap = options.gap || 12
  const margin = options.margin || 24
  const canvasWidth = options.canvasWidth || 6000
  const canvasHeight = options.canvasHeight || 3000
  const placed = []
  const positions = new Map()
  const movedNodeIds = []

  const clamp = (position, size) => ({
    x: Math.max(margin, Math.min(Number(position?.x || margin), canvasWidth - size.width - margin)),
    y: Math.max(margin, Math.min(Number(position?.y || margin), canvasHeight - size.height - margin)),
  })
  const available = (candidate, size) => placed.every(item => !overlaps(candidate, size, item.position, item.size, gap))
  const nearestAvailablePosition = (preferred, size) => {
    const xCandidates = new Set([preferred.x])
    const yCandidates = new Set([preferred.y])
    for (const item of placed) {
      xCandidates.add(item.position.x - size.width - gap)
      xCandidates.add(item.position.x + item.size.width + gap)
      yCandidates.add(item.position.y - size.height - gap)
      yCandidates.add(item.position.y + item.size.height + gap)
    }
    const candidates = []
    for (const x of xCandidates) {
      for (const y of yCandidates) {
        const candidate = clamp({ x, y }, size)
        candidates.push({
          position: candidate,
          distance: Math.abs(candidate.x - preferred.x) + Math.abs(candidate.y - preferred.y),
        })
      }
    }
    candidates.sort((left, right) => left.distance - right.distance)
    return candidates.find(candidate => available(candidate.position, size))?.position || preferred
  }

  for (const node of nodes) {
    const size = getNodeSize(node)
    const preferred = clamp(node.position, size)
    let resolved = preferred
    if (!available(resolved, size)) {
      resolved = nearestAvailablePosition(preferred, size)
      movedNodeIds.push(node.id)
    }
    positions.set(node.id, resolved)
    placed.push({ id: node.id, position: resolved, size })
  }

  return { positions, movedNodeIds }
}
