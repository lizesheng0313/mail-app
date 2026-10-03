import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  user: { is_admin: false },
  route: { path: '/user/purchases', query: {} as Record<string, string> },
  getMyOrders: vi.fn(),
  getTransactions: vi.fn()
}))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('vue-router', () => ({ useRoute: () => mocks.route }))
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ user: mocks.user }) }))
vi.mock('@/services/api', () => ({ default: { get: mocks.getTransactions } }))
vi.mock('@/i18n', () => ({ getCurrentLocale: () => 'zh-CN' }))
vi.mock('@/utils/message', () => ({ showMessage: vi.fn() }))
vi.mock('@/utils/dialog', () => ({ showConfirm: vi.fn(), showPrompt: vi.fn() }))
vi.mock('@/api/workflowMarket', () => ({
  getMyOrders: mocks.getMyOrders,
  getSellerRefunds: vi.fn(),
  approveWorkflowRefund: vi.fn(),
  rejectWorkflowRefund: vi.fn(),
  adminGetWorkflowRefunds: vi.fn(),
  adminForceWorkflowRefund: vi.fn()
}))

import Purchases from './index.vue'

const sellerTabs = (wrapper: ReturnType<typeof shallowMount>) =>
  wrapper.findAll('button').filter((button) =>
    button.text() === '退款申请'
  )

beforeEach(() => {
  vi.clearAllMocks()
  mocks.user.is_admin = false
  mocks.route.path = '/user/purchases'
  mocks.route.query = {}
  mocks.getTransactions.mockResolvedValue({ code: 0, data: { items: [], total: 0 } })
  mocks.getMyOrders.mockResolvedValue({ code: 0, data: { items: [], total: 0 } })
})

describe('Milk coin transaction tabs', () => {
  it('keeps income visible but hides refund management for buyers without sales', async () => {
    const wrapper = shallowMount(Purchases)
    await flushPromises()

    expect(mocks.getMyOrders).toHaveBeenCalledWith({ page: 1, page_size: 1 })
    expect(sellerTabs(wrapper)).toHaveLength(0)
    expect(wrapper.text()).toContain('purchasesPage.incomeRecords')
    expect(wrapper.text()).toContain('purchasesPage.rechargeRecords')
    expect(wrapper.text()).toContain('purchasesPage.expenseRecords')
    wrapper.unmount()
  })

  it('shows refund management after a user has sold an item', async () => {
    mocks.getMyOrders.mockResolvedValue({ code: 0, data: { items: [], total: 1 } })
    const wrapper = shallowMount(Purchases)
    await flushPromises()

    expect(sellerTabs(wrapper)).toHaveLength(1)
    wrapper.unmount()
  })

  it('keeps administrator refund access visible', async () => {
    mocks.user.is_admin = true
    const wrapper = shallowMount(Purchases)
    await flushPromises()

    expect(mocks.getMyOrders).not.toHaveBeenCalled()
    expect(sellerTabs(wrapper)).toHaveLength(1)
    wrapper.unmount()
  })

  it('opens the personal earnings entry on income records', async () => {
    mocks.route.path = '/user/earnings'
    const wrapper = shallowMount(Purchases)
    await flushPromises()

    expect(mocks.getTransactions).toHaveBeenCalledWith('/milk-coins/transactions', {
      params: { page: 1, page_size: 20, transaction_type: 'earn' }
    })
    wrapper.unmount()
  })
})
