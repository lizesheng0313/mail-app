import { describe, expect, it } from 'vitest'
import { buildWorkflowEdgeCell, buildWorkflowNodeCell, createWorkflowGraph, disposeWorkflowGraph, getWorkflowPortItems, sanitizeWorkflowGraphDocument, syncWorkflowGraph } from './x6-workflow-graph'

describe('X6 workflow graph adapter', () => {
  it('maps a normal node to an input and output port', () => {
    const cell = buildWorkflowNodeCell({ id: 'click', kind: 'click', position: { x: 100, y: 200 } })

    expect(cell).toMatchObject({ id: 'click', shape: 'browser-workflow-node', x: 100, y: 200 })
    expect(cell.ports.items.map(port => port.id)).toEqual(['input', 'output'])
  })

  it('maps condition branches to stable named output ports', () => {
    const ports = getWorkflowPortItems({
      id: 'condition',
      kind: 'condition',
      config: { branches: [{ id: 'logged-in' }] },
    })

    expect(ports.map(port => port.id)).toEqual(['input', 'output-logged-in', 'output-default'])
  })

  it('connects branch edges to their branch port and routes them orthogonally', () => {
    const edge = buildWorkflowEdgeCell({
      id: 'edge-1',
      source: 'condition',
      target: 'continue',
      condition: { branch: 'logged-in' },
    })

    expect(edge.source).toEqual({ cell: 'condition', port: 'output-logged-in' })
    expect(edge.target).toEqual({ cell: 'continue', port: 'input' })
    expect(edge.router.name).toBe('manhattan')
    expect(edge.connector.name).toBe('rounded')
  })

  it('drops edges whose source or target node no longer exists', () => {
    const result = sanitizeWorkflowGraphDocument({
      nodes: [{ id: 'start' }, { id: 'end' }],
      edges: [
        { id: 'valid', source: 'start', target: 'end' },
        { id: 'missing-source', source: 'removed', target: 'end' },
        { id: 'missing-target', source: 'start', target: 'removed' },
      ],
    })

    expect(result.edges.map(edge => edge.id)).toEqual(['valid'])
  })

  it('mounts and synchronizes a real X6 graph', () => {
    SVGElement.prototype.getCTM ||= () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
    SVGSVGElement.prototype.createSVGMatrix ||= () => ({
      a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
      multiply(matrix) { return matrix },
      translate() { return this },
      scaleNonUniform() { return this },
      rotate() { return this },
      skewX() { return this },
      skewY() { return this },
    })
    SVGSVGElement.prototype.createSVGPoint ||= () => ({
      x: 0,
      y: 0,
      matrixTransform(matrix) {
        return { x: this.x * matrix.a + this.y * matrix.c + matrix.e, y: this.x * matrix.b + this.y * matrix.d + matrix.f }
      },
    })
    const container = document.createElement('div')
    container.style.width = '800px'
    container.style.height = '600px'
    document.body.appendChild(container)
    const graph = createWorkflowGraph(container, { width: 800, height: 600 })

    syncWorkflowGraph(graph, {
      nodes: [
        { id: 'start', kind: 'start', position: { x: 40, y: 40 } },
        { id: 'end', kind: 'end', position: { x: 340, y: 40 } },
      ],
      edges: [{ id: 'start-end', source: 'start', target: 'end' }],
    })

    expect(graph.getCellById('start')).toBeTruthy()
    expect(graph.getCellById('end')).toBeTruthy()
    expect(graph.getCellById('start-end')).toBeTruthy()
    disposeWorkflowGraph(graph)
    container.remove()
  })
})
