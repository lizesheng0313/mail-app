function segmentSelector(segment) {
  const tag = String(segment?.tag || '').trim()
  const index = Number(segment?.nth_of_type || 0)
  return tag && index > 0 ? `${tag}:nth-of-type(${index})` : ''
}

function structuralSelector(path) {
  return (path || []).map(segmentSelector).filter(Boolean).join(' > ')
}

const TECHNICAL_DESCRIPTION_PATTERN = /(?:nth-of-type|querySelector|query_selector|css\s*选择器|元素定位|定位器|selector|dom[_ -]?path|^\s*[a-z][a-z0-9-]*\s*:)/i
const GENERIC_DESCRIPTION_PATTERN = /^(?:录制步骤|当前步骤|基于浏览器录制生成|基于用户实际操作生成|ai\s*根据)/i
const COMMON_LABEL_TRANSLATIONS = [
  [/\bmessages?\b/gi, '消息'],
  [/\bsubmit\b/gi, '提交'],
  [/\bsearch\b/gi, '搜索'],
  [/\blogin\b/gi, '登录'],
  [/\bnext\b/gi, '下一页'],
  [/\bmore\b/gi, '更多'],
  [/\bconfirm\b/gi, '确认'],
  [/\bcancel\b/gi, '取消'],
]

function localizeDescription(value) {
  return COMMON_LABEL_TRANSLATIONS.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    String(value || '').trim(),
  )
}

function usefulDescription(value) {
  const text = localizeDescription(value)
  if (!text || TECHNICAL_DESCRIPTION_PATTERN.test(text) || GENERIC_DESCRIPTION_PATTERN.test(text)) return ''
  return text
}

function compactRecordedLabel(value, maxLength = 18) {
  const text = localizeDescription(value).replace(/\s+/g, ' ').trim()
  if (!text || TECHNICAL_DESCRIPTION_PATTERN.test(text)) return ''
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
}

function recordedStepText(step = {}) {
  const attrs = step?.attrs || {}
  return localizeDescription([
    step?.title,
    step?.reason,
    step?.text,
    attrs['aria-label'],
    attrs.title,
    attrs.placeholder,
    attrs.name,
  ].filter(Boolean).join(' '))
}

function recordedActionLabel(step = {}) {
  const attrs = step?.attrs || {}
  const raw = [step?.text, attrs['aria-label'], attrs.title, attrs.placeholder, attrs.name, step?.title]
    .map(value => compactRecordedLabel(value, 16))
    .find(Boolean) || ''
  return raw
    .replace(/^(?:用户)?(?:点击|选择|打开|进入|填写|输入|上传|拖动|按下)/, '')
    .replace(/(?:搜索结果)?列表(?:中|里|中的|里的)?(?:的)?/g, '')
    .replace(/(?:另一个|另外一个|当前这个|当前的|刚才的|所选的?|第[一二三四五六七八九十\d]+个)/g, '')
    .replace(/[，。；：、]+$/g, '')
    .trim()
}

function abstractClickTitle(step = {}, index = 0) {
  const text = recordedStepText(step)
  const label = recordedActionLabel(step)
  if (/关闭|close|取消/.test(text)) return /弹窗|窗口|对话/.test(text) ? '关闭弹窗' : '关闭当前页面'
  if (/商品|产品|手机壳/.test(text) && /详情|detail|进入/.test(text)) return '打开商品详情'
  if (/订单/.test(text) && /详情|detail|进入/.test(text)) return '打开订单详情'
  if (/用户|客户|联系人/.test(text) && /详情|profile|进入/.test(text)) return '打开用户详情'
  if (/详情|detail/.test(text)) return '打开详情页'
  if (/消息|message|联系卖家|聊天|chat/.test(text)) return '打开消息'
  if (/下一页|next|加载更多/.test(text)) return '进入下一页'
  if (/登录|sign\s*in|log\s*in/.test(text)) return '提交登录'
  if (/继续|continue/.test(text)) return '继续下一步'
  if (/搜索|search/.test(text)) return /搜索框|输入框/.test(text) ? '点击搜索框' : '执行搜索'
  if (/商品|产品|手机壳/.test(text)) return '选择商品'
  if (/列表项|项目|卡片/.test(text)) return '选择列表项'
  if (label) return `点击${compactRecordedLabel(label, 8)}`
  return index === 0 ? '打开列表项' : '点击按钮'
}

