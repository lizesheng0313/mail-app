import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const api = vi.hoisted(() => ({ getPluginPricing: vi.fn(), createPluginOrder: vi.fn(), createPluginQrOrder: vi.fn(), queryPluginOrder: vi.fn() }))
vi.mock('@/api/plugin', () => ({ pluginApi: api }))
vi.mock('@/utils/message', () => ({ showMessage: vi.fn() }))
import Purchase from './index.vue'
let wrapper: any
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  vi.spyOn(window, 'open').mockImplementation(() => null)
  api.getPluginPricing.mockResolvedValue({ code: 0, data: { pricing: [{ id: 1, price: 10, duration_type: 'monthly', duration_days: 30 }] } })
  api.createPluginOrder.mockResolvedValue({ code: 0, data: { order_no: 'order-1', pay_url: 'https://example.test/pay' } })
  api.queryPluginOrder.mockResolvedValue({ code: 0, data: { status: 'paid' } })
  wrapper = mount(Purchase, { props: { plugin: { plugin_id: 'test', name: 'test' } }, global: { stubs: { PluginIcon: true } } })
})
afterEach(() => { wrapper.unmount(); vi.restoreAllMocks(); vi.useRealTimers() })
it('keeps checkout functional and checks its result only when the user clicks', async () => {
  await flushPromises()
  await wrapper.findAll('button').find((button: any) => button.text() === '立即购买')!.trigger('click')
  await flushPromises()
  expect(api.createPluginOrder).toHaveBeenCalledWith('test', 1)
  await vi.advanceTimersByTimeAsync(60000)
  expect(api.queryPluginOrder).not.toHaveBeenCalled()
  await wrapper.findAll('button').find((button: any) => button.text() === '已支付，查询结果')!.trigger('click')
  await flushPromises()
  expect(api.queryPluginOrder).toHaveBeenCalledExactlyOnceWith('order-1')
  expect(wrapper.emitted('success')).toHaveLength(1)
})
