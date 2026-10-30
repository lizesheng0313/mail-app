import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listDomains: vi.fn(),
  getDomainDetail: vi.fn(),
  refreshDns: vi.fn(),
  diagnoseDns: vi.fn(),
  getSharedEarningsSummary: vi.fn(),
  getPreference: vi.fn()
}))
vi.mock('@/api/hostedDomain', () => ({ hostedDomainAPI: mocks }))
vi.mock('@/api/notification', () => ({
  getSharedEarningsNoticePreference: mocks.getPreference,
  setSharedEarningsNoticePreference: vi.fn()
}))
vi.mock('@/utils/message', () => ({ showMessage: vi.fn() }))
vi.mock('vue-i18n', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-i18n')>()),
  useI18n: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}:${Object.values(params).join(':')}` : key
  })
}))

import Page from './index.vue'
import DnsDiagnosisPanel from './components/DnsDiagnosisPanel.vue'

const domain = { id: 374, domain_name: 'lizhongzzzz.eu.cc', status: 'pending' }
const detail = {
  domain,
  dns_zone: domain.domain_name,
  dns_instructions: [
    {
      record_type: 'TXT',
      record_host: '_fm_verify',
      configuration_host: '_fm_verify',
      record_name: '_fm_verify.' + domain.domain_name,
      record_value: 'fmv-test',
      status: 'not_found',
      check_message: '未查询到记录；查询源：权威 NS、公共 DNS'
    },
    {
      record_type: 'MX',
      record_host: '@',
      configuration_host: '@',
      record_name: domain.domain_name,
      record_value: 'mx.zjkdongao.cn',
      priority: 10,
      status: 'invalid'
    }
  ]
}
const diagnostic = {
  domain_name: domain.domain_name,
  dns_zone: domain.domain_name,
  source: 'ai',
  summary: '域名前缀重复了',
  records: [
    {
      id: 0,
      record_type: 'TXT',
      record_host: '_fm_verify',
      record_name: '_fm_verify.' + domain.domain_name,
      record_value: 'fmv-test',
      status: 'wrong_host',
      explanation: '把主机记录改成 _fm_verify',
      misplaced_records: [
        {
          record_name: '_fm_verify.lizhongzzzz.' + domain.domain_name,
          record_host: '_fm_verify.lizhongzzzz'
        }
      ]
    },
    {
      id: 1,
      record_type: 'MX',
      record_host: '@',
      record_name: domain.domain_name,
      record_value: 'mx.zjkdongao.cn',
      priority: 10,
      status: 'mismatch',
      explanation: '把主机记录改成 @',
      misplaced_records: []
    }
  ],
  next_step: '保存后等待缓存刷新，再验证。'
}

const mountPage = () =>
  mount(Page, {
    global: {
      stubs: {
        AdminDataTable: {
          template:
            '<div><slot name="header"/><table><tbody><slot name="tbody"/></tbody></table></div>'
        },
        ActionButton: {
          props: ['tooltip'],
          template: '<button :aria-label="tooltip" @click="$emit(\'click\')">{{ tooltip }}</button>'
        },
        BaseModal: {
          props: ['modelValue'],
          template:
            '<div v-if="modelValue" role="dialog"><button aria-label="close" @click="$emit(\'close\')">close</button><slot/></div>'
        },
        Dialog: { props: ['open'], template: '<div v-if="open" role="dialog"><slot/></div>' },
        DialogPanel: { template: '<div><slot/></div>' },
        DialogTitle: { template: '<h2><slot/></h2>' },
        BaseInput: true,
        ConfirmDialog: true,
        CatchAllSettingCard: true
      }
    }
  })

const openDetails = async (wrapper: ReturnType<typeof mountPage>) => {
  await wrapper.get('button[aria-label="详情"]').trigger('click')
  await flushPromises()
}
const openAndVerify = async (wrapper: ReturnType<typeof mountPage>) => {
  await openDetails(wrapper)
  await wrapper
    .findAll('button')
    .find((button) => button.text() === '立即验证DNS')!
    .trigger('click')
  await flushPromises()
}
const deferred = () => {
  let resolve!: (value: any) => void
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const recordButton = (wrapper: ReturnType<typeof mountPage>, type: string, host: string) =>
  wrapper.get(`button[aria-label="dnsDiagnosis.recordAdvice:${type}:${host}"]`)

describe('DNS verification diagnosis', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) }
    })
    mocks.listDomains.mockResolvedValue({
      code: 0,
      data: { items: [domain], pagination: { page: 1, limit: 20, total: 1, pages: 1 } }
    })
    mocks.getDomainDetail.mockResolvedValue({ code: 0, data: detail })
    mocks.refreshDns.mockResolvedValue({ code: 0, data: detail })
    mocks.diagnoseDns.mockResolvedValue({ code: 0, data: diagnostic })
    mocks.getSharedEarningsSummary.mockResolvedValue({ code: 0, data: {} })
    mocks.getPreference.mockResolvedValue({ code: 0, data: { enabled: true } })
  })

  it('opens failed verification in a drawer with individually expandable, copyable records', async () => {
    const wrapper = mountPage()
    await flushPromises()
    await openAndVerify(wrapper)
    expect(mocks.diagnoseDns).toHaveBeenCalledWith(374)
    const panel = wrapper.getComponent(DnsDiagnosisPanel)
    expect(panel.props('open')).toBe(true)
    expect(panel.text()).toContain('域名前缀重复了')
    expect(panel.get('button[aria-expanded="true"]').text()).toContain('TXT')
    expect(panel.findAll('dd').map((item) => item.text())).toContain('_fm_verify')
    await panel.get('button[aria-label="dnsDiagnosis.copyHost"]').trigger('click')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('_fm_verify')
    await panel.get('button[aria-expanded="false"]').trigger('click')
    expect(panel.text()).toContain('把主机记录改成 @')
    expect(panel.findAll('dd').map((item) => item.text())).toEqual(['@', 'mx.zjkdongao.cn', '10'])
    await panel.get('button[aria-label="dnsDiagnosis.copyValue"]').trigger('click')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('mx.zjkdongao.cn')
    wrapper.unmount()
  })

  it('does not call AI when verification succeeds', async () => {
    mocks.refreshDns.mockResolvedValue({
      code: 0,
      data: { ...detail, domain: { ...domain, status: 'verified' } }
    })
    const wrapper = mountPage()
    await flushPromises()
    await openAndVerify(wrapper)
    expect(mocks.diagnoseDns).not.toHaveBeenCalled()
    expect(wrapper.getComponent(DnsDiagnosisPanel).props('open')).toBe(false)
    wrapper.unmount()
  })

  it('shows retry on analysis failure without losing the DNS configuration', async () => {
    mocks.diagnoseDns.mockRejectedValueOnce(new Error('offline'))
    const wrapper = mountPage()
    await flushPromises()
    await openAndVerify(wrapper)
    const panel = wrapper.getComponent(DnsDiagnosisPanel)
    expect(panel.get('[role="alert"]').text()).toContain('dnsDiagnosis.failed')
    expect(wrapper.text()).toContain('mx.zjkdongao.cn')
    await panel
      .findAll('button')
      .find((button) => button.text() === 'common.retry')!
      .trigger('click')
    await flushPromises()
    expect(panel.text()).toContain('域名前缀重复了')
    wrapper.unmount()
  })

  it('announces AI work before results arrive and keeps it running after the drawer closes', async () => {
    const pending = deferred()
    mocks.diagnoseDns.mockReturnValueOnce(pending.promise)
    const wrapper = mountPage()
    await flushPromises()
    await openAndVerify(wrapper)
    const panel = wrapper.getComponent(DnsDiagnosisPanel)
    expect(panel.props('open')).toBe(true)
    expect(panel.get('[role="status"]').text()).toContain('dnsDiagnosis.loading')
    expect(panel.findAll('dd')).toHaveLength(0)
    await panel.get('button[aria-label="common.close"]').trigger('click')
    expect(panel.props('open')).toBe(false)
    expect(wrapper.text()).toContain('dnsDiagnosis.viewProgress')
    pending.resolve({ code: 0, data: diagnostic })
    await flushPromises()
    expect(panel.props('open')).toBe(false)
    expect(wrapper.text()).toContain('dnsDiagnosis.ready')
    await recordButton(wrapper, 'MX', '@').trigger('click')
    expect(panel.props('open')).toBe(true)
    expect(panel.get('button[aria-expanded="true"]').text()).toContain('MX')
    expect(mocks.diagnoseDns).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('opens the selected record after a direct analysis and does not duplicate a pending request', async () => {
    const pending = deferred()
    mocks.diagnoseDns.mockReturnValueOnce(pending.promise)
    const wrapper = mountPage()
    await flushPromises()
    await openDetails(wrapper)
    expect(wrapper.text()).toContain('dnsDiagnosis.noticeHint')
    await recordButton(wrapper, 'MX', '@').trigger('click')
    const panel = wrapper.getComponent(DnsDiagnosisPanel)
    await panel.get('button[aria-label="common.close"]').trigger('click')
    await recordButton(wrapper, 'MX', '@').trigger('click')
    expect(mocks.diagnoseDns).toHaveBeenCalledTimes(1)
    pending.resolve({ code: 0, data: diagnostic })
    await flushPromises()
    expect(panel.get('button[aria-expanded="true"]').text()).toContain('MX')
    wrapper.unmount()
  })

  it('keeps missing records distinct from lookup failures and puts verbose evidence behind details', async () => {
    mocks.diagnoseDns.mockResolvedValue({
      code: 0,
      data: {
        ...diagnostic,
        records: [
          { ...diagnostic.records[0], status: 'missing', misplaced_records: [] },
          {
            ...diagnostic.records[1],
            status: 'query_failed',
            explanation: 'DNS 查询超时，请稍后再试'
          }
        ]
      }
    })
    const wrapper = mountPage()
    await flushPromises()
    await openDetails(wrapper)
    expect(wrapper.text()).toContain('dnsDiagnosis.hint.missing')
    expect(wrapper.text()).not.toContain('查询源：权威 NS')
    await recordButton(wrapper, 'TXT', '_fm_verify').trigger('click')
    await flushPromises()
    const panel = wrapper.getComponent(DnsDiagnosisPanel)
    expect(panel.text()).toContain('dnsDiagnosis.hint.missing')
    expect(panel.get('details').attributes('open')).toBeUndefined()
    expect(panel.get('details').text()).toContain('查询源：权威 NS')
    await panel.get('button[aria-expanded="false"]').trigger('click')
    expect(panel.text()).toContain('dnsDiagnosis.status.queryFailed')
    expect(panel.text()).toContain('DNS 查询超时，请稍后再试')
    expect(panel.text()).not.toContain('dnsDiagnosis.hint.missing')
    wrapper.unmount()
  })

  it('labels the rules fallback honestly instead of claiming AI completed', async () => {
    mocks.diagnoseDns.mockResolvedValue({ code: 0, data: { ...diagnostic, source: 'rules' } })
    const wrapper = mountPage()
    await flushPromises()
    await openAndVerify(wrapper)
    const panel = wrapper.getComponent(DnsDiagnosisPanel)
    expect(panel.text()).toContain('dnsDiagnosis.basicGuide')
    expect(panel.text()).not.toContain('dnsDiagnosis.complete')
    wrapper.unmount()
  })

  it('verifies from the drawer and clears earlier analysis on success', async () => {
    const wrapper = mountPage()
    await flushPromises()
    await openAndVerify(wrapper)
    mocks.refreshDns.mockResolvedValue({
      code: 0,
      data: { ...detail, domain: { ...domain, status: 'verified' } }
    })
    const panel = wrapper.getComponent(DnsDiagnosisPanel)
    await panel
      .findAll('button')
      .find((button) => button.text() === 'dnsDiagnosis.verifyAgain')!
      .trigger('click')
    await flushPromises()
    expect(panel.props('open')).toBe(false)
    expect(panel.props('diagnosis')).toBe(null)
    expect(mocks.diagnoseDns).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('discards a diagnosis that returns after the domain modal closes', async () => {
    const pending = deferred()
    mocks.diagnoseDns.mockReturnValueOnce(pending.promise)
    const wrapper = mountPage()
    await flushPromises()
    await openAndVerify(wrapper)
    await wrapper.get('button[aria-label="close"]').trigger('click')
    pending.resolve({ code: 0, data: diagnostic })
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('does not attach an earlier response to a newly opened domain', async () => {
    const pending = deferred()
    mocks.diagnoseDns.mockReturnValueOnce(pending.promise)
    const wrapper = mountPage()
    await flushPromises()
    await openAndVerify(wrapper)
    await wrapper.get('button[aria-label="close"]').trigger('click')
    mocks.getDomainDetail.mockResolvedValue({
      code: 0,
      data: { ...detail, domain: { ...domain, id: 375, domain_name: 'other.example.com' } }
    })
    await openDetails(wrapper)
    pending.resolve({ code: 0, data: diagnostic })
    await flushPromises()
    const panel = wrapper.getComponent(DnsDiagnosisPanel)
    expect(panel.props('domainName')).toBe('other.example.com')
    expect(panel.props('diagnosis')).toBe(null)
    expect(panel.props('open')).toBe(false)
    wrapper.unmount()
  })
})