function descriptionFromRecordedTitle(title) {
  const descriptions = {
    打开商品详情: '进入所选商品详情页',
    打开订单详情: '进入所选订单详情页',
    打开用户详情: '进入所选用户详情页',
    打开详情页: '进入所选项目详情页',
    打开消息: '打开当前项目的消息窗口',
    关闭弹窗: '关闭当前弹窗',
    关闭当前页面: '关闭当前页面',
    进入下一页: '继续处理下一页内容',
    提交登录: '提交当前登录信息',
    继续下一步: '进入后续操作',
    点击搜索框: '激活搜索输入框',
    执行搜索: '提交当前搜索条件',
    选择商品: '选择一个商品',
    选择列表项: '选择一个列表项目',
    打开列表项: '进入列表项目',
    点击按钮: '触发页面按钮',
    上传图片: '上传选定的本地图片',
    自动滑块: '按录制轨迹完成拖动',
  }
  if (descriptions[title]) return descriptions[title]
  if (title.startsWith('填写')) return `填写${title.slice(2)}`
  if (title.startsWith('上传')) return `上传${title.slice(2)}`
  if (title.startsWith('拖动')) return '按录制轨迹完成拖动'
  if (title.startsWith('点击')) return `触发${title.slice(2)}`
  return title
}

export function recordedStepTitle(step, index = 0) {
  const attrs = step?.attrs || {}
  if (step?.kind === 'upload_file') return '上传图片'
  if (step?.kind === 'drag_slider') return '自动滑块'
  if (step?.kind === 'input') {
    if (attrs.type === 'password' || attrs.autocomplete === 'current-password') return '填写密码'
    if (attrs.autocomplete === 'username') return '填写账号'
    const text = recordedStepText(step)
    if (/搜索|search/.test(text)) return '填写搜索内容'
    if (/邮箱|email/.test(text)) return '填写邮箱'
    if (/手机号|手机号码|phone/.test(text)) return '填写手机号'
    const inputLabel = recordedActionLabel(step)
    return inputLabel ? `填写${compactRecordedLabel(inputLabel, 8)}` : '填写内容'
  }
  return abstractClickTitle(step, index)
}

export function describeRecordedStep(step, index = 0) {
  return descriptionFromRecordedTitle(recordedStepTitle(step, index))
}

export function recordedListItemName(steps = []) {
  const text = (steps || []).map(recordedStepText).join(' ')
  if (/商品|产品|手机壳/.test(text)) return '商品'
  if (/订单/.test(text)) return '订单'
  if (/用户|客户|联系人/.test(text)) return '用户'
  if (/消息|message|聊天/.test(text)) return '消息'
  if (/邮件|email/.test(text)) return '邮件'
  return '项目'
}

export function describeRecordedFlow(steps = []) {
  const descriptions = (steps || []).map((step, index) => describeRecordedStep(step, index)).filter(Boolean)
  if (!descriptions.length) return '完成已录制的操作'
  if (descriptions.length === 1) return descriptions[0]
  return descriptions.join('，然后')
}

export function describeListScope(scope, steps = []) {
  const flow = describeRecordedFlow(steps)
  if (scope?.mode === 'all_pages') return `系统会在当前列表及后续页面的每个项目中执行：${flow}`
  return `系统会在当前列表的每个项目中执行：${flow}`
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

export function inferListScopeFromRecording(steps = [], mode = 'current_page') {
  const first = (steps || []).find(step => Array.isArray(step?.dom_path) && step.dom_path.length)
  if (!first) return { ok: false, reason: '没有识别到列表项目，请重新录制时先点击一个列表项目' }
  const candidates = first.dom_path
    .map((segment, index) => ({
      index,
      count: Number(segment?.same_tag_count || 0),
      tag: String(segment?.tag || ''),
    }))
    .filter(item => item.index > 0 && item.tag && item.count >= 2)
    .sort((left, right) => right.count - left.count || right.index - left.index)
  const item = candidates[0]
  if (!item) return { ok: false, reason: '没有识别到同类列表项目，请重新录制时先点击一个列表项目' }
  const containerSelector = structuralSelector(first.dom_path.slice(0, item.index))
  if (!containerSelector) return { ok: false, reason: '没有识别到列表范围，请重新录制时先点击一个列表项目' }
  const scope = {
    kind: 'list_item',
    mode,
    label: mode === 'all_pages' ? '处理当前列表及后续页面' : '处理当前列表的每一项',
    reason: '用户已经确认按列表循环处理',
    container_selector: containerSelector,
    item_selector: `${containerSelector} > ${item.tag}`,
    item_tag: item.tag,
    item_path_index: item.index,
    sample_selectors: [first.selector],
    next_selector: '',
  }
  return {
    ok: true,
    scope,
    entrySteps: (steps || []).map(step => relativeStep(step, scope)),
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
