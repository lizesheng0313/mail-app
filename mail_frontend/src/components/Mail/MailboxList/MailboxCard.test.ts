import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import MailboxCard from './MailboxCard.vue'

describe('MailboxCard', () => {
  it('opens the action menu when the pointer hovers over more actions', async () => {
    const wrapper = mount(MailboxCard, {
      props: {
        address: 'preview@example.test',
        actionMenuTitle: '更多操作',
        actions: [{ id: 'copy', label: '复制邮箱', icon: 'copy' }]
      }
    })

    const menu = wrapper.get('button[title="更多操作"]').element.parentElement
    expect(menu).not.toBeNull()
    menu!.dispatchEvent(new MouseEvent('mouseenter'))
    await nextTick()

    expect(wrapper.find('button[title="复制邮箱"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders the shared mailbox fields and emits actions from the shared menu', async () => {
    const wrapper = mount(MailboxCard, {
      attachTo: document.body,
      props: {
        address: 'preview@example.test',
        createdLabel: '创建时间',
        createdText: '2026/9/23',
        expiresLabel: '过期时间',
        expiresText: '2027/9/23',
        actionMenuTitle: '更多操作',
        actions: [{ id: 'copy', label: '复制邮箱', icon: 'copy' }]
      }
    })

    expect(wrapper.text()).toContain('preview@example.test')
    expect(wrapper.text()).toContain('创建时间：2026/9/23')
    expect(wrapper.text()).toContain('过期时间：2027/9/23')

    await wrapper.get('button[title="更多操作"]').trigger('click')
    const copyAction = wrapper.get('button[title="复制邮箱"]')
    await copyAction.trigger('click')

    expect(wrapper.emitted('action')).toEqual([['copy']])
    expect(wrapper.emitted('click')).toBeUndefined()
    wrapper.unmount()
  })
})
