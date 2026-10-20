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

it('switches the daily mailbox breakdown without hiding zero days or treating users as mailboxes', async () => {
  const wrapper = mount(ExternalMonitoring, {
    global: {
      stubs: { CustomSelect: true, DailyTrendChart: true }
    }
  })
  await flushPromises()
  const chart = wrapper.findAllComponents(DailyTrendChart)[0]
  let option = buildDailyTrendOption(chart.props('rows'), chart.props('series')) as any
  expect(option.xAxis.data).toEqual(['2026-10-18', '2026-10-19'])
  expect(option.series.map((series: any) => [series.name, series.type, series.data])).toEqual([
    ['Google', 'line', [3, 0]]
  ])
  await wrapper
    .findAll('button')
    .find((button) => button.text() === '按接入方式')!
    .trigger('click')
  option = buildDailyTrendOption(chart.props('rows'), chart.props('series')) as any
  expect(option.series.map((series: any) => [series.type, series.data])).toEqual([
    ['line', [2, 0]],
    ['line', [1, 0]]
  ])
  expect(wrapper.findAllComponents(DailyTrendChart)).toHaveLength(2)
  expect(wrapper.findAllComponents(DailyTrendChart)[1].props('series')[0].key).toBe('unique_owners')
  wrapper.unmount()
})
