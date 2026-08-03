import { describe, expect, it } from 'vitest'

import { createWorkflowNode, registerPluginNodeDefinitions } from './node-registry'
import { insertRecordedStepsIntoGraph } from './recording-graph'

function node(kind, id, x) {
  return createWorkflowNode(kind, { x, y: 100 }, id)
}

function deterministicIds() {
  let index = 0
  return prefix => `${prefix}-${++index}`
}

describe('recorded workflow graph insertion', () => {
  it('inserts one recorded node after the selected anchor', () => {
    const workflow = {
      nodes: [node('start', 'start', 0), node('navigate', 'anchor', 272), node('end', 'end', 544)],
      edges: [
        { id: 'start-anchor', source: 'start', target: 'anchor' },
        { id: 'anchor-end', source: 'anchor', target: 'end' },
      ],
    }

    const result = insertRecordedStepsIntoGraph({
      workflow,
      anchorNodeId: 'anchor',
      steps: [{ kind: 'click', selector: '[data-testid="submit"]', title: '提交' }],
      createId: deterministicIds(),
    })

    expect(result.createdNodeIds).toHaveLength(1)
    const recordedId = result.createdNodeIds[0]
    expect(workflow.nodes.find(item => item.id === recordedId)).toMatchObject({
      kind: 'click',
      title: '提交',
      config: { selector: '[data-testid="submit"]' },
    })
    expect(workflow.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'anchor', target: recordedId }),
      expect.objectContaining({ source: recordedId, target: 'end' }),
    ]))
    expect(workflow.edges).not.toContainEqual(expect.objectContaining({ source: 'anchor', target: 'end' }))
  })

  it('stores a demonstrated drag as hidden replay data on the plugin node', () => {
    registerPluginNodeDefinitions([{
      plugin_id: 'builtin.browser.standard-slider',
      name: '滑块自动回放',
      kind: 'interaction',
      capabilities: [{
        node_kind: 'drag_slider',
        runtime: 'plugin.browser.standard-slider.drag_slider',
        title: '自动回放录制拖拽',
        config_keys: [],
      }],
    }])
    const workflow = {
      nodes: [node('start', 'start', 0), node('navigate', 'anchor', 272), node('end', 'end', 544)],
      edges: [
        { id: 'start-anchor', source: 'start', target: 'anchor' },
        { id: 'anchor-end', source: 'anchor', target: 'end' },
      ],
    }

    const result = insertRecordedStepsIntoGraph({
      workflow,
      anchorNodeId: 'anchor',
      steps: [{
        kind: 'drag_slider',
        selector: '.drag-handle',
        title: '拖动',
        drag: {
          start_offset_x: 12,
          start_offset_y: 14,
          delta_x: 236,
          delta_y: 3,
          duration_ms: 780,
        },
      }],
      createId: deterministicIds(),
    })

    expect(workflow.nodes.find(item => item.id === result.createdNodeIds[0])).toMatchObject({
      kind: 'drag_slider',
      config: {
        selector: '.drag-handle',
        start_offset_x: 12,
        start_offset_y: 14,
        delta_x: 236,
        delta_y: 3,
        duration_ms: 780,
      },
    })
  })

  it('requires a concrete branch anchor instead of inventing a continuation condition', () => {
    const successEdge = {
      id: 'anchor-success',
      source: 'anchor',
      target: 'success',
      condition: { branch: 'branch_0' },
    }
    const failureEdge = {
      id: 'anchor-failure',
      source: 'anchor',
      target: 'failure',
      condition: { branch: 'default', default: true },
    }
    const workflow = {
      nodes: [
        node('start', 'start', 0),
        node('navigate', 'anchor', 272),
        node('end', 'success', 816),
        node('end', 'failure', 816),
      ],
      edges: [
        { id: 'start-anchor', source: 'start', target: 'anchor' },
        successEdge,
        failureEdge,
      ],
    }

    const result = insertRecordedStepsIntoGraph({
      workflow,
      anchorNodeId: 'anchor',
      steps: [
        { kind: 'input', selector: 'input[name="query"]', value: 'phone case', title: '填写关键词' },
        { kind: 'click', selector: 'button[type="submit"]', title: '搜索' },
      ],
      createId: deterministicIds(),
    })

    expect(result.createdNodeIds).toEqual([])
    expect(result.error).toContain('多个分支')
    expect(workflow.nodes).toHaveLength(4)
    expect(workflow.edges).toHaveLength(3)
  })

  it('adds loop and pagination nodes when the user confirms all-page list processing', () => {
    const workflow = {
      nodes: [node('navigate', 'anchor', 0), node('end', 'end', 1088)],
      edges: [{ id: 'anchor-end', source: 'anchor', target: 'end' }],
    }

    const result = insertRecordedStepsIntoGraph({
      workflow,
      anchorNodeId: 'anchor',
      steps: [{ kind: 'click', selector: '.product-card a', title: '打开商品' }],
      scope: {
        mode: 'all_pages',
        item_selector: '.product-card',
        next_selector: 'button.next',
      },
      createId: deterministicIds(),
    })

    expect(result.loopNodeId).toBeTruthy()
    expect(result.paginationNodeId).toBeTruthy()
    expect(result.testNodeIds).toEqual([result.listExtractNodeId, result.loopNodeId, ...result.createdNodeIds])
    expect(workflow.nodes.find(item => item.id === result.listExtractNodeId)).toMatchObject({
      kind: 'extract',
      config: { mode: 'list', item_selector: '.product-card' },
      outputs: [{ name: 'items', type: 'array' }],
    })
    expect(workflow.nodes.find(item => item.id === result.loopNodeId)).toMatchObject({
      kind: 'loop',
      config: { loop_type: 'array', source: 'items' },
      inputs: [{ name: 'items', variable: `${result.listExtractNodeId}.items` }],
    })
    expect(workflow.nodes.find(item => item.id === result.paginationNodeId)).toMatchObject({
      kind: 'pagination',
      config: { next_selector: 'button.next' },
    })
    expect(workflow.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'anchor', target: result.listExtractNodeId }),
      expect.objectContaining({ source: result.listExtractNodeId, target: result.loopNodeId }),
      expect.objectContaining({ source: result.paginationNodeId, target: result.listExtractNodeId, condition: { branch: 'next' } }),
      expect.objectContaining({ source: result.paginationNodeId, target: 'end', condition: { branch: 'done' } }),
    ]))
  })
})
