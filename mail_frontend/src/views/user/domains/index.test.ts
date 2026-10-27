import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listDomains: vi.fn(), getDomainDetail: vi.fn(), refreshDns: vi.fn(), diagnoseDns: vi.fn(),
  getSharedEarningsSummary: vi.fn(), getPreference: vi.fn()
}))
vi.mock('@/api/hostedDomain', () => ({ hostedDomainAPI: mocks }))
vi.mock('@/api/notification', () => ({ getSharedEarningsNoticePreference: mocks.getPreference, setSharedEarningsNoticePreference: vi.fn() }))
vi.mock('@/utils/message', () => ({ showMessage: vi.fn() }))
vi.mock('vue-i18n', async importOriginal => ({ ...(await importOriginal<typeof import('vue-i18n')>()), useI18n: () => ({ t: (key: string) => key }) }))

import Page from './index.vue'
import DnsDiagnosisPanel from './components/DnsDiagnosisPanel.vue'

const domain = { id: 374, domain_name: 'lizhongzzzz.eu.cc', status: 'pending' }
const detail = { domain, dns_zone: domain.domain_name, dns_instructions: [
  { record_type: 'TXT', record_host: '_fm_verify', configuration_host: '_fm_verify', record_name: '_fm_verify.' + domain.domain_name, record_value: 'fmv-test' },
  { record_type: 'MX', record_host: '@', configuration_host: '@', record_name: domain.domain_name, record_value: 'mx.zjkdongao.cn', priority: 10 }
] }
const diagnostic = { domain_name: domain.domain_name, dns_zone: domain.domain_name, source: 'ai', summary: '域名前缀重复了', records: [
  { id: 0, record_type: 'TXT', record_host: '_fm_verify', record_name: '_fm_verify.' + domain.domain_name, record_value: 'fmv-test', explanation: '把主机记录改成 _fm_verify', misplaced_records: [{ record_name: '_fm_verify.lizhongzzzz.' + domain.domain_name, record_host: '_fm_verify.lizhongzzzz' }] },
  { id: 1, record_type: 'MX', record_host: '@', record_name: domain.domain_name, record_value: 'mx.zjkdongao.cn', priority: 10, explanation: '把主机记录改成 @', misplaced_records: [] }
], next_step: '保存后等待缓存刷新，再验证。' }

const mountPage = () => mount(Page, { global: { stubs: {
  AdminDataTable: { template: '<div><slot name="header"/><table><tbody><slot name="tbody"/></tbody></table></div>' },
  ActionButton: { props: ['tooltip'], template: '<button :aria-label="tooltip" @click="$emit(\'click\')">{{ tooltip }}</button>' },
  BaseModal: { props: ['modelValue'], template: '<div v-if="modelValue" role="dialog"><button aria-label="close" @click="$emit(\'close\')">close</button><slot/></div>' },
  BaseInput: true, ConfirmDialog: true, CatchAllSettingCard: true
} } })

const openAndVerify = async (wrapper: ReturnType<typeof mountPage>) => {
  const open = wrapper.find('button[aria-label="详情"]')
  expect(open.exists()).toBe(true)
  await open.trigger('click')
  await flushPromises()
  await wrapper.findAll('button').find(button => button.text() === '立即验证DNS')!.trigger('click')
  await flushPromises()
}

describe('DNS verification diagnosis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } })
    mocks.listDomains.mockResolvedValue({ code: 0, data: { items: [domain], pagination: { page: 1, limit: 20, total: 1, pages: 1 } } })
    mocks.getDomainDetail.mockResolvedValue({ code: 0, data: detail })
    mocks.refreshDns.mockResolvedValue({ code: 0, data: detail })
    mocks.diagnoseDns.mockResolvedValue({ code: 0, data: diagnostic })
    mocks.getSharedEarningsSummary.mockResolvedValue({ code: 0, data: {} })
    mocks.getPreference.mockResolvedValue({ code: 0, data: { enabled: true } })
  })

  it('automatically explains failed verification with exact, copyable configuration', async () => {
    const wrapper = mountPage()
    await flushPromises()
    await openAndVerify(wrapper)
    expect(mocks.diagnoseDns).toHaveBeenCalledWith(374)
    expect(wrapper.text()).toContain('域名前缀重复了')
    expect(wrapper.text()).toContain('把主机记录改成 @')
    const panel = wrapper.getComponent(DnsDiagnosisPanel)
    expect(panel.findAll('dd').map(item => item.text())).toContain('@')
    expect(panel.findAll('dd').map(item => item.text())).toContain('_fm_verify')
    const firstCopy = panel.findAll('button').find(button => button.text() === 'common.copy')!
    await firstCopy.trigger('click')
    expect(panel.emitted('copy')?.[0]).toEqual(['_fm_verify'])
    wrapper.unmount()
  })

  it('does not call AI when verification succeeds', async () => {
    mocks.refreshDns.mockResolvedValue({ code: 0, data: { ...detail, domain: { ...domain, status: 'verified' } } })
    const wrapper = mountPage()
    await flushPromises()
    await openAndVerify(wrapper)
    expect(mocks.diagnoseDns).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('shows retry on diagnosis failure without losing the DNS configuration', async () => {
    mocks.diagnoseDns.mockRejectedValueOnce(new Error('offline'))
    const wrapper = mountPage()
    await flushPromises()
    await openAndVerify(wrapper)
    expect(wrapper.text()).toContain('dnsDiagnosis.failed')
    expect(wrapper.text()).toContain('mx.zjkdongao.cn')
    await wrapper.getComponent(DnsDiagnosisPanel).get('button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('域名前缀重复了')
    wrapper.unmount()
  })

  it('discards a diagnosis that returns after the modal closes', async () => {
    let resolve: (value: any) => void = () => {}
    mocks.diagnoseDns.mockReturnValueOnce(new Promise(done => { resolve = done }))
    const wrapper = mountPage()
    await flushPromises()
    await openAndVerify(wrapper)
    expect(wrapper.text()).toContain('dnsDiagnosis.loading')
    await wrapper.get('button[aria-label="close"]').trigger('click')
    resolve({ code: 0, data: diagnostic })
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
