import { createWorkflowNode } from './node-registry'

function defaultIdFactory(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

export function insertRecordedStepsIntoGraph({
  workflow,
  steps,
  scope = null,
  anchorNodeId,
  resolvePosition = position => position,
  createNode = createWorkflowNode,
  createId = defaultIdFactory,
}) {
  const validSteps = (steps || []).filter(step => step?.selector && ['click', 'input', 'drag_slider'].includes(step.kind))
  const anchorNode = workflow?.nodes?.find(node => node.id === anchorNodeId)
  if (!validSteps.length || !anchorNode || anchorNode.kind === 'end') {
    return { createdNodeIds: [], insertedStepCount: 0, anchorNode: null }
  }

  const createdNodeIds = []
  let endNode = workflow.nodes.find(node => node.kind === 'end')
  if (!endNode) {
    endNode = createNode(
      'end',
      resolvePosition({ x: Number(anchorNode.position?.x || 0) + 544, y: Number(anchorNode.position?.y || 120) }),
      createId('recorded-end'),
    )
    endNode.title = '结束'
    endNode.description = '流程出口'
    endNode.config.keep_session_open = true
    workflow.nodes.push(endNode)
  }

  const outgoingAnchorEdges = workflow.edges.filter(edge => edge.source === anchorNodeId)
  if (outgoingAnchorEdges.length > 1) {
    return {
      createdNodeIds: [],
      insertedStepCount: 0,
      anchorNode,
      error: '当前节点有多个分支，请选择具体分支上的节点后再录制',
    }
  }
  const continuationEdges = outgoingAnchorEdges.length
    ? outgoingAnchorEdges
    : [{ id: createId('recorded-default-continuation'), source: anchorNodeId, target: endNode.id }]
  workflow.edges = workflow.edges.filter(edge => edge.source !== anchorNodeId)

  let previous = anchorNode
  let x = Number(anchorNode.position?.x || 0) + 272
  const y = Number(anchorNode.position?.y || 120)
  let loopNode = null
  let listExtractNode = null
  let paginationNode = null

  if (scope?.mode === 'current_page' || scope?.mode === 'all_pages') {
    listExtractNode = createNode('extract', resolvePosition({ x, y }), createId('recorded-list-extract'))
    listExtractNode.title = '提取当前列表'
    listExtractNode.description = '使用用户确认的列表项目定位生成数组'
    listExtractNode.config = { mode: 'list', item_selector: scope.item_selector, fields: [] }
    listExtractNode.outputs = [
      { name: 'items', type: 'array', required: true, description: '当前页面中的列表项目', source_path: 'items', object_schema: {} },
    ]
    workflow.nodes.push(listExtractNode)
    workflow.edges.push({ id: createId('recorded-list-extract-edge'), source: anchorNode.id, target: listExtractNode.id })
    previous = listExtractNode
    x += 272

    loopNode = createNode('loop', resolvePosition({ x, y }), createId('recorded-list-loop'))
    loopNode.title = scope.mode === 'all_pages' ? '处理后续页面中的每个项目' : '处理当前页每个项目'
    loopNode.description = '系统按当前页面的同类项目逐个执行下面的操作'
    loopNode.config = {
      loop_type: 'array',
      source: 'items',
      max_iterations: 100,
    }
    loopNode.inputs = [{
      name: 'items',
      type: 'array',
      required: true,
      description: '需要逐项处理的列表',
      source: 'node',
      value: null,
      variable: `${listExtractNode.id}.items`,
      aggregation: 'latest',
    }]
    workflow.nodes.push(loopNode)
    workflow.edges.push({ id: createId('recorded-list-edge'), source: listExtractNode.id, target: loopNode.id })
    previous = loopNode
    x += 272
  }

  for (const step of validSteps) {
    const node = createNode(step.kind, resolvePosition({ x, y }), createId('recorded'))
    node.title = step.title || '录制步骤'
    node.description = step.reason || 'AI 根据用户点击的 DOM 生成'
    node.config = { selector: step.selector }
    if (loopNode && step.within_list_item) {
      node.config.scope_selector = scope.item_selector
      node.inputs.push({
        name: 'item',
        type: 'object',
        required: true,
        description: '当前循环项',
        source: 'node',
        value: null,
        variable: `${loopNode.id}.item`,
        aggregation: 'latest',
      })
    }
    if (step.kind === 'input') {
      node.config.value = step.value || ''
      node.config.click_before_input = true
    }
    if (step.kind === 'drag_slider') {
      Object.assign(node.config, {
        start_offset_x: Number(step.drag?.start_offset_x || 0),
        start_offset_y: Number(step.drag?.start_offset_y || 0),
        delta_x: Number(step.drag?.delta_x || 0),
        delta_y: Number(step.drag?.delta_y || 0),
        duration_ms: Number(step.drag?.duration_ms || 0),
      })
    }
    workflow.nodes.push(node)
    createdNodeIds.push(node.id)
    if (previous !== loopNode) {
      workflow.edges.push({ id: createId('recorded-edge'), source: previous.id, target: node.id })
    }
    previous = node
    x += 272
  }

  if (loopNode && createdNodeIds.length) {
    workflow.edges.push({
      id: createId('recorded-loop-body'),
      source: loopNode.id,
      target: createdNodeIds[0],
      condition: { branch: 'loop' },
    })
    workflow.edges.push({
      id: createId('recorded-loop-repeat'),
      source: createdNodeIds[createdNodeIds.length - 1],
      target: loopNode.id,
    })

    const continuationTarget = continuationEdges[0].target
    if (scope.mode === 'all_pages') {
      paginationNode = createNode('pagination', resolvePosition({ x, y }), createId('recorded-pagination'))
      paginationNode.title = '继续下一页'
      paginationNode.description = scope.next_selector
        ? '点击用户演示的翻页组件，没有下一页时结束'
        : '请补充下一页按钮定位后执行'
      paginationNode.config = { next_selector: scope.next_selector || '', wait_after_click_ms: 1000 }
      workflow.nodes.push(paginationNode)
      workflow.edges.push({
        id: createId('recorded-loop-done'),
        source: loopNode.id,
        target: paginationNode.id,
        condition: { branch: 'done' },
      })
      workflow.edges.push({
        id: createId('recorded-page-next'),
        source: paginationNode.id,
        target: listExtractNode.id,
        condition: { branch: 'next' },
      })
      workflow.edges.push({
        id: createId('recorded-page-end'),
        source: paginationNode.id,
        target: continuationTarget,
        condition: { branch: 'done' },
      })
    } else {
      workflow.edges.push({
        id: createId('recorded-loop-end'),
        source: loopNode.id,
        target: continuationTarget,
        condition: { branch: 'done' },
      })
    }
  } else if (createdNodeIds.length) {
    const lastNodeId = createdNodeIds[createdNodeIds.length - 1]
    for (const edge of continuationEdges) {
      workflow.edges.push({
        ...edge,
        id: createId('recorded-continuation-edge'),
        source: lastNodeId,
      })
    }
  }

  if (
    continuationEdges.length === 1
    && continuationEdges[0].target === endNode.id
    && Number(endNode.position?.x || 0) <= x
  ) {
    endNode.position = resolvePosition({ x: x + 272, y }, endNode.id)
  }

  return {
    createdNodeIds,
    testNodeIds: loopNode ? [listExtractNode.id, loopNode.id, ...createdNodeIds] : [...createdNodeIds],
    insertedStepCount: validSteps.length,
    anchorNode,
    listExtractNodeId: listExtractNode?.id || '',
    loopNodeId: loopNode?.id || '',
    paginationNodeId: paginationNode?.id || '',
  }
}
