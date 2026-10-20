import { expect, it } from 'vitest'
import { buildProviderBarOption } from './providerBarOptions'

it('ranks mailbox providers by count and preserves connection details in the chart tooltip', () => {
  const providers = [
    { key: 'microsoft', name: '微软邮箱', connected_mailboxes: 93 },
    {
      key: 'netease',
      name: '网易邮箱',
      connected_mailboxes: 736,
      unique_owners: 18,
      oauth_mailboxes: 0,
      password_mailboxes: 736,
      share_percent: 49.7,
      domains: ['163.com']
    }
  ]
  const option = buildProviderBarOption(providers) as any
  expect(option.yAxis.data).toEqual(['网易邮箱', '微软邮箱'])
  expect(option.yAxis.inverse).toBe(true)
  expect(option.series[0].type).toBe('bar')
  expect(option.series[0].data).toEqual([736, 93])
  expect(option.tooltip.formatter({ dataIndex: 0 })).toBe(
    '网易邮箱\n接入邮箱  736（49.7%）\n用户  18\nOAuth  0\n密码 / 授权码  736\n163.com'
  )
  expect(providers[0].key).toBe('microsoft')
})
