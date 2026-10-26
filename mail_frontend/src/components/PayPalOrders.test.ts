import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/services/api', () => ({ default: api }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
import PayPalOrders from './PayPalOrders.vue'
const order = { order_no: 'PPR-1', paypal_order_id: 'ORDER-1', usd_amount: '10.00', milk_coins: '10.00', currency: 'USD', status: 'pending', created_at: 123 }
beforeEach(() => {
  vi.resetAllMocks()
  api.get.mockResolvedValue({ code: 0, data: { items: [{ ...order }], next_cursor: null } })
})
describe('recovering PayPal orders', () => {
  it('restores server orders on a fresh mount and checks the original without creating another payment', async () => {
    api.post.mockResolvedValue({ code: 0, data: { ...order, status: 'paid' } })
    const wrapper = mount(PayPalOrders)
    await flushPromises()
    expect(wrapper.text()).toContain('USD 10.00')
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(api.post).toHaveBeenCalledOnce()
    expect(api.post.mock.calls[0][0]).toBe('/recharge/paypal/orders/PPR-1/check')
    expect(wrapper.emitted('paid')?.[0][0]).toMatchObject({ status: 'paid' })
    expect(wrapper.text()).toContain('paypalOrders.paid')
    wrapper.unmount()
  })
  it('keeps the original pending order after network failure', async () => {
    api.post.mockRejectedValue(new Error('Timeout'))
    const wrapper = mount(PayPalOrders)
    await flushPromises()
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('PPR-1')
    expect(wrapper.text()).toContain('paypalRecharge.pending')
    expect(wrapper.emitted('paid')).toBeUndefined()
    wrapper.unmount()
  })
  it('does not show an empty orders card', async () => {
    api.get.mockResolvedValue({ code: 0, data: { items: [] } })
    const wrapper = mount(PayPalOrders)
    await flushPromises()
    expect(wrapper.find('section').exists()).toBe(false)
    wrapper.unmount()
  })
})
