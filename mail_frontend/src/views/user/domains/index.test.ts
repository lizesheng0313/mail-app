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

const dnsRows = (wrapper: ReturnType<typeof mountPage>) =>
  wrapper.get('[role="dialog"] table').findAll('tbody tr')
const statusText = (wrapper: ReturnType<typeof mountPage>, index: number) =>
  dnsRows(wrapper)[index].findAll('td')[4].text()
const adviceText = (wrapper: ReturnType<typeof mountPage>, index: number) =>
  dnsRows(wrapper)[index].findAll('td')[5].text()
const verifiedDetail = {
  ...detail,
  domain: { ...domain, status: 'verified' },
  dns_instructions: detail.dns_instructions.map((record) => ({ ...record, status: 'valid' }))
}

describe('DNS verification advice', () => {
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

  it('shows statuses and an empty AI column without starting analysis when details open', async () => {
    const wrapper = mountPage()
    await flushPromises()
    await openDetails(wrapper)
    expect(mocks.refreshDns).not.toHaveBeenCalled()
    expect(mocks.diagnoseDns).not.toHaveBeenCalled()
    expect(wrapper.get('[role="dialog"] table').findAll('th').map((cell) => cell.text()))
      .toEqual(['主机记录', '记录类型', '值', '优先级', '状态', 'dnsDiagnosis.aiAdvice'])
    expect(statusText(wrapper, 0)).toBe('dnsDiagnosis.status.missing')
    expect(adviceText(wrapper, 0)).toBe('—')
    expect(wrapper.text()).not.toContain('dnsDiagnosis.viewAdvice')
    expect(wrapper.text()).not.toContain('dnsDiagnosis.noticeHint')
    expect(wrapper.text()).not.toContain('dnsDiagnosis.hint.missing')
    expect(wrapper.findAll('[role="dialog"]')).toHaveLength(1)
    wrapper.unmount()
  })

  it('waits for failed verification before requesting per-record AI suggestions', async () => {
    const verification = deferred()
    mocks.refreshDns.mockReturnValueOnce(verification.promise)
    const wrapper = mountPage()
    await flushPromises()
    await openAndVerify(wrapper)
    expect(mocks.refreshDns).toHaveBeenCalledWith(374)
    expect(mocks.diagnoseDns).not.toHaveBeenCalled()
    verification.resolve({ code: 0, data: detail })
    await flushPromises()
    expect(mocks.diagnoseDns).toHaveBeenCalledExactlyOnceWith(374)
    expect(mocks.refreshDns.mock.invocationCallOrder[0]).toBeLessThan(mocks.diagnoseDns.mock.invocationCallOrder[0])
    expect(statusText(wrapper, 0)).toBe('dnsDiagnosis.status.wrongHost')
    expect(adviceText(wrapper, 0)).toBe('把主机记录改成 _fm_verify')
    expect(adviceText(wrapper, 1)).toBe('把主机记录改成 @')
    expect(wrapper.findAll('[role="dialog"]')).toHaveLength(1)
    expect(wrapper.text()).not.toContain('dnsDiagnosis.viewProgress')
    wrapper.unmount()
  })

  it('does not request AI suggestions when verification succeeds', async () => {
    mocks.refreshDns.mockResolvedValue({ code: 0, data: verifiedDetail })
    const wrapper = mountPage()
    await flushPromises()
    await openAndVerify(wrapper)
    expect(mocks.diagnoseDns).not.toHaveBeenCalled()
    expect(statusText(wrapper, 0)).toBe('dnsDiagnosis.status.valid')
    expect(adviceText(wrapper, 0)).toBe('—')
    expect(adviceText(wrapper, 1)).toBe('—')
    wrapper.unmount()
  })

  it('does not request AI suggestions after a failed verification request', async () => {
    mocks.refreshDns.mockResolvedValue({ code: 1, message: 'unavailable' })
    const wrapper = mountPage()
    await flushPromises()
    await openAndVerify(wrapper)
    expect(mocks.diagnoseDns).not.toHaveBeenCalled()
    expect(adviceText(wrapper, 0)).toBe('—')
    wrapper.unmount()
  })

  it('keeps loading feedback inside the suggestion cells while retaining copyable DNS values', async () => {
    const pending = deferred()
    mocks.diagnoseDns.mockReturnValueOnce(pending.promise)
    const wrapper = mountPage()
    await flushPromises()
    await openAndVerify(wrapper)
    expect(adviceText(wrapper, 0)).toBe('dnsDiagnosis.adviceLoading')
    expect(adviceText(wrapper, 1)).toBe('dnsDiagnosis.adviceLoading')
    expect(wrapper.text()).not.toContain('dnsDiagnosis.backgroundHint')
    const cells = dnsRows(wrapper)[0].findAll('td')
    await cells[0].get('button').trigger('click')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('_fm_verify')
    await cells[2].get('button').trigger('click')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('fmv-test')
    pending.resolve({ code: 0, data: diagnostic })
    await flushPromises()
    expect(adviceText(wrapper, 0)).toBe('把主机记录改成 _fm_verify')
    wrapper.unmount()
  })

  it('matches suggestions by record identity and distinguishes missing records from query errors', async () => {
    mocks.diagnoseDns.mockResolvedValue({
      code: 0,
      data: {
        ...diagnostic,
        records: [
          { ...diagnostic.records[1], status: 'query_failed', explanation: 'DNS 查询超时，请稍后再试' },
          { ...diagnostic.records[0], status: 'missing', explanation: '请在 _fm_verify 添加要求的 TXT 值' }
        ]
      }
    })
    const wrapper = mountPage()
    await flushPromises()
    await openAndVerify(wrapper)
    expect(statusText(wrapper, 0)).toBe('dnsDiagnosis.status.missing')
    expect(statusText(wrapper, 1)).toBe('dnsDiagnosis.status.queryFailed')
    expect(adviceText(wrapper, 0)).toBe('请在 _fm_verify 添加要求的 TXT 值')
    expect(adviceText(wrapper, 1)).toBe('DNS 查询超时，请稍后再试')
    expect(wrapper.text()).not.toContain('查询源：权威 NS')
    expect(wrapper.text()).not.toContain('dnsDiagnosis.hint.missing')
    wrapper.unmount()
  })

  it('does not show advice for records that are already valid', async () => {
    mocks.diagnoseDns.mockResolvedValue({
      code: 0,
      data: { ...diagnostic, records: [{ ...diagnostic.records[0], status: 'valid' }, diagnostic.records[1]] }
    })
    const wrapper = mountPage()
    await flushPromises()
    await openAndVerify(wrapper)
    expect(statusText(wrapper, 0)).toBe('dnsDiagnosis.status.valid')
    expect(adviceText(wrapper, 0)).toBe('—')
    expect(adviceText(wrapper, 1)).toBe('把主机记录改成 @')
    wrapper.unmount()
  })

  it('shows an inline failure and retries only after another failed DNS verification', async () => {
    mocks.diagnoseDns.mockRejectedValueOnce(new Error('offline'))
    const wrapper = mountPage()
    await flushPromises()
    await openAndVerify(wrapper)
    expect(adviceText(wrapper, 0)).toBe('dnsDiagnosis.adviceUnavailable')
    expect(wrapper.text()).toContain('mx.zjkdongao.cn')
    await wrapper.findAll('button').find((button) => button.text() === '立即验证DNS')!.trigger('click')
    await flushPromises()
    expect(mocks.refreshDns).toHaveBeenCalledTimes(2)
    expect(mocks.diagnoseDns).toHaveBeenCalledTimes(2)
    expect(adviceText(wrapper, 0)).toBe('把主机记录改成 _fm_verify')
    wrapper.unmount()
  })

  it('does not present rule-based fallback messages as AI suggestions', async () => {
    mocks.diagnoseDns.mockResolvedValue({ code: 0, data: { ...diagnostic, source: 'rules' } })
    const wrapper = mountPage()
    await flushPromises()
    await openAndVerify(wrapper)
    expect(adviceText(wrapper, 0)).toBe('dnsDiagnosis.adviceUnavailable')
    expect(wrapper.text()).not.toContain('把主机记录改成 _fm_verify')
    wrapper.unmount()
  })

  it('clears previous suggestions as soon as verification starts again', async () => {
    const wrapper = mountPage()
    await flushPromises()
    await openAndVerify(wrapper)
    expect(adviceText(wrapper, 0)).toBe('把主机记录改成 _fm_verify')
    const pending = deferred()
    mocks.refreshDns.mockReturnValueOnce(pending.promise)
    await wrapper.findAll('button').find((button) => button.text() === '立即验证DNS')!.trigger('click')
    await flushPromises()
    expect(adviceText(wrapper, 0)).toBe('—')
    pending.resolve({ code: 0, data: verifiedDetail })
    await flushPromises()
    expect(mocks.diagnoseDns).toHaveBeenCalledTimes(1)
    expect(statusText(wrapper, 0)).toBe('dnsDiagnosis.status.valid')
    expect(adviceText(wrapper, 0)).toBe('—')
    wrapper.unmount()
  })

  it('does not restore an old AI response after a new verification succeeds', async () => {
    const oldAdvice = deferred()
    mocks.diagnoseDns.mockReturnValueOnce(oldAdvice.promise)
    const wrapper = mountPage()
    await flushPromises()
    await openAndVerify(wrapper)
    mocks.refreshDns.mockResolvedValue({ code: 0, data: verifiedDetail })
    await wrapper.findAll('button').find((button) => button.text() === '立即验证DNS')!.trigger('click')
    await flushPromises()
    oldAdvice.resolve({ code: 0, data: diagnostic })
    await flushPromises()
    expect(statusText(wrapper, 0)).toBe('dnsDiagnosis.status.valid')
    expect(adviceText(wrapper, 0)).toBe('—')
    expect(wrapper.text()).not.toContain('把主机记录改成 _fm_verify')
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
    expect(adviceText(wrapper, 0)).toBe('—')
    expect(mocks.diagnoseDns).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).not.toContain('把主机记录改成 _fm_verify')
    wrapper.unmount()
  })
})
