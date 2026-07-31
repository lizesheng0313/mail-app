import { describe, expect, it } from 'vitest'
import {
  formatShareDate,
  isShareTerminalState,
  resolveShareValidity
} from '../src/views/portal/share/shareDisplay'
import zhCN from '../src/i18n/messages/zh-CN'

describe('share display metadata', () => {
  it('formats share expiry without time details', () => {
    expect(formatShareDate('2026-12-30T23:59:59', 'zh-CN')).toBe('2026/12/30')
  })

  it('shows the selected validity value consistently', () => {
    expect(zhCN.sharePage.validitySummary).toBe('有效期：{value}')
    expect(
      resolveShareValidity({
        expireAt: null,
        expireMode: 'minutes',
        expireMinutes: 10,
        locale: 'zh-CN',
        minuteUnit: '分钟',
        dayUnit: '天',
        permanentValue: '永久',
        validityText: (value) => zhCN.sharePage.validitySummary.replace('{value}', value)
      })
    ).toBe('有效期：10分钟')

    expect(
      resolveShareValidity({
        expireAt: null,
        expireMode: 'days',
        expireDays: 30,
        minuteUnit: '分钟',
        dayUnit: '天',
        permanentValue: '永久',
        validityText: (value) => `有效期：${value}`
      })
    ).toBe('有效期：30天')

    expect(
      resolveShareValidity({
        expireAt: null,
        expireMode: 'permanent',
        permanentValue: '永久',
        validityText: (value) => `有效期：${value}`
      })
    ).toBe('有效期：永久')
  })

  it('counts down minute-based validity as mm:ss', () => {
    const formatValidity = (value) => `有效期：${value}`

    expect(
      resolveShareValidity({
        expireAt: 1_800_000,
        expireMode: 'minutes',
        expireMinutes: 30,
        now: 0,
        minuteShortUnit: '分',
        secondUnit: '秒',
        validityText: formatValidity
      })
    ).toBe('有效期：30:00')

    expect(
      resolveShareValidity({
        expireAt: 1_800_000,
        expireMode: 'minutes',
        expireMinutes: 30,
        now: 1_000,
        minuteShortUnit: '分',
        secondUnit: '秒',
        validityText: formatValidity
      })
    ).toBe('有效期：29:59')

    expect(
      resolveShareValidity({
        expireAt: 1_800_000,
        expireMode: 'minutes',
        expireMinutes: 30,
        now: 1_752_000,
        minuteShortUnit: '分',
        secondUnit: '秒',
        validityText: formatValidity
      })
    ).toBe('有效期：00:48')
  })

  it('treats consumed and completed share states as terminal', () => {
    expect(isShareTerminalState('consumed')).toBe(true)
    expect(isShareTerminalState('completed')).toBe(true)
    expect(isShareTerminalState('waiting')).toBe(false)
  })
})
