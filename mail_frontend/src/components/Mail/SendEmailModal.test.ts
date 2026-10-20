import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const { getAccounts } = vi.hoisted(() => ({ getAccounts: vi.fn() }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/services/api', () => ({ isTauri: () => false }))
vi.mock('@/api/smtpAccounts', () => ({ default: { getAccounts } }))
vi.mock('@/api/mailboxProxy', () => ({ default: {} }))

import SendEmailModal from './SendEmailModal.vue'

describe('send modal initial opening', () => {
  it('loads sender accounts and reply fields when first mounted visible', async () => {
    getAccounts.mockResolvedValue({ code: 0, data: { accounts: [{
      email: 'sender@example.test', status: 'active', password: 'fixture-only',
      smtp_host: 'smtp.example.test', smtp_port: 465
    }] } })
    const wrapper = mount(SendEmailModal, {
      props: {
        visible: true,
        mailboxes: [{ id: 7, email: 'sender@example.test' }],
        presetMailboxId: 7,
        replyTo: 'recipient@example.test',
        replySubject: 'Hello'
      },
      global: { stubs: { Teleport: true } }
    })
    try {
      await flushPromises()
      expect(getAccounts).toHaveBeenCalledTimes(1)
      expect(wrapper.get('select').element.value).toBe('7')
      expect(wrapper.get('input[placeholder="sendEmail.recipientPlaceholder"]').element.value).toBe('recipient@example.test')
      expect(wrapper.get('input[placeholder="sendEmail.subjectPlaceholder"]').element.value).toBe('Re: Hello')
    } finally {
      wrapper.unmount()
    }
  })
})
