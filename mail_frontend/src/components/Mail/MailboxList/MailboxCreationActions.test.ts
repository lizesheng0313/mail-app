import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MailboxCreationActions from './MailboxCreationActions.vue'

describe('MailboxCreationActions', () => {
  it('keeps both mailbox creation actions available in the header', async () => {
    const wrapper = mount(MailboxCreationActions, {
      props: { menuLabel: '获取邮箱', primaryLabel: '随机获取', customLabel: '自定义创建' }
    })

    const buttons = wrapper.findAll('.mailbox-creation-actions__wide button')
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')

    expect(wrapper.emitted('primary')).toHaveLength(1)
    expect(wrapper.emitted('custom')).toHaveLength(1)
    wrapper.unmount()
  })

  it('disables random creation when claiming or the guest quota is exhausted', () => {
    const wrapper = mount(MailboxCreationActions, {
      props: { menuLabel: '获取邮箱', primaryLabel: '随机获取', customLabel: '自定义创建', primaryDisabled: true }
    })

    expect(wrapper.findAll('.mailbox-creation-actions__wide button')[0].attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('.mailbox-creation-actions__compact button')[0].attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('uses the compact action menu for longer translated labels', () => {
    const wrapper = mount(MailboxCreationActions, {
      props: { menuLabel: 'Get mailbox', primaryLabel: 'Get random mailbox', customLabel: 'Create custom' }
    })

    expect(wrapper.classes()).toContain('mailbox-creation-actions--long')
    wrapper.unmount()
  })
})
