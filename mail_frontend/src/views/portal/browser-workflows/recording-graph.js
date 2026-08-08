import { createWorkflowNode } from './node-registry'
import { describeRecordedStep, recordedListItemName, recordedStepTitle } from './recording-interaction'

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
  const validSteps = (steps || []).filter(step => step?.selector && ['click', 'input', 'upload_file', 'drag_slider'].includes(step.kind))
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
  let returnToListNode = null
  let paginationNode = null
  let loopBodyX = 0
  const loopBodyY = y + 240
  const listItemName = recordedListItemName(validSteps)

  if (scope?.mode === 'current_page' || scope?.mode === 'all_pages') {
    listExtractNode = createNode('extract', resolvePosition({ x, y }), createId('recorded-list-extract'))
    listExtractNode.title = listItemName === '项目' ? '获取列表项目' : `获取${listItemName}列表`
    listExtractNode.description = '读取当前页面的列表内容'
    listExtractNode.config = { mode: 'list', item_selector: scope.item_selector, fields: [] }
    listExtractNode.outputs = [
      { name: 'items', type: 'array', required: true, description: '当前页面中的列表项目', source_path: 'items', object_schema: {} },
      { name: 'page_url', type: 'string', required: true, description: '当前列表页地址', source_path: 'page_url', object_schema: {} },
    ]
    workflow.nodes.push(listExtractNode)
    workflow.edges.push({ id: createId('recorded-list-extract-edge'), source: anchorNode.id, target: listExtractNode.id })
    previous = listExtractNode
    x += 272

    loopNode = createNode('loop', resolvePosition({ x, y }), createId('recorded-list-loop'))
    loopNode.title = scope.mode === 'all_pages'
      ? (listItemName === '项目' ? '遍历全部列表' : `遍历全部${listItemName}`)
      : (listItemName === '项目' ? '遍历当前列表' : `遍历${listItemName}列表`)
    loopNode.description = '逐项执行循环内操作'
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
    loopBodyX = Number(loopNode.position?.x || x)
    x += 544
  }

  validSteps.forEach((step, index) => {
    const preferredPosition = loopNode ? { x: loopBodyX, y: loopBodyY } : { x, y }
    const node = createNode(step.kind, resolvePosition(preferredPosition), createId('recorded'))
    node.title = recordedStepTitle(step, index)
    node.description = describeRecordedStep(step, index)
    node.config = { ...node.config, selector: step.selector }
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
      node.config.content_source = 'fixed'
      node.config.click_before_input = true
    }
    if (step.kind === 'upload_file') {
      node.config.material_id = ''
      node.config.accept = step.accept || 'image/*'
      node.config.multiple = Boolean(step.multiple)
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
    if (loopNode) loopBodyX += 272
    else x += 272
  })

  if (loopNode && createdNodeIds.length) {
    workflow.edges.push({
      id: createId('recorded-loop-body'),
      source: loopNode.id,
      target: createdNodeIds[0],
      condition: { branch: 'loop' },
    })
    returnToListNode = createNode('return_to_page', resolvePosition({ x: loopBodyX, y: loopBodyY }), createId('recorded-return-list'))
    returnToListNode.title = listItemName === '项目' ? '返回列表' : `返回${listItemName}列表`
    returnToListNode.description = '继续处理下一项'
    returnToListNode.config = { max_steps: 3 }
    returnToListNode.inputs = [{
      name: 'url',
      type: 'string',
      required: true,
      description: '本轮项目所在的列表页地址',
      source: 'node',
      value: null,
      variable: `${listExtractNode.id}.page_url`,
      aggregation: 'latest',
    }]
    workflow.nodes.push(returnToListNode)
    workflow.edges.push({
      id: createId('recorded-return-list-edge'),
      source: createdNodeIds[createdNodeIds.length - 1],
      target: returnToListNode.id,
    })
    workflow.edges.push({
      id: createId('recorded-loop-repeat'),
      source: returnToListNode.id,
      target: loopNode.id,
    })
    loopBodyX += 272

    const continuationTarget = continuationEdges[0].target
    if (scope.mode === 'all_pages') {
      paginationNode = createNode('pagination', resolvePosition({ x, y }), createId('recorded-pagination'))
      paginationNode.title = '继续下一页'
      paginationNode.description = scope.next_selector
        ? '点击用户演示的翻页组件，没有下一页时结束'
        : '自动识别下一页按钮，没有下一页时结束'
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
    testNodeIds: loopNode ? [listExtractNode.id, loopNode.id, ...createdNodeIds, returnToListNode.id] : [...createdNodeIds],
    insertedStepCount: validSteps.length,
    anchorNode,
    listExtractNodeId: listExtractNode?.id || '',
    loopNodeId: loopNode?.id || '',
    returnToListNodeId: returnToListNode?.id || '',
    paginationNodeId: paginationNode?.id || '',
  }
}
