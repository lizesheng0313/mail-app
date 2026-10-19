import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { listAllDomains, getBalance, getSystemDomains, customGenerateSystemMailboxes, createHostedMailbox, user, showMessage } = vi.hoisted(() => ({
  listAllDomains: vi.fn(),
  getBalance: vi.fn(),
  getSystemDomains: vi.fn(),
  customGenerateSystemMailboxes: vi.fn(),
  createHostedMailbox: vi.fn(),
  user: { is_admin: false },
  showMessage: vi.fn()
}))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string, params?: unknown) => params ? `${key} ${JSON.stringify(params)}` : key }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/api/hostedDomain', () => ({
  hostedDomainAPI: { listAllDomains, createMailbox: createHostedMailbox }
}))
vi.mock('@/api/mailbox', () => ({ mailboxAPI: { getSystemDomains, customGenerateSystemMailboxes } }))
vi.mock('@/api/milkCoin', () => ({ getBalance }))
vi.mock('@/utils/message', () => ({ showMessage }))
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ user }) }))
vi.mock('@/utils/timeUtils', () => ({ formatTimestamp: () => '2027-01-01' }))
vi.mock('@/services/api', () => ({ isInsufficientBalanceError: vi.fn() }))

import CustomGenerateModal from './CustomGenerateModal.vue'
import BaseModal from '@/components/BaseModal/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'

beforeEach(() => {
  user.is_admin = false
  showMessage.mockClear()
})

describe('temporary mailbox random length', () => {
  beforeEach(() => {
    getSystemDomains.mockReset()
    customGenerateSystemMailboxes.mockReset()
    getBalance.mockReset()
    getSystemDomains.mockResolvedValue({
      code: 0,
      data: { items: [{ id: 'platform:1', domain_name: 'temporary.example', expires_at: null }] }
    })
    getBalance.mockResolvedValue({ code: 0, data: { balance: 10 } })
    customGenerateSystemMailboxes.mockResolvedValue({
      code: 0,
      data: { quantity: 1, items: [{ email: 'ab@temporary.example' }], cost: 0.2 }
    })
  })

  it.each(['round_robin', 'random'])('keeps length 2 through confirmation with %s domains', async (domainStrategy) => {
    const wrapper = mount(CustomGenerateModal, {
      props: { visible: false, mailboxType: 'system' },
      global: { stubs: { teleport: true } }
    })
    await wrapper.setProps({ visible: true })
    await flushPromises()

    await wrapper.get('input[type="number"][max="200"]').setValue('1')
    await wrapper.get('input[type="number"][max="24"]').setValue('2')
    wrapper.findComponent(CustomSelect).vm.$emit('update:modelValue', domainStrategy)
    await flushPromises()
    expect(wrapper.text()).toContain('xx@temporary.example')

    const generateButton = wrapper.findComponent(BaseModal).findAll('button')
      .find((button) => button.text() === 'home.customGenerateConfirm')
    expect(generateButton).toBeDefined()
    await generateButton!.trigger('click')
    await flushPromises()
    expect(wrapper.findComponent(ConfirmDialog).props('visible')).toBe(true)
    expect(customGenerateSystemMailboxes).not.toHaveBeenCalled()

    await wrapper.findComponent(ConfirmDialog).get('button').trigger('click')
    await flushPromises()
    expect(customGenerateSystemMailboxes).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      domain_ids: ['platform:1'],
      quantity: 1,
      generation_mode: 'random',
      random_length: 2,
      domain_strategy: domainStrategy
    }))
    expect(wrapper.emitted('success')?.[0]?.[0]).toEqual(expect.objectContaining({
      items: [{ email: 'ab@temporary.example' }]
    }))
    wrapper.unmount()
  })
})

