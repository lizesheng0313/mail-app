import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { describe, expect, it } from 'vitest'
import zhCN from '@/i18n/messages/zh-CN'
import DnsRecordAdvice from './DnsRecordAdvice.vue'

const txt = {
  record_type: 'TXT',
  record_host: '_fm_verify',
  record_name: '_fm_verify.example.test',
  record_value: 'fmv-BN3AJkmV-LMXjMxlKBBxD0r0',
  status: 'missing'
}
const setup = (
  record: typeof txt & {
    priority?: number
    misplaced_records?: { record_host: string; record_name: string }[]
  } = txt,
  zoneConfirmed = true
) =>
  mount(DnsRecordAdvice, {
    props: { record, zoneConfirmed },
    global: {
      plugins: [createI18n({ legacy: false, locale: 'zh-CN', messages: { 'zh-CN': zhCN } })]
    }
  })

describe('concise DNS record actions', () => {
  it('offers separate exact copy values when adding a missing TXT record', async () => {
    const wrapper = setup()
    expect(wrapper.text()).toContain('添加 TXT 记录')
    expect(wrapper.get('button[aria-label="复制记录值"]').attributes('title')).toBe(
      txt.record_value
    )
    await wrapper.get('button[aria-label="复制主机记录"]').trigger('click')
    await wrapper.get('button[aria-label="复制记录值"]').trigger('click')
    expect(wrapper.emitted('copy')).toEqual([['_fm_verify'], [txt.record_value]])
    wrapper.unmount()
  })

  it('shows exactly which host to change and copies only its replacement', async () => {
    const wrapper = setup({
      ...txt,
      status: 'wrong_host',
      misplaced_records: [
        { record_host: '_fm_verify.extra', record_name: '_fm_verify.extra.example.test' }
      ]
    })
    expect(wrapper.text()).toContain('主机记录改为')
    expect(wrapper.text()).toContain('_fm_verify.extra')
    expect(wrapper.text()).toContain('→')
    expect(wrapper.findAll('button')).toHaveLength(1)
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('copy')).toEqual([['_fm_verify']])
    wrapper.unmount()
  })

  it('copies the required MX value and preserves priority zero', async () => {
    const wrapper = setup({
      ...txt,
      record_type: 'MX',
      record_host: '@',
      record_name: 'example.test',
      record_value: 'mx.example.test',
      priority: 0,
      status: 'mismatch'
    })
    expect(wrapper.text()).toContain('记录值改为')
    await wrapper.get('button[aria-label="复制记录值"]').trigger('click')
    await wrapper.get('button[aria-label="复制优先级"]').trigger('click')
    expect(wrapper.emitted('copy')).toEqual([['mx.example.test'], ['0']])
    expect(wrapper.find('button[aria-label="复制主机记录"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('uses the full record name when the DNS management zone is unconfirmed', async () => {
    const wrapper = setup(
      {
        ...txt,
        status: 'wrong_host',
        misplaced_records: [
          { record_host: '_fm_verify.extra', record_name: '_fm_verify.extra.example.test' }
        ]
      },
      false
    )
    expect(wrapper.text()).toContain('完整记录名应为')
    await wrapper.get('button[aria-label="复制完整记录名"]').trigger('click')
    expect(wrapper.emitted('copy')).toEqual([['_fm_verify.example.test']])
    wrapper.unmount()
  })

  it('does not suggest configuration changes when the lookup itself failed', () => {
    const wrapper = setup({ ...txt, status: 'query_failed' })
    expect(wrapper.text()).toBe('查询失败，请重试')
    expect(wrapper.findAll('button')).toHaveLength(0)
    wrapper.unmount()
  })
})
