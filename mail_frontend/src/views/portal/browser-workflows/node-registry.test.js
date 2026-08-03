import { describe, expect, it } from 'vitest'

import { NODE_DEFINITIONS, NODE_MENU_GROUPS, createWorkflowNode, getNodeMenuGroups, registerPluginNodeDefinitions } from './node-registry'

describe('browser workflow node registry', () => {
  it('keeps the built-in platform catalog fixed', () => {
    expect(NODE_DEFINITIONS.map(definition => definition.kind)).toEqual([
      'start',
      'navigate',
      'observe',
      'click',
      'input',
      'credential_input',
      'extract',
      'http_request',
      'text_process',
      'json_stringify',
      'set_variable',
      'wait',
      'condition',
      'loop',
      'pagination',
      'human_intervention',
      'screenshot',
      'end',
    ])
  })

  it('keeps every node executable and uniquely identified', () => {
    const kinds = NODE_DEFINITIONS.map((definition) => definition.kind)

    expect(new Set(kinds).size).toBe(kinds.length)
    for (const definition of NODE_DEFINITIONS) {
      expect(definition.runtime).toMatch(/\./)
      expect(definition.category).toBeTruthy()
      expect(definition.executionLayer).toBeTruthy()
    }
  })

  it('creates a serializable node with flat runtime configuration', () => {
    const node = createWorkflowNode('navigate', { x: 40, y: 60 }, 'node-test')

    expect(node).toMatchObject({
      id: 'node-test',
      kind: 'navigate',
      runtime: 'browser.navigate',
      position: { x: 40, y: 60 },
    })
    expect(node.config).toHaveProperty('url')
    expect(node.config).not.toHaveProperty('intent')
  })

  it('creates independent ordered condition branches', () => {
    const first = createWorkflowNode('condition', { x: 0, y: 0 }, 'condition-1')
    const second = createWorkflowNode('condition', { x: 0, y: 0 }, 'condition-2')

    first.config.branches[0].conditions[0].left = 'status'

    expect(first.config.branches[0]).toMatchObject({ id: 'branch_0', relation: 'and' })
    expect(second.config.branches[0].conditions[0].left).toEqual({ source: 'page_element', selector: '' })
  })

  it('creates a typed loop with standard iteration outputs', () => {
    const node = createWorkflowNode('loop', { x: 0, y: 0 }, 'loop-1')

    expect(node.config).toEqual({ loop_type: 'array', source: '', max_iterations: 20 })
    expect(node.outputs.map(output => output.name)).toEqual(['item', 'index', 'iteration'])
  })

  it('exposes page observation results for generic condition branches', () => {
    const node = createWorkflowNode('observe', { x: 0, y: 0 }, 'observe-1')

    expect(node.config).toEqual({ mode: 'selector_exists', selector: '' })
    expect(node.outputs.map(output => output.name)).toEqual(['exists', 'url', 'title', 'text'])
    expect(node.outputs.find(output => output.name === 'exists')).toMatchObject({ type: 'boolean', source_path: 'exists' })
  })

  it('does not hardcode plugin nodes into the platform registry', () => {
    expect(NODE_DEFINITIONS.map(node => node.kind)).not.toContain('drag_slider')
  })

  it('groups node choices by browser, data, integration, plugin, and flow ownership', () => {
    expect(NODE_MENU_GROUPS.map(group => group.key)).toEqual([
      'browser_base', 'data', 'integration', 'interaction', 'business', 'control',
    ])
    expect(NODE_MENU_GROUPS.find(group => group.key === 'interaction').nodes).toEqual([])
    expect(NODE_MENU_GROUPS.find(group => group.key === 'browser_base').nodes.map(node => node.kind)).toContain('navigate')
    expect(NODE_MENU_GROUPS.find(group => group.key === 'data').nodes.map(node => node.kind)).toContain('text_process')
  })

  it('adds installed plugin capabilities to the matching editor group', () => {
    registerPluginNodeDefinitions([{
      plugin_id: 'test.sms', name: '短信服务', kind: 'business',
      capabilities: [{ node_kind: 'test_sms_receive', runtime: 'plugin.test.sms.receive', title: '读取短信', config_keys: ['phone_number'] }],
    }])

    const definition = createWorkflowNode('test_sms_receive', { x: 1, y: 2 }, 'sms-test')
    const business = getNodeMenuGroups().find(group => group.key === 'business')

    expect(definition.runtime).toBe('plugin.test.sms.receive')
    expect(definition.config).toEqual({})
    expect(business.nodes.map(node => node.kind)).toContain('test_sms_receive')
  })

  it('removes disabled plugin capabilities from the editor menu', () => {
    registerPluginNodeDefinitions([{
      plugin_id: 'test.sms', name: '短信服务', kind: 'business',
      installed: true, enabled: false,
      capabilities: [{ node_kind: 'test_sms_receive', runtime: 'plugin.test.sms.receive', title: '读取短信' }],
    }])

    expect(getNodeMenuGroups().find(group => group.key === 'business').nodes).toEqual([])
  })
})
