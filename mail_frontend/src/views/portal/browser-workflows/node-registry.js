// The built-in catalog is a controlled platform contract, not an extension point.
// Site-specific and complex capabilities must be registered as plugins instead.
const definitions = [
  {
    kind: 'start', title: '开始', description: '流程入口', icon: '◉', tone: 'green',
    category: 'control', executionLayer: 'workflow_control', runtime: 'control.start', defaults: { intent: { goal: '开始执行流程' } },
  },
  {
    kind: 'navigate', title: '打开网页', description: '访问目标地址', icon: '↗', tone: 'blue',
    category: 'browser_base', executionLayer: 'browser_core', runtime: 'browser.navigate', fields: [{ key: 'url', label: '目标地址', placeholder: 'https://example.com' }], defaults: { url: '' },
  },
  {
    kind: 'observe', title: '识别页面', description: '读取页面或判断指定元素是否存在', icon: '⌁', tone: 'amber',
    category: 'browser_base', executionLayer: 'browser_core', runtime: 'browser.observe', fields: [
      { key: 'mode', label: '观察模式', placeholder: 'selector_exists 或 dom_snapshot' },
      { key: 'selector', label: '状态元素定位', placeholder: '由用户录制或填写，selector_exists 时使用' },
    ], defaults: { mode: 'selector_exists', selector: '' },
    defaultOutputs: [
      { name: 'exists', type: 'boolean', required: false, description: '指定页面元素是否存在并可见', source_path: 'exists', object_schema: {} },
      { name: 'url', type: 'string', required: false, description: '当前页面地址', source_path: 'url', object_schema: {} },
      { name: 'title', type: 'string', required: false, description: '当前页面标题', source_path: 'title', object_schema: {} },
      { name: 'text', type: 'string', required: false, description: '当前页面文本', source_path: 'text', object_schema: {} },
    ],
  },
  {
    kind: 'click', title: '点击元素', description: '点击录制的页面元素', icon: '⊙', tone: 'blue',
    category: 'browser_base', executionLayer: 'browser_core', runtime: 'browser.click', fields: [{ key: 'selector', label: '元素定位', placeholder: '由录制生成或用户填写' }], defaults: { selector: '' },
  },
  {
    kind: 'input', title: '填写内容', description: '输入变量或文本', icon: '✎', tone: 'blue',
    category: 'browser_base', executionLayer: 'browser_core', runtime: 'browser.input', fields: [{ key: 'selector', label: '输入框定位', placeholder: '由录制生成或用户填写' }, { key: 'value', label: '输入内容', placeholder: '固定内容；动态内容请添加名为 value 的输入参数' }], defaults: { selector: '', value: '' },
  },
  {
    kind: 'credential_input', title: '填写凭据', description: '安全填写账号或密码', icon: '🔐', tone: 'red',
    category: 'browser_base', executionLayer: 'browser_core', runtime: 'browser.credential_input', fields: [
      { key: 'credential_id', label: '凭据引用', placeholder: '例如 account-main' },
      { key: 'field', label: '字段', placeholder: 'username 或 password' },
      { key: 'selector', label: '输入框定位', placeholder: 'CSS、label 或 XPath' },
    ], defaults: { credential_id: '', field: 'username', selector: '' },
  },
  {
    kind: 'extract', title: '提取数据', description: '保存结构化结果', icon: '↧', tone: 'purple',
    category: 'browser_base', executionLayer: 'browser_core', runtime: 'browser.extract', fields: [], defaults: { fields: [] },
  },
  {
    kind: 'http_request', title: 'HTTP 请求', description: '调用公开的 HTTP API', icon: '⇄', tone: 'blue',
    category: 'integration', executionLayer: 'workflow_control', runtime: 'integration.http', fields: [
      { key: 'method', label: '请求方法', type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].map(value => ({ value, label: value })) },
      { key: 'url', label: '请求地址', placeholder: 'https://api.example.com/data' },
      { key: 'headers', label: '请求头', type: 'textarea', placeholder: '{"Accept":"application/json"}' },
      { key: 'query', label: '查询参数', type: 'textarea', placeholder: '{"page":1}' },
      { key: 'body', label: '请求体', type: 'textarea', placeholder: '文本或通过输入参数传入对象' },
    ], defaults: { method: 'GET', url: '', headers: '', query: '', body: '' },
    defaultOutputs: [
      { name: 'status_code', type: 'number', required: true, description: 'HTTP 状态码', source_path: 'status_code', object_schema: {} },
      { name: 'headers', type: 'object', required: true, description: '响应头', source_path: 'headers', object_schema: {} },
      { name: 'body', type: 'any', required: false, description: '响应内容', source_path: 'body', object_schema: {} },
    ],
  },
  {
    kind: 'text_process', title: '文本处理', description: '拼接或拆分文本', icon: 'T', tone: 'purple',
    category: 'data', executionLayer: 'workflow_control', runtime: 'data.text_process', fields: [
      { key: 'method', label: '处理方式', type: 'select', options: [{ value: 'concat', label: '拼接文本' }, { value: 'split', label: '拆分文本' }] },
      { key: 'separator', label: '拼接分隔符', placeholder: '例如换行符', showWhen: { method: 'concat' } },
      { key: 'list_separator', label: '数组元素分隔符', placeholder: '例如逗号', showWhen: { method: 'concat' } },
      { key: 'delimiters', label: '拆分分隔符', type: 'textarea', placeholder: '每行一个分隔符', showWhen: { method: 'split' } },
    ], defaults: { method: 'concat', separator: '', list_separator: '', delimiters: '' },
    defaultInputs: [{ name: 'text', type: 'string', required: false, description: '待处理文本', source: 'literal', value: '', variable: '', aggregation: 'latest' }],
    defaultOutputs: [{ name: 'output', type: 'any', required: true, description: '处理结果', source_path: 'output', object_schema: {} }],
  },
  {
    kind: 'json_stringify', title: 'JSON 序列化', description: '将任意数据转换为 JSON 文本', icon: '{}', tone: 'purple',
    category: 'data', executionLayer: 'workflow_control', runtime: 'data.json_stringify', fields: [], defaults: {},
    defaultInputs: [{ name: 'input', type: 'any', required: false, description: '需要序列化的数据', source: 'literal', value: null, variable: '', aggregation: 'latest' }],
    defaultOutputs: [{ name: 'output', type: 'string', required: true, description: 'JSON 文本', source_path: 'output', object_schema: {} }],
  },
  {
    kind: 'set_variable', title: '设置变量', description: '将输入值映射为节点输出', icon: '=', tone: 'purple',
    category: 'data', executionLayer: 'workflow_control', runtime: 'data.set_variable', fields: [], defaults: {},
  },
  {
    kind: 'wait', title: '等待条件', description: '等待页面或明确状态就绪', icon: '◷', tone: 'amber',
    category: 'browser_base', executionLayer: 'browser_core', runtime: 'control.wait', fields: [
      {
        key: 'condition',
        label: '等待方式',
        type: 'select',
        options: [
          { value: 'dom_ready', label: 'DOM 构建完成' },
          { value: 'page_loaded', label: '页面资源加载完成' },
          { value: 'network_idle', label: '网络进入空闲状态' },
          { value: 'selector_visible', label: '指定元素可见' },
          { value: 'any_selector_visible', label: '多个状态元素任意一个可见' },
          { value: 'delay', label: '固定等待时间' },
        ],
      },
      { key: 'selector', label: '元素定位', placeholder: '由用户录制或填写', showWhen: { condition: 'selector_visible' } },
      { key: 'selectors', label: '状态元素定位', type: 'textarea', placeholder: '每行填写一个用户录制的定位', showWhen: { condition: 'any_selector_visible' } },
      { key: 'delay_ms', label: '等待时间（毫秒）', type: 'number', placeholder: '例如 1000', showWhen: { condition: 'delay' } },
    ], defaults: { condition: 'page_loaded', selector: '', selectors: '', delay_ms: 0 },
  },
  {
    kind: 'condition', title: '条件分支', description: '按结果选择路径', icon: '?', tone: 'amber',
    category: 'control', executionLayer: 'browser_core', runtime: 'control.condition', fields: [],
    defaults: {
      branches: [{
        id: 'branch_0',
        label: 'IF',
        relation: 'and',
        conditions: [{
          id: 'clause_0',
          left: { source: 'page_element', selector: '' },
          operator: 'exists',
          right: { source: 'literal', value: '' },
        }],
      }],
    },
  },
  {
    kind: 'loop', title: '循环处理', description: '重复执行一组节点', icon: '↻', tone: 'purple',
    category: 'control', executionLayer: 'workflow_control', runtime: 'control.loop', fields: [
      {
        key: 'loop_type',
        label: '循环方式',
        type: 'select',
        options: [
          { value: 'array', label: '遍历数组' },
          { value: 'count', label: '按次数循环' },
          { value: 'infinite', label: '持续循环' },
        ],
      },
      { key: 'source', label: '循环数据', placeholder: '选择一个数组输入参数', showWhen: { loop_type: 'array' } },
      { key: 'max_iterations', label: '循环次数上限', type: 'number', placeholder: '20' },
    ], defaults: { loop_type: 'array', source: '', max_iterations: 20 },
    defaultOutputs: [
      { name: 'item', type: 'any', required: false, description: '当前循环项', source_path: 'item', object_schema: {} },
      { name: 'index', type: 'number', required: false, description: '当前循环下标', source_path: 'index', object_schema: {} },
      { name: 'iteration', type: 'number', required: false, description: '当前循环次数', source_path: 'iteration', object_schema: {} },
    ],
  },
  {
    kind: 'pagination', title: '继续下一页', description: '没有下一页时结束', icon: '→', tone: 'amber',
    category: 'control', executionLayer: 'workflow_control', runtime: 'control.pagination', fields: [{ key: 'next_selector', label: '下一页定位', placeholder: '由录制自动生成' }, { key: 'wait_after_click_ms', label: '翻页后等待（毫秒）', type: 'number', placeholder: '1000' }], defaults: { next_selector: '', wait_after_click_ms: 1000 },
  },
  {
    kind: 'human_intervention', title: '人工处理', description: '暂停并等待用户确认', icon: '人', tone: 'red',
    category: 'control', executionLayer: 'workflow_control', runtime: 'control.human_intervention', defaults: {
      intent: { goal: '请人工完成当前需要确认的操作' },
      reason: '', resume_when: 'page_recovered', timeout_ms: 600000,
    },
  },
  {
    kind: 'screenshot', title: '保存截图', description: '保留执行证据', icon: '▣', tone: 'purple',
    category: 'browser_base', executionLayer: 'browser_core', runtime: 'browser.screenshot', fields: [{ key: 'full_page', label: '截取整页', type: 'checkbox' }], defaults: { full_page: false },
  },
  {
    kind: 'end', title: '结束', description: '流程出口', icon: '✓', tone: 'green',
    category: 'control', executionLayer: 'workflow_control', runtime: 'control.end', defaults: { intent: { goal: '结束流程' } },
  },
]

