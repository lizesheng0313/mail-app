import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MailboxHeaderAction from './MailboxHeaderAction.vue'

describe('MailboxHeaderAction', () => {
  it('keeps the mailbox action in the header and emits clicks', async () => {
    const wrapper = mount(MailboxHeaderAction, { props: { label: '添加邮箱' } })

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
    wrapper.unmount()
  })

  it('disables the action while it is running', () => {
    const wrapper = mount(MailboxHeaderAction, { props: { label: '添加中', disabled: true } })

    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
})
