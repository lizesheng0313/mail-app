import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'

vi.mock('@/api/workflowMarket', () => ({ adminGetWorkflowRefunds: vi.fn(), adminForceWorkflowRefund: vi.fn() }))
vi.mock('@/utils/message', () => ({ showMessage: vi.fn() }))
vi.mock('@/utils/dialog', () => ({ showAlert: vi.fn(), showPrompt: vi.fn() }))
vi.mock('@/services/api', () => ({ extractFetchErrorMessage: vi.fn() }))
import Transactions from './index.vue'

const rows = [
  { id: 1, account_type: 'wechat', wechat_user_id: 719, user_id: null, user_email: null,
    user_display_name: '微信昵称甲', transaction_no: 'WXN-1', transaction_type: 'recharge',
    description: '支付宝充值: 5.00元', amount: 5, balance_before: 0, balance_after: 5,
    created_at: 1793078813633, order_no: 'RECHARGE-WX' },
  { id: 1, account_type: 'web', user_id: 719, user_email: 'website@example.test',
    user_display_name: 'website@example.test', transaction_no: 'TXN-1', transaction_type: 'recharge',
    description: '网站充值', amount: 10, balance_before: 0, balance_after: 10, created_at: 1793078813633 },
  { id: 2, account_type: 'wechat', wechat_user_id: 720, user_id: null, user_display_name: '  ',
    transaction_no: 'WXN-2', transaction_type: 'recharge', amount: 2, created_at: 1793078813633 },
]

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
    code: 0, data: { items: rows, total: 3 },
  }) }))
  localStorage.setItem('token', 'local-test-token')
})
afterEach(() => vi.unstubAllGlobals())

function mountPage() {
  return mount(Transactions, { global: { stubs: {
    AdminDataTable: { template: '<table><thead><slot name="thead" /></thead><tbody><slot name="tbody" /></tbody></table>' },
    ActionButton: true,
  } } })
}

it('shows each ledger identity and a fallback for miniapp accounts without a nickname', async () => {
  const wrapper = mountPage()
  await flushPromises()
  const tableRows = wrapper.findAll('tbody tr')
  expect(tableRows).toHaveLength(3)
  expect(tableRows[0].text()).toContain('微信昵称甲')
  expect(tableRows[0].text()).toContain('小程序 · ID: 719')
  expect(tableRows[0].text()).toContain('0 → 5')
  expect(tableRows[0].text()).not.toContain('website@example.test')
  expect(tableRows[1].text()).toContain('网站 · ID: 719')
  expect(tableRows[2].text()).toContain('小程序用户 720')
  await tableRows[0].get('button').trigger('click')
  expect(wrapper.text()).toContain('账户来源 / 用户 ID')
  expect(wrapper.text()).toContain('RECHARGE-WX')
  wrapper.unmount()
})

it('retains both rows with the same numeric ID after a reload and uses unified recharge search', async () => {
  const wrapper = mountPage()
  await flushPromises()
  await wrapper.findAll('button').find(b => b.text() === '充值记录')!.trigger('click')
  await flushPromises()
  const search = wrapper.get('input')
  await search.setValue('微信昵称甲')
  await search.trigger('keyup.enter')
  await flushPromises()
  const url = new URL(vi.mocked(fetch).mock.lastCall![0] as string, 'http://localhost')
  expect(url.searchParams.get('transaction_type')).toBe('recharge')
  expect(url.searchParams.get('keyword')).toBe('微信昵称甲')
  expect(wrapper.findAll('tbody tr')).toHaveLength(3)
  wrapper.unmount()
})
