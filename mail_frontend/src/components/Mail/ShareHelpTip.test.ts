import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'

import ShareHelpTip from './ShareHelpTip.vue'

describe('share help tip', () => {
  it('shows the explanation on hover and hides it on leave', async () => {
    const wrapper = mount(ShareHelpTip, { props: { text: '旧邮件不会显示。' } })
    const button = wrapper.get('button')

    await button.trigger('mouseenter')
    await nextTick()
    expect(document.body.querySelector('[role="tooltip"]')?.textContent).toContain('旧邮件不会显示。')

    await button.trigger('mouseleave')
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull()
    wrapper.unmount()
  })

  it('can be opened by tapping and closed when focus leaves', async () => {
    const wrapper = mount(ShareHelpTip, { props: { text: '链接数量不是邮箱数量。' } })
    const button = wrapper.get('button')

    await button.trigger('click')
    await nextTick()
    expect(document.body.querySelector('[role="tooltip"]')?.textContent).toContain('链接数量不是邮箱数量。')

    await button.trigger('blur')
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull()
    wrapper.unmount()
  })
})
