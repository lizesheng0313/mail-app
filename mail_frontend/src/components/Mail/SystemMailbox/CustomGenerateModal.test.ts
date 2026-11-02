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

  it('loads domains when first mounted visible', async () => {
    const wrapper = mount(CustomGenerateModal, {
      props: { visible: true, mailboxType: 'system' },
      global: { stubs: { teleport: true } }
    })
    try {
      await flushPromises()
      expect(getSystemDomains).toHaveBeenCalledTimes(1)
      expect(wrapper.text()).toContain('temporary.example')
    } finally {
      wrapper.unmount()
    }
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

  it.each(['round_robin', 'random'])('accepts an exact 0.60 balance for three mailboxes with %s domains', async (domainStrategy) => {
    getBalance.mockResolvedValue({ code: 0, data: { balance: '0.60', general_balance: '0.00', paypal_service_balance: '0.60' } })
    const wrapper = mount(CustomGenerateModal, {
      props: { visible: true, mailboxType: 'system' },
      global: { stubs: { teleport: true } }
    })
    try {
      await flushPromises()
      await wrapper.get('input[type="number"][max="200"]').setValue('3')
      wrapper.findComponent(CustomSelect).vm.$emit('update:modelValue', domainStrategy)
      await flushPromises()
      const generateButton = wrapper.findComponent(BaseModal).findAll('button')
        .find(button => button.text() === 'home.customGenerateConfirm')!
      await generateButton.trigger('click')
      await flushPromises()
      const dialog = wrapper.findComponent(ConfirmDialog)
      expect(dialog.props('confirmText')).toBe('home.customGenerateConfirm')
      expect(dialog.props('message')).toContain('"cost":"0.60"')
      await dialog.get('button').trigger('click')
      await flushPromises()
      expect(customGenerateSystemMailboxes).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ quantity: 3 }))
    } finally { wrapper.unmount() }
  })

  it.each([
    { source: 'platform', held: false, allowed: true },
    { source: 'shared', held: false, allowed: false },
    { source: 'platform', held: true, allowed: false },
  ])('checks the selected $source domain against usable PayPal credits (held=$held)', async ({ source, held, allowed }) => {
    getSystemDomains.mockResolvedValue({ code: 0, data: { items: [{
      id: `${source}:1`, domain_source: source, domain_name: 'selected.example', expires_at: null
    }] } })
    getBalance.mockResolvedValue({ code: 0, data: {
      balance: held ? '0.00' : '1.00', general_balance: '0.00', paypal_service_balance: '1.00', paypal_wallet_blocked: held
    } })
    const wrapper = mount(CustomGenerateModal, {
      props: { visible: true, mailboxType: 'system' },
      global: { stubs: { teleport: true } }
    })
    try {
      await flushPromises()
      await wrapper.get('input[type="number"][max="200"]').setValue('1')
      const generateButton = wrapper.findComponent(BaseModal).findAll('button')
        .find(button => button.text() === 'home.customGenerateConfirm')!
      await generateButton.trigger('click')
      await flushPromises()
      const dialog = wrapper.findComponent(ConfirmDialog)
      expect(dialog.props('confirmText')).toBe(allowed ? 'home.customGenerateConfirm' : 'home.goRecharge')
      if (!allowed) expect(dialog.props('message')).toContain('"balance":"0.00"')
      expect(customGenerateSystemMailboxes).not.toHaveBeenCalled()
    } finally { wrapper.unmount() }
  })
})

describe('hosted mailbox generation domain picker', () => {
  beforeEach(() => {
    listAllDomains.mockReset()
    createHostedMailbox.mockReset()
    customGenerateSystemMailboxes.mockClear()
    getBalance.mockReset()
    getBalance.mockResolvedValue({ code: 0, data: { balance: 10 } })
  })

  it.each([2, 8, 24])('submits the selected random length %i when creating a hosted mailbox', async (length) => {
    listAllDomains.mockResolvedValue({
      code: 0,
      data: { items: [{ id: 7, domain_name: 'owned.example', status: 'verified', expires_at: null }] }
    })
    createHostedMailbox.mockResolvedValue({ code: 0, data: { id: 43, email_address: `${'a'.repeat(length)}@owned.example`, cost: 0 } })
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
      random_length: length
    }))
    expect(createHostedMailbox.mock.calls[0][1]).not.toHaveProperty('charge_custom')
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
    expect(getBalance).not.toHaveBeenCalled()
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
    if (mailboxType === 'system') {
      expect(dialog.props('message')).toContain('"cost":"0.00"')
    } else {
      expect(dialog.props('message')).not.toContain('cost')
    }
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

  it.each([
    { rule: 'ruleRandom', quantity: 3 },
    { rule: 'ruleCustom', quantity: 3 },
    { rule: 'ruleSequence', quantity: 3 },
    { rule: 'ruleSpecified', quantity: 1 }
  ])('lets an ordinary user generate hosted mailboxes for free with $rule and no wallet access', async ({ rule, quantity }) => {
    getBalance.mockImplementation(() => { throw new Error('wallet unavailable') })
    listAllDomains.mockResolvedValue({ code: 0, data: { items: [
      { id: 7, domain_name: 'owned.example', status: 'verified', expires_at: null }
    ] } })
    createHostedMailbox.mockResolvedValue({ code: 0, data: { id: 43, email_address: 'support@owned.example', cost: 0 } })
    const wrapper = mount(CustomGenerateModal, {
      props: { visible: true, mailboxType: 'hosted' },
      global: { stubs: { teleport: true } }
    })
    try {
      await flushPromises()
      await wrapper.findAll('button').find(button => button.text() === `home.${rule}`)!.trigger('click')
      await wrapper.get('input[type="number"][max="200"]').setValue(String(quantity))
      const prefix = wrapper.find('input[maxlength="32"], input[maxlength="64"]')
      if (prefix.exists()) await prefix.setValue('support')
      expect(wrapper.text()).toContain('home.freeGenerate')
      expect(wrapper.text()).not.toContain('home.customGenerateUnitPriceValue')
      expect(wrapper.text()).not.toContain('home.customGenerateRechargeHint')
      const generateButton = wrapper.findComponent(BaseModal).findAll('button')
        .find(button => button.text() === 'home.customGenerateConfirm')!
      await generateButton.trigger('click')
      await flushPromises()
      const dialog = wrapper.findComponent(ConfirmDialog)
      expect(dialog.props('confirmText')).toBe('home.customGenerateConfirm')
      expect(dialog.props('message')).toBe(`home.customGenerateConfirmMessageHosted {"quantity":${quantity}}`)
      await dialog.get('button').trigger('click')
      await flushPromises()
      expect(getBalance).not.toHaveBeenCalled()
      expect(createHostedMailbox).toHaveBeenCalledTimes(quantity)
      for (const [, payload] of createHostedMailbox.mock.calls) {
        expect(payload).not.toHaveProperty('charge_custom')
      }
      expect(wrapper.emitted('success')?.[0]?.[0]).toMatchObject({ quantity, cost: 0 })
      expect(showMessage).toHaveBeenCalledWith(`home.customGenerateSuccessHosted {"count":${quantity}}`, 'success')
      expect(customGenerateSystemMailboxes).not.toHaveBeenCalled()
    } finally { wrapper.unmount() }
  })
})