export const NODE_DEFINITIONS = Object.freeze(definitions.map(definition => Object.freeze(definition)))
export const NODE_CATALOG = NODE_DEFINITIONS
const pluginDefinitions = new Map()
const menuGroups = [
  { key: 'browser_base', title: '基础浏览器操作', description: '打开、定位、点击、输入、等待、读取' },
  { key: 'data', title: '数据处理', description: '变量、文本和数据格式转换' },
  { key: 'integration', title: '网络与集成', description: '调用外部公开 API' },
  { key: 'interaction', title: '复杂交互插件', description: '由已安装的浏览器交互插件提供' },
  { key: 'business', title: '业务服务插件', description: '邮箱、短信、手机号、OTP 等外部服务' },
  { key: 'control', title: '流程控制', description: '开始、结束、条件、循环、分页和人工确认' },
]

function allDefinitions() {
  return [...NODE_DEFINITIONS, ...pluginDefinitions.values()]
}

function fieldLabel(key) {
  return String(key || '').replace(/_/g, ' ')
}

export function registerPluginNodeDefinitions(manifests = []) {
  pluginDefinitions.clear()
  for (const manifest of manifests) {
    if (manifest.installed === false || manifest.enabled === false) continue
    const category = manifest.kind === 'business' ? 'business' : 'interaction'
    const executionLayer = manifest.kind === 'business' ? 'business_plugin' : `${manifest.kind || 'interaction'}_plugin`
    for (const capability of manifest.capabilities || []) {
      if (!capability?.node_kind || NODE_DEFINITIONS.some(node => node.kind === capability.node_kind)) continue
      pluginDefinitions.set(capability.node_kind, Object.freeze({
        kind: capability.node_kind,
        title: capability.title || capability.node_kind,
        description: `${manifest.name || manifest.plugin_id} 插件能力`,
        icon: category === 'business' ? '◌' : '◇',
        tone: category === 'business' ? 'purple' : 'amber',
        category,
        executionLayer,
        pluginId: manifest.plugin_id,
        runtime: capability.runtime,
        fields: (capability.config_keys || []).map(key => ({ key, label: fieldLabel(key), placeholder: `填写 ${fieldLabel(key)}` })),
        defaults: {},
      }))
    }
  }
  return allDefinitions()
}

export function getNodeMenuGroups() {
  const registered = allDefinitions()
  return menuGroups.map(group => ({
    ...group,
    nodes: registered.filter(node => node.category === group.key),
  }))
}

export const NODE_MENU_GROUPS = Object.freeze(getNodeMenuGroups().map(group => Object.freeze({
  ...group,
  nodes: Object.freeze(group.nodes),
})))

export function getNodeDefinition(kind) {
  return allDefinitions().find(definition => definition.kind === kind) || NODE_DEFINITIONS[0]
}

export function createWorkflowNode(kind, position, id) {
  const definition = getNodeDefinition(kind)
  const defaults = JSON.parse(JSON.stringify(definition.defaults || {}))
  return {
    id: id || `node-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind: definition.kind,
    title: definition.title,
    description: definition.description,
    position: position || { x: 120, y: 100 },
    runtime: definition.runtime,
    intent: { ...(defaults.intent || {}) },
    config: defaults,
    inputs: (definition.defaultInputs || []).map(item => ({ ...item })),
    outputs: (definition.defaultOutputs || []).map(item => ({ ...item })),
    success_criteria: [],
    timeout_ms: 30000,
    retry_limit: 1,
  }
}
