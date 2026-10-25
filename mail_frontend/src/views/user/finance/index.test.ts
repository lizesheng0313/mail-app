import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), getBalance: vi.fn(), message: vi.fn(), methods: vi.fn() }))
vi.mock('@/services/api', () => ({ default: { get: mocks.get, post: mocks.post } }))
vi.mock('@/api/milkCoin', () => ({ getBalance: mocks.getBalance }))
vi.mock('@/utils/message', () => ({ showMessage: mocks.message }))
vi.mock('@/services/rechargePaymentPreference', () => ({ getRechargePaymentMethods: mocks.methods }))
vi.mock('qrcode', () => ({ default: { toCanvas: vi.fn().mockResolvedValue(undefined) } }))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }) }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
import Finance from './index.vue'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.methods.mockReturnValue(['alipay', 'paypal'])
  mocks.getBalance.mockResolvedValue({ code: 0, data: {
    balance: '20.50', general_balance: '5.00', paypal_service_balance: '15.50', paypal_wallet_blocked: false
  } })
})
const renderPage = () => mount(Finance, { global: { stubs: {
  MilkAccountTabs: true, PayPalRecharge: true,
  Dialog: { props: ['open'], template: '<div v-if="open" role="dialog"><slot /></div>' },
  DialogPanel: { template: '<section><slot /></section>' },
  DialogTitle: { template: '<h2><slot /></h2>' }
} } })
const openCheckout = async (wrapper: ReturnType<typeof renderPage>) => {
  await wrapper.get('#recharge-coins').setValue('10.50')
  await wrapper.get('#recharge').findAll('button').find(button => button.text() === 'financePage.rechargeNow')!.trigger('click')
  await flushPromises()
}
const selectPayPal = async (wrapper: ReturnType<typeof renderPage>) => {
  await openCheckout(wrapper)
  await wrapper.get('input[value="paypal"]').setValue()
  await flushPromises()
}

describe('Balance and recharge page', () => {
  it('shows one available balance with no new withdrawal form', async () => {
    const wrapper = renderPage()
    await flushPromises()
    expect(wrapper.text()).toContain('20.50')
    expect(wrapper.text()).not.toContain('paypalRecharge.generalBalance')
    expect(wrapper.text()).not.toContain('paypalRecharge.serviceBalance')
    expect(wrapper.text()).toContain('paypalRecharge.noWithdrawal')
    expect(wrapper.findAll('input')).toHaveLength(1)
    expect(wrapper.find('input#recharge-coins').exists()).toBe(true)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'PayPalRecharge' }).exists()).toBe(false)
    expect(mocks.post).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('refreshes the wallet after PayPal confirms payment', async () => {
    const wrapper = renderPage()
    await selectPayPal(wrapper)
    wrapper.getComponent({ name: 'PayPalRecharge' }).vm.$emit('paid', { status: 'paid' })
    await flushPromises()
    expect(mocks.getBalance).toHaveBeenCalledTimes(2)
    expect(mocks.message).toHaveBeenCalledWith('profile.rechargeSuccess', 'success')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('does not report held PayPal credits as spendable', async () => {
    const wrapper = renderPage()
    await selectPayPal(wrapper)
    wrapper.getComponent({ name: 'PayPalRecharge' }).vm.$emit('paid', { status: 'review' })
    await flushPromises()
    expect(mocks.message).toHaveBeenCalledWith('paypalRecharge.review', 'warning')
    wrapper.unmount()
  })

  it('opens method selection first and creates an Alipay QR only after explicit payment', async () => {
    mocks.post.mockResolvedValue({ code: 0, data: { order_no: 'ALI-1', amount: '10.50', qr_code: 'test-qr' } })
    const wrapper = renderPage()
    await openCheckout(wrapper)
    expect(wrapper.findAll('input[type="radio"]').map(input => input.attributes('value'))).toEqual(['alipay', 'paypal'])
    expect(wrapper.text()).toContain('CNY 10.50')
    expect(wrapper.find('canvas').exists()).toBe(false)
    expect(mocks.post).not.toHaveBeenCalled()
    await wrapper.findAll('button').find(button => button.text() === 'rechargeCheckout.payAlipay')!.trigger('click')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledExactlyOnceWith('/recharge/create-order', { amount: 10.5 })
    expect(wrapper.find('canvas').exists()).toBe(true)
    await wrapper.findAll('button').find(button => button.text() === 'rechargeCheckout.changeMethod')!.trigger('click')
    expect(wrapper.find('canvas').exists()).toBe(false)
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(2)
    expect(mocks.post).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('puts PayPal first overseas and allows switching to Alipay with an explicit currency change', async () => {
    mocks.methods.mockReturnValue(['paypal', 'alipay'])
    const wrapper = renderPage()
    await openCheckout(wrapper)
    expect(wrapper.findAll('input[type="radio"]').map(input => input.attributes('value'))).toEqual(['paypal', 'alipay'])
    expect(wrapper.text()).toContain('USD 10.50')
    expect(wrapper.getComponent({ name: 'PayPalRecharge' }).props('initialAmount')).toBe('10.50')
    await wrapper.get('input[value="alipay"]').setValue()
    expect(wrapper.text()).toContain('CNY 10.50')
    expect(wrapper.findComponent({ name: 'PayPalRecharge' }).exists()).toBe(false)
    expect(mocks.post).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('keeps the dialog and method locked while PayPal is confirming payment', async () => {
    const wrapper = renderPage()
    await selectPayPal(wrapper)
    const paypal = wrapper.getComponent({ name: 'PayPalRecharge' })
    paypal.vm.$emit('busy-change', true)
    await flushPromises()
    expect(wrapper.get('fieldset').attributes('disabled')).toBeDefined()
    const close = wrapper.get('button[aria-label="common.close"]')
    expect(close.attributes('disabled')).toBeDefined()
    await close.trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    paypal.vm.$emit('busy-change', false)
    await flushPromises()
    await close.trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
