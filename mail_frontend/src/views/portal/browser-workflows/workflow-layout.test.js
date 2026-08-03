import { describe, expect, it } from 'vitest'
import { calculateWorkflowLayout, getWorkflowEdgeLaneOffsets, getWorkflowExecutionOrder, resolveWorkflowCollisions } from './workflow-layout'

function linearGraph(count) {
  const nodes = Array.from({ length: count }, (_, index) => ({
    id: `node-${index}`,
    position: { x: index * 10, y: 0 },
  }))
  const edges = nodes.slice(1).map((node, index) => ({
    source: nodes[index].id,
    target: node.id,
  }))
  return { nodes, edges }
}

describe('workflow canvas layout', () => {
  it('fans out edges that share an output or input port', () => {
    const edges = [
      { id: 'first', source: 'source', target: 'top' },
      { id: 'second', source: 'source', target: 'middle' },
      { id: 'third', source: 'source', target: 'middle' },
    ]

    expect(getWorkflowEdgeLaneOffsets(edges[0], edges)).toEqual({ source: -16, target: 0 })
    expect(getWorkflowEdgeLaneOffsets(edges[1], edges)).toEqual({ source: 0, target: -6 })
    expect(getWorkflowEdgeLaneOffsets(edges[2], edges)).toEqual({ source: 16, target: 6 })
  })

  it('orders recording anchors by execution path instead of document storage order', () => {
    const nodes = [
      { id: 'search', kind: 'click', position: { x: 0, y: 0 } },
      { id: 'start', kind: 'start', position: { x: 0, y: 0 } },
      { id: 'query', kind: 'input', position: { x: 0, y: 0 } },
      { id: 'login', kind: 'condition', position: { x: 0, y: 0 }, config: { branches: [{ id: 'logged-in' }, { id: 'default' }] } },
    ]
    const edges = [
      { source: 'start', target: 'login' },
      { source: 'login', target: 'query', condition: { branch: 'default' } },
      { source: 'query', target: 'search' },
    ]

    expect(getWorkflowExecutionOrder(nodes, edges).map(node => node.id)).toEqual([
      'start', 'login', 'query', 'search',
    ])
  })

  it('orders disconnected fallback nodes by their canvas execution direction', () => {
    const nodes = [
      { id: 'later', kind: 'click', position: { x: 480, y: 100 } },
      { id: 'start', kind: 'start', position: { x: 40, y: 100 } },
      { id: 'first', kind: 'input', position: { x: 220, y: 100 } },
    ]

    expect(getWorkflowExecutionOrder(nodes, []).map(node => node.id)).toEqual([
      'start', 'first', 'later',
    ])
  })

  it('keeps every branch before a downstream merge', () => {
    const nodes = [
      { id: 'merge', kind: 'click', position: { x: 600, y: 100 } },
      { id: 'branch-b', kind: 'click', position: { x: 400, y: 220 } },
      { id: 'start', kind: 'start', position: { x: 40, y: 100 } },
      { id: 'condition', kind: 'condition', position: { x: 200, y: 100 }, config: { branches: [{ id: 'branch-a' }, { id: 'default' }] } },
      { id: 'branch-a', kind: 'click', position: { x: 400, y: 100 } },
    ]
    const edges = [
      { source: 'start', target: 'condition' },
      { source: 'condition', target: 'branch-a', condition: { branch: 'branch-a' } },
      { source: 'condition', target: 'branch-b', condition: { default: true } },
      { source: 'branch-a', target: 'merge' },
      { source: 'branch-b', target: 'merge' },
    ]

    expect(getWorkflowExecutionOrder(nodes, edges).map(node => node.id)).toEqual([
      'start', 'condition', 'branch-a', 'branch-b', 'merge',
    ])
  })

  it('wraps a long linear workflow instead of producing one endless row', () => {
    const { nodes, edges } = linearGraph(10)
    const positions = calculateWorkflowLayout(nodes, edges, { viewportWidth: 1200 })
    const rows = new Set([...positions.values()].map(position => position.y))

    expect(rows.size).toBeGreaterThan(1)
    expect(Math.max(...[...positions.values()].map(position => position.x))).toBeLessThan(1200)
  })

  it('keeps a seven-step flow in one direction on a wide canvas', () => {
    const { nodes, edges } = linearGraph(7)
    const positions = calculateWorkflowLayout(nodes, edges, { viewportWidth: 2048 })
    const orderedPositions = nodes.map(node => positions.get(node.id))

    expect(new Set(orderedPositions.map(position => position.y)).size).toBe(1)
    expect(orderedPositions.map(position => position.x)).toEqual([
      56, 328, 600, 872, 1144, 1416, 1688,
    ])
  })

  it('keeps a long flow scrollable instead of wrapping its execution chain', () => {
    const { nodes, edges } = linearGraph(14)
    const positions = calculateWorkflowLayout(nodes, edges, {
      viewportWidth: 6000,
      maxColumns: nodes.length,
    })

    expect(new Set([...positions.values()].map(position => position.y)).size).toBe(1)
    expect(positions.get('node-13').x).toBeGreaterThan(positions.get('node-0').x)
  })

  it('separates parallel nodes in the same graph level', () => {
    const nodes = ['start', 'left', 'right', 'end'].map(id => ({ id, position: { x: 0, y: 0 } }))
    const edges = [
      { source: 'start', target: 'left' },
      { source: 'start', target: 'right' },
      { source: 'left', target: 'end' },
      { source: 'right', target: 'end' },
    ]
    const positions = calculateWorkflowLayout(nodes, edges, { viewportWidth: 1200 })

    expect(positions.get('left').x).toBe(positions.get('right').x)
    expect(positions.get('left').y).not.toBe(positions.get('right').y)
  })

  it('moves only colliding nodes while preserving free positions', () => {
    const nodes = [
      { id: 'first', position: { x: 100, y: 100 } },
      { id: 'second', position: { x: 100, y: 100 } },
      { id: 'free', position: { x: 900, y: 500 } },
    ]
    const result = resolveWorkflowCollisions(nodes)

    expect(result.positions.get('first')).toEqual({ x: 100, y: 100 })
    expect(result.positions.get('second')).not.toEqual({ x: 100, y: 100 })
    expect(result.positions.get('free')).toEqual({ x: 900, y: 500 })
    expect(result.movedNodeIds).toEqual(['second'])
  })

  it('uses the smallest horizontal movement when nodes only touch sideways', () => {
    const nodes = [
      { id: 'fixed', position: { x: 100, y: 100 } },
      { id: 'moving', position: { x: 300, y: 100 } },
    ]
    const result = resolveWorkflowCollisions(nodes, { gap: 12 })

    expect(result.positions.get('moving')).toEqual({ x: 336, y: 100 })
  })

  it('uses the smaller vertical movement for stacked or fully overlapping nodes', () => {
    const stacked = resolveWorkflowCollisions([
      { id: 'fixed', position: { x: 100, y: 100 } },
      { id: 'moving', position: { x: 100, y: 160 } },
    ], { gap: 12 })
    const samePosition = resolveWorkflowCollisions([
      { id: 'fixed', position: { x: 100, y: 100 } },
      { id: 'moving', position: { x: 100, y: 100 } },
    ], { gap: 12 })

    expect(stacked.positions.get('moving')).toEqual({ x: 100, y: 180 })
    expect(samePosition.positions.get('moving')).toEqual({ x: 100, y: 180 })
  })

  it('uses each node real size when resolving collisions', () => {
    const nodes = [
      { id: 'condition', kind: 'condition', position: { x: 100, y: 100 } },
      { id: 'normal', kind: 'normal', position: { x: 330, y: 100 } },
    ]
    const sizes = {
      condition: { width: 360, height: 190 },
      normal: { width: 224, height: 68 },
    }
    const result = resolveWorkflowCollisions(nodes, {
      gap: 12,
      getNodeSize: node => sizes[node.kind],
    })

    expect(result.positions.get('normal')).toEqual({ x: 472, y: 100 })
  })
})
