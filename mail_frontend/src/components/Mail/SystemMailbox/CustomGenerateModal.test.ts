import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { listAllDomains } = vi.hoisted(() => ({ listAllDomains: vi.fn() }))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/api/hostedDomain', () => ({
  hostedDomainAPI: { listAllDomains, createMailbox: vi.fn() }
}))
vi.mock('@/api/mailbox', () => ({ mailboxAPI: { getSystemDomains: vi.fn() } }))
vi.mock('@/api/milkCoin', () => ({ getBalance: vi.fn() }))
vi.mock('@/utils/message', () => ({ showMessage: vi.fn() }))
vi.mock('@/utils/timeUtils', () => ({ formatTimestamp: () => '2027-01-01' }))
vi.mock('@/services/api', () => ({ isInsufficientBalanceError: vi.fn() }))

import CustomGenerateModal from './CustomGenerateModal.vue'

describe('hosted mailbox generation domain picker', () => {
  beforeEach(() => listAllDomains.mockReset())

  it('renders all 30 available owned domains', async () => {
    listAllDomains.mockResolvedValue({
      code: 0,
      data: {
        items: Array.from({ length: 30 }, (_, index) => ({
          id: index + 1,
          domain_name: `owned-${index + 1}.example`,
          verification_status: 'verified',
          is_active: true,
          is_deleted: false,
          expires_at: null,
          created_at: 1_800_000_000_000 + index
        }))
      }
    })

    const wrapper = mount(CustomGenerateModal, {
      props: { visible: false, mailboxType: 'hosted' },
      global: {
        stubs: {
          BaseModal: { props: ['modelValue'], template: '<div v-if="modelValue"><slot /></div>' },
          ConfirmDialog: true,
          CustomSelect: true
        }
      }
    })

    await wrapper.setProps({ visible: true })
    await flushPromises()

    const domainButtons = wrapper.findAll('button').filter((button) => button.text().includes('.example'))
    expect(domainButtons).toHaveLength(30)
    expect(domainButtons.some((button) => button.text().includes('owned-30.example'))).toBe(true)
    expect(listAllDomains).toHaveBeenCalledOnce()
    wrapper.unmount()
  })
})
