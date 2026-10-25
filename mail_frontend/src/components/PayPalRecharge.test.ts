import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/services/api', () => ({ default: mocks }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
import PayPalRecharge from './PayPalRecharge.vue'

let callbacks: any
let sdk: any
beforeEach(() => {
  vi.clearAllMocks()
  mocks.get.mockResolvedValue({ code: 0, data: { enabled: true, client_id: 'public-test-client' } })
  sdk = { Buttons: vi.fn(options => {
    callbacks = options
    return { render: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined) }
  }) }
  ;(window as any).paypalMailCheckout = sdk
})
afterEach(() => { delete (window as any).paypalMailCheckout })

describe('PayPal recharge', () => {
  it('uses the dialog amount without a second amount field and reports checkout activity', async () => {
    mocks.post.mockResolvedValue({ code: 0, data: { paypal_order_id: 'ORDER-1' } })
    const wrapper = mount(PayPalRecharge, { props: { initialAmount: '10.50', checkoutOnly: true } })
    await flushPromises()
    expect(wrapper.find('input').exists()).toBe(false)
    await callbacks.createOrder()
    expect(mocks.post).toHaveBeenCalledWith('/recharge/paypal/create-order', { amount: '10.50' })
    expect(wrapper.emitted('busy-change')).toEqual([[true]])
    callbacks.onCancel()
    expect(wrapper.emitted('busy-change')).toEqual([[true], [false]])
    wrapper.unmount()
  })

  it('creates and captures through the server, locks the amount, then refreshes only after confirmation', async () => {
    mocks.post.mockResolvedValueOnce({ code: 0, data: { paypal_order_id: 'ORDER-1' } })
      .mockResolvedValueOnce({ code: 0, data: { status: 'paid', milk_coins: '10.50' } })
    const wrapper = mount(PayPalRecharge, { props: { initialAmount: '10.50' } })
    await flushPromises()
    expect(await callbacks.createOrder()).toBe('ORDER-1')
    expect(mocks.post).toHaveBeenNthCalledWith(1, '/recharge/paypal/create-order', { amount: '10.50' })
    await flushPromises()
    expect(wrapper.get('input').attributes('disabled')).toBeDefined()
    await wrapper.setProps({ initialAmount: '999' })
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('10.50')
    expect(wrapper.emitted('paid')).toBeUndefined()
    await callbacks.onApprove({ orderID: 'ORDER-1' })
    expect(mocks.post).toHaveBeenNthCalledWith(2, '/recharge/paypal/capture/ORDER-1', {}, { timeout: 60000 })
    expect(wrapper.emitted('paid')?.[0]).toEqual([{ status: 'paid', milk_coins: '10.50' }])
    wrapper.unmount()
  })

  it('does not report success when capture cannot be confirmed', async () => {
    mocks.post.mockRejectedValue(new Error('timeout'))
    const wrapper = mount(PayPalRecharge)
    await flushPromises()
    await callbacks.onApprove({ orderID: 'ORDER-1' })
    expect(wrapper.emitted('paid')).toBeUndefined()
    expect(wrapper.get('[role="alert"]').text()).toBe('paypalRecharge.pending')
    wrapper.unmount()
  })

  it('keeps review credits visibly on hold', async () => {
    mocks.post.mockResolvedValue({ code: 0, data: { status: 'review' } })
    const wrapper = mount(PayPalRecharge)
    await flushPromises()
    await callbacks.onApprove({ orderID: 'ORDER-1' })
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('paypalRecharge.review')
    expect(wrapper.emitted('paid')?.[0]).toEqual([{ status: 'review' }])
    wrapper.unmount()
  })

  it.each(['0', '0.99', '1.001', '1000.01', '-1'])('rejects invalid USD amount %s before order creation', async amount => {
    const wrapper = mount(PayPalRecharge, { props: { initialAmount: amount } })
    await flushPromises()
    await expect(callbacks.createOrder()).rejects.toThrow()
    expect(mocks.post).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('does not load the checkout SDK when PayPal is disabled', async () => {
    mocks.get.mockResolvedValue({ code: 0, data: { enabled: false, client_id: '' } })
    const wrapper = mount(PayPalRecharge)
    await flushPromises()
    expect(sdk.Buttons).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('paypalRecharge.unavailable')
    expect(document.getElementById('mail-paypal-sdk')).toBeNull()
    wrapper.unmount()
  })
})
