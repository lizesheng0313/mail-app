import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'
import OutboxDetailPanel from './OutboxDetailPanel.vue'

it('shows the persisted bounce as an error with its cause and original SMTP response', () => {
  const wrapper = mount(OutboxDetailPanel, { props: { record: {
    id: 17, from_email: 'sender@example.com', to_email: 'receiver@example.com', subject: 'Hello', created_at: 1000,
    status: 'bounced', error_message: '550 User unknown', bounce_reason: '550 User unknown',
    smtp_response_code: 250, smtp_response_message: 'OK'
  } } })
  expect(wrapper.text()).toContain('已退信')
  expect(wrapper.text()).toContain('550 User unknown')
  expect(wrapper.text()).toContain('250 OK')
  expect(wrapper.find('.bg-rose-50').exists()).toBe(true)
  expect(wrapper.text()).not.toContain('已发送')
  wrapper.unmount()
})