describe('hosted mailbox generation domain picker', () => {
  beforeEach(() => {
    listAllDomains.mockReset()
    createHostedMailbox.mockReset()
    getBalance.mockReset()
    getBalance.mockResolvedValue({ code: 0, data: { balance: 10 } })
  })

  it.each([2, 8, 24])('submits the selected random length %i when creating a hosted mailbox', async (length) => {
    listAllDomains.mockResolvedValue({
      code: 0,
      data: { items: [{ id: 7, domain_name: 'owned.example', status: 'verified', expires_at: null }] }
    })
    createHostedMailbox.mockResolvedValue({ code: 0, data: { id: 43, email_address: `${'a'.repeat(length)}@owned.example`, cost: 0.2 } })
    const wrapper = mount(CustomGenerateModal, {
      props: { visible: false, mailboxType: 'hosted' },
      global: { stubs: { teleport: true } }
    })
    await wrapper.setProps({ visible: true })
    await flushPromises()
    await wrapper.get('input[type="number"][max="200"]').setValue('1')
    await wrapper.get('input[type="number"][max="24"]').setValue(String(length))
    expect(wrapper.text()).toContain(`${'x'.repeat(length)}@owned.example`)

    const generateButton = wrapper.findComponent(BaseModal).findAll('button')
      .find((button) => button.text() === 'home.customGenerateConfirm')
    await generateButton!.trigger('click')
    await flushPromises()
    await wrapper.findComponent(ConfirmDialog).get('button').trigger('click')
    await flushPromises()

    expect(createHostedMailbox).toHaveBeenCalledExactlyOnceWith(7, expect.objectContaining({
      auto_local_part: true,
      random_length: length,
      charge_custom: true
    }))
    expect(wrapper.emitted('success')?.[0]?.[0]).toEqual(expect.objectContaining({
      items: [expect.objectContaining({ email_address: `${'a'.repeat(length)}@owned.example` })]
    }))
    wrapper.unmount()
  })

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
    expect(getBalance).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it.each(['hosted', 'system'])('lets an administrator generate 10 %s mailboxes of length 2 with zero balance', async (mailboxType) => {
    user.is_admin = true
    getBalance.mockResolvedValue({ code: 0, data: { balance: 0 } })
    listAllDomains.mockResolvedValue({ code: 0, data: { items: [{ id: 7, domain_name: 'owned.example', status: 'verified', expires_at: null }] } })
    getSystemDomains.mockResolvedValue({ code: 0, data: { items: [{ id: 'platform:1', domain_name: 'temporary.example', expires_at: null }] } })
    createHostedMailbox.mockResolvedValue({ code: 0, data: { id: 43, email_address: 'ab@owned.example', cost: 0 } })
    customGenerateSystemMailboxes.mockReset().mockResolvedValue({ code: 0, data: { quantity: 10, items: [], cost: 0 } })

    const wrapper = mount(CustomGenerateModal, {
      props: { visible: false, mailboxType },
      global: { stubs: { teleport: true } }
    })
    await wrapper.setProps({ visible: true })
    await flushPromises()
    await wrapper.get('input[type="number"][max="24"]').setValue('2')
    const generateButton = wrapper.findComponent(BaseModal).findAll('button')
      .find((button) => button.text() === 'home.customGenerateConfirm')
    await generateButton!.trigger('click')
    await flushPromises()
    const dialog = wrapper.findComponent(ConfirmDialog)
    expect(dialog.props('confirmText')).toBe('home.customGenerateConfirm')
    expect(dialog.props('message')).toContain('"cost":"0.00"')
    await dialog.get('button').trigger('click')
    await flushPromises()
    if (mailboxType === 'hosted') {
      expect(createHostedMailbox).toHaveBeenCalledTimes(10)
      for (const [domainId, payload] of createHostedMailbox.mock.calls) {
        expect(domainId).toBe(7)
        expect(payload).toMatchObject({ random_length: 2, auto_local_part: true })
      }
    } else {
      expect(customGenerateSystemMailboxes).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ quantity: 10, random_length: 2 }))
    }
    expect(wrapper.emitted('success')?.[0]?.[0]).toMatchObject({ quantity: 10, cost: 0 })
    wrapper.unmount()
  })
})
