import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MailboxCreationActions from './MailboxCreationActions.vue'

describe('MailboxCreationActions', () => {
  it('keeps both mailbox creation actions available in the header', async () => {
    const wrapper = mount(MailboxCreationActions, {
      props: { primaryLabel: '随机获取', customLabel: '自定义创建' }
    })

    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(2)
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')

    expect(wrapper.emitted('primary')).toHaveLength(1)
    expect(wrapper.emitted('custom')).toHaveLength(1)
    wrapper.unmount()
  })

  it('disables random creation when claiming or the guest quota is exhausted', () => {
    const wrapper = mount(MailboxCreationActions, {
      props: { primaryLabel: '随机获取', customLabel: '自定义创建', primaryDisabled: true }
    })

    const buttons = wrapper.findAll('button')
    expect(buttons[0].attributes('disabled')).toBeDefined()
    expect(buttons[1].attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('keeps longer translated labels as two separate buttons', () => {
    const wrapper = mount(MailboxCreationActions, {
      props: { primaryLabel: 'Get random mailbox', customLabel: 'Create custom' }
    })

    expect(wrapper.findAll('button').map((button) => button.text())).toEqual(['Get random mailbox', 'Create custom'])
    expect(wrapper.find('details').exists()).toBe(false)
    wrapper.unmount()
  })
})
