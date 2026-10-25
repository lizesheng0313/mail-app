import { describe, expect, it } from 'vitest'
import { preferredRechargeMethod } from './rechargePaymentPreference'

describe('recharge payment preference', () => {
  it.each([
    ['Asia/Shanghai', ['en-US'], 'alipay'],
    ['Asia/Urumqi', ['zh-CN'], 'alipay'],
    ['America/Los_Angeles', ['zh-CN'], 'paypal'],
    ['Asia/Singapore', ['zh-CN'], 'paypal'],
    ['Asia/Hong_Kong', ['zh-HK'], 'paypal'],
    ['Asia/Taipei', ['zh-TW'], 'paypal'],
    ['UTC', ['en-US'], 'paypal'],
    ['UTC', ['zh-CN'], 'alipay'],
    ['', ['zh-Hans-CN'], 'alipay'],
    ['', ['zh-Hans-SG'], 'paypal'],
    ['', [], 'alipay']
  ])('uses %s and %j as a display hint for %s', (timeZone, languages, expected) => {
    expect(preferredRechargeMethod(timeZone as string, languages as string[])).toBe(expected)
  })
})
