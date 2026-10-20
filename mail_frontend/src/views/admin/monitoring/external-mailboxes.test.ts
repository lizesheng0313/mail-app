import { flushPromises, mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import DailyTrendChart from '@/components/Monitoring/DailyTrendChart.vue'
import { buildDailyTrendOption } from '@/components/Monitoring/dailyTrendOptions'

vi.mock('@/utils/message', () => ({ showMessage: vi.fn() }))
vi.mock('@/api/monitoring', () => ({
  monitoringAPI: {
    getExternalMailboxLogins: vi.fn().mockResolvedValue({
      code: 0,
      data: {
        summary: {},
        providers: [{ key: 'google', name: 'Google', connected_mailboxes: 3 }],
        daily: [
          {
            date: '2026-10-18',
            connected_mailboxes: 3,
            oauth_mailboxes: 2,
            password_mailboxes: 1,
            unique_owners: 2,
            provider_breakdown: [{ key: 'google', count: 3 }]
          },
          {
            date: '2026-10-19',
            connected_mailboxes: 0,
            oauth_mailboxes: 0,
            password_mailboxes: 0,
            unique_owners: 0,
            provider_breakdown: []
          }
        ]
      }
    })
  }
}))

import ExternalMonitoring from './external-mailboxes.vue'

it('shows company and connection method trends independently while preserving zero days and user counts', async () => {
  const wrapper = mount(ExternalMonitoring, {
    global: {
      stubs: { CustomSelect: true, DailyTrendChart: true }
    }
  })
  await flushPromises()
  const charts = wrapper.findAllComponents(DailyTrendChart)
  const providerChart = charts.find(
    (chart) => chart.props('label') === '每日接入邮箱 · 按邮箱公司'
  )!
  let option = buildDailyTrendOption(
    providerChart.props('rows'),
    providerChart.props('series')
  ) as any
  expect(option.xAxis.data).toEqual(['2026-10-18', '2026-10-19'])
  expect(option.series.map((series: any) => [series.name, series.type, series.data])).toEqual([
    ['Google', 'line', [3, 0]]
  ])
  const authChart = charts.find((chart) => chart.props('label') === '每日接入邮箱 · 按接入方式')!
  option = buildDailyTrendOption(authChart.props('rows'), authChart.props('series')) as any
  expect(option.xAxis.data).toEqual(['2026-10-18', '2026-10-19'])
  expect(option.series.map((series: any) => [series.type, series.data])).toEqual([
    ['line', [2, 0]],
    ['line', [1, 0]]
  ])
  const ownerChart = charts.find((chart) => chart.props('label') === '每日成功接入用户')!
  option = buildDailyTrendOption(ownerChart.props('rows'), ownerChart.props('series')) as any
  expect(option.series[0].data).toEqual([2, 0])
  expect(charts).toHaveLength(3)
  wrapper.unmount()
})
