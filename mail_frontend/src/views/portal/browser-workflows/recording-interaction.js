function segmentSelector(segment) {
  const tag = String(segment?.tag || '').trim()
  const index = Number(segment?.nth_of_type || 0)
  return tag && index > 0 ? `${tag}:nth-of-type(${index})` : ''
}

function structuralSelector(path) {
  return (path || []).map(segmentSelector).filter(Boolean).join(' > ')
}

function relativeStep(step, scope) {
  const path = step?.dom_path || []
  const itemIndex = Number(scope?.item_path_index)
  if (!Number.isInteger(itemIndex) || itemIndex < 0 || path.length <= itemIndex) return { ...step }
  const prefix = structuralSelector(path.slice(0, itemIndex))
  if (prefix !== scope.container_selector || path[itemIndex]?.tag !== scope.item_tag) return { ...step }
  const relative = structuralSelector(path.slice(itemIndex + 1))
  return {
    ...step,
    selector: relative || ':scope',
    within_list_item: true,
  }
}

export function applyBackendRecordingState(current = {}, payload = {}) {
  const incomingVersion = Number(payload.state_version ?? payload.stateVersion)
  const currentVersion = Number(current.stateVersion || 0)
  if (!Number.isFinite(incomingVersion) || incomingVersion < currentVersion) return current
  return {
    recording: Boolean(payload.recording),
    finished: Boolean(payload.finished),
    phase: String(payload.phase || 'idle'),
    message: String(payload.message || ''),
    eventCount: Number(payload.event_count ?? payload.eventCount ?? 0),
    stateVersion: incomingVersion,
  }
}

export function getRecordingAnchorChoice(node) {
  return node && node.kind !== 'end' ? node.id : ''
}

export function normalizeRecordingFinishedPayload(payload = {}) {
  const groups = Array.isArray(payload.step_groups) ? payload.step_groups : []
  const lastGroup = groups[groups.length - 1] || {}
  return {
    ...payload,
    type: 'recording_step_finished',
    step_title: payload.step_title || lastGroup.step_title || '当前步骤',
    capture_mode: payload.capture_mode || lastGroup.capture_mode || 'step',
    steps: Array.isArray(payload.steps) && payload.steps.length
      ? payload.steps
      : (Array.isArray(lastGroup.steps) ? lastGroup.steps : []),
    scope: payload.scope || lastGroup.scope || { kind: 'single' },
  }
}

export function resolveListScope(firstSteps, sampleSteps, mode) {
  const first = (firstSteps || []).find(step => Array.isArray(step?.dom_path) && step.dom_path.length)
  const second = (sampleSteps || []).find(step => Array.isArray(step?.dom_path) && step.dom_path.length)
  if (!first || !second || first.page?.url !== second.page?.url) {
    return { ok: false, reason: '两个样本不在同一个页面，请回到原列表重新选择' }
  }
  const firstPath = first.dom_path
  const secondPath = second.dom_path
  const limit = Math.min(firstPath.length, secondPath.length)
  let itemIndex = -1
  for (let index = 0; index < limit; index += 1) {
    const left = firstPath[index]
    const right = secondPath[index]
    if (left?.tag !== right?.tag) break
    if (Number(left?.nth_of_type) !== Number(right?.nth_of_type)) {
      itemIndex = index
      break
    }
  }
  if (itemIndex <= 1) {
    return { ok: false, reason: '两个样本没有形成明确的共同列表容器，请选择同组中的两个项目' }
  }
  const containerSelector = structuralSelector(firstPath.slice(0, itemIndex))
  const itemTag = String(firstPath[itemIndex]?.tag || '')
  if (!containerSelector || !itemTag || itemTag !== secondPath[itemIndex]?.tag) {
    return { ok: false, reason: '两个样本的项目结构不同，请重新选择同组项目' }
  }
  const scope = {
    kind: 'list_item',
    mode,
    label: '用户确认的重复项目',
    reason: '由用户选择的两个真实样本计算，未使用 class、role 或文本猜测',
    container_selector: containerSelector,
    item_selector: `${containerSelector} > ${itemTag}`,
    item_tag: itemTag,
    item_path_index: itemIndex,
    sample_selectors: [first.selector, second.selector],
    next_selector: '',
  }
  return {
    ok: true,
    scope,
    entrySteps: (firstSteps || []).map(step => relativeStep(step, scope)),
  }
}

export function beginListItemDemonstration(entrySteps, scope, mode) {
  if (!['current_page', 'all_pages'].includes(mode)) return null
  return {
    entrySteps: [...(entrySteps || [])],
    scope: { ...(scope || {}), mode },
  }
}

export function completeListItemDemonstration(plan, demonstrationSteps) {
  if (!plan) return null
  const scope = { ...plan.scope }
  const steps = [
    ...plan.entrySteps,
    ...(demonstrationSteps || []).map(step => relativeStep(step, scope)),
  ]
  return {
    steps,
    scope,
    stage: scope.mode === 'all_pages' && !scope.next_selector ? 'pagination_required' : 'ready',
  }
}

export function completePaginationDemonstration(plan, paginationSteps) {
  if (!plan) return null
  const paginationStep = (paginationSteps || []).find(step => step.kind === 'click' && step.selector)
  const scope = {
    ...plan.scope,
    next_selector: paginationStep?.selector || '',
  }
  return {
    steps: [...plan.entrySteps],
    scope,
    stage: paginationStep ? 'ready' : 'pagination_required',
  }
}
