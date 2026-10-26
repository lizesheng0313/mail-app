import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/services/api', () => ({ default: api }))
import PayPalFinance from './PayPalFinance.vue'

beforeEach(() => {
  vi.resetAllMocks()
  api.get.mockImplementation((url: string) => Promise.resolve({ code: 0, data: { items: url.endsWith('reviews')
    ? [{ id: 12, order_no: 'PPR-1', user_id: 9, event_type: 'PAYMENT.CAPTURE.REFUNDED', milk_coins: '10.00', refunded_coins: '2.00' }]
    : [{ order_no: 'PPR-1', user_id: 9, usd_amount: '10.00', currency: 'USD', milk_coins: '10.00', status: 'review' }], next_cursor: null } }))
})

it('filters original orders by exact identifier and status', async () => {
  const wrapper = mount(PayPalFinance)
  await flushPromises()
  await wrapper.get('[aria-label="PayPal 订单号"]').setValue('CAPTURE-1')
  await wrapper.get('[aria-label="订单状态"]').setValue('review')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(api.get).toHaveBeenLastCalledWith('/finance/admin/paypal-orders', { params: { keyword: 'CAPTURE-1', status: 'review', before_id: undefined } })
  expect(wrapper.text()).toContain('USD 10.00')
  wrapper.unmount()
})

it('requires provider verification and sends a cumulative refund, preserving the form when balance is spent', async () => {
  api.post.mockRejectedValue({ response: { data: { detail: 'PayPal 奶片不足，继续冻结' } } })
  const wrapper = mount(PayPalFinance)
  await flushPromises()
  await wrapper.findAll('button').find(button => button.text() === '核对处理')!.trigger('click')
  const form = wrapper.findAll('form')[1]
  await form.trigger('submit')
  expect(api.post).not.toHaveBeenCalled()
  expect(form.findAll('option').map(option => option.element.value)).toEqual(['refund'])
  await form.get('input[type="number"]').setValue('5.00')
  await form.get('input[maxlength="128"]').setValue('REFUND-1')
  await form.get('textarea').setValue('已核对 PayPal 累计退款五美元')
  await form.get('input[type="checkbox"]').setValue(true)
  await form.trigger('submit')
  await flushPromises()
  expect(api.post).toHaveBeenCalledWith('/finance/admin/paypal-reviews/12/resolve', {
    outcome: 'refund', refunded_total: 5, reference: 'REFUND-1', note: '已核对 PayPal 累计退款五美元', provider_verified: true
  })
  expect(wrapper.get('[role="alert"]').text()).toContain('继续冻结')
  expect(Number(form.get('input[type="number"]').element.value)).toBe(5)
  wrapper.unmount()
})
