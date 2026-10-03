import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getDashboardStats: vi.fn(), getMyWorkflows: vi.fn(), getMyOrders: vi.fn(),
  getSellerRefunds: vi.fn(), getStoreLinks: vi.fn(),
  approveWorkflowRefund: vi.fn(), rejectWorkflowRefund: vi.fn(),
  createWorkflowShare: vi.fn(), revokeStoreLink: vi.fn(),
  showConfirm: vi.fn(), showPrompt: vi.fn(), showMessage: vi.fn()
}))

vi.mock('@/api/workflowMarket', () => mocks)
vi.mock('@/utils/dialog', () => ({ showConfirm: mocks.showConfirm, showPrompt: mocks.showPrompt }))
vi.mock('@/utils/message', () => ({ showMessage: mocks.showMessage }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn(), resolve: vi.fn() }) }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

import StoreWorkbench from './StoreWorkbench.vue'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getDashboardStats.mockResolvedValue({ code: 0, data: { revenue: { total: 0 } } })
  mocks.getMyWorkflows.mockResolvedValue({ code: 0, data: { items: [], total: 0 } })
  mocks.getMyOrders.mockResolvedValue({ code: 0, data: { items: [], total: 0 } })
  mocks.getSellerRefunds.mockImplementation((params) => Promise.resolve({
    code: 0,
    data: params.status
      ? { items: [], total: 1 }
      : { items: [{ id: 31, refund_no: 'R31', workflow_name: '商品', reason: '买家申请', status: 'pending' }], total: 1 }
  }))
  mocks.getStoreLinks.mockResolvedValue({ code: 0, data: { items: [], total: 0 } })
  mocks.showPrompt.mockResolvedValue('未符合售后条件')
  mocks.rejectWorkflowRefund.mockResolvedValue({ code: 0 })
})

describe('private store workbench', () => {
  it('requires a reason when rejecting a refund', async () => {
    const wrapper = mount(StoreWorkbench, {
      global: {
        stubs: {
          AdminDataTable: { template: '<table><thead><slot name="thead" /></thead><tbody><slot name="tbody" /></tbody></table>' },
          RouterLink: true
        }
      }
    })
    await flushPromises()

    const refundTab = wrapper.findAll('button').find((button) => button.text() === '退款')
    await refundTab!.trigger('click')
    await flushPromises()
    const reject = wrapper.findAll('button').find((button) => button.text() === '拒绝')
    await reject!.trigger('click')
    await flushPromises()

    expect(mocks.showPrompt).toHaveBeenCalledWith('请输入拒绝原因', '拒绝退款', '')
    expect(mocks.rejectWorkflowRefund).toHaveBeenCalledWith(31, '未符合售后条件')
    wrapper.unmount()
  })
})
