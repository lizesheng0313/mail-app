import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const route = vi.hoisted(() => ({ meta: { monitoringSection: 'business' } }))
const api = vi.hoisted(() =>
  Object.fromEntries(
    [
      'getOverview',
      'getUserStats',
      'getPageAnalytics',
      'getGeoDistribution',
      'getBusinessStats',
      'getGuestConversionFunnel',
      'getOnlineCount'
    ].map((name) => [name, vi.fn()])
  )
)
vi.mock('vue-router', () => ({ useRoute: () => route }))
vi.mock('@/api/monitoring', () => ({ monitoringAPI: api }))
vi.mock('@/utils/message', () => ({ showMessage: vi.fn() }))
vi.mock('./utils/userTrendChart', () => ({ updateUserChart: vi.fn() }))
vi.mock('./utils/mailboxTrendChart', () => ({ updateMailboxChart: vi.fn() }))
vi.mock('./utils/pvUvTrendChart', () => ({ updatePvUvChart: vi.fn() }))
vi.mock('./utils/worldMapChart', () => ({ updateWorldMap: vi.fn(), preloadWorldMap: vi.fn() }))
vi.mock('@/components/Monitoring/CrawlerMonitor.vue', () => ({ default: { template: '<div />' } }))

import Monitoring from './index.vue'
import DailyTrendChart from '@/components/Monitoring/DailyTrendChart.vue'
import { buildDailyTrendOption } from '@/components/Monitoring/dailyTrendOptions'

beforeEach(() => {
  vi.clearAllMocks()
  Object.values(api).forEach((fn) => fn.mockResolvedValue({ code: 0, data: {} }))
})

describe('independent mailbox monitoring dimensions', () => {
  it('shows separate application counts and miniapp receipt subsets in business monitoring', async () => {
    route.meta.monitoringSection = 'business'
    api.getBusinessStats.mockResolvedValue({
      code: 0,
      data: {
        summary: {
          system_created_today: 7,
          hosted_created_today: 5,
          miniapp_system_received_today: 3,
          miniapp_hosted_received_today: 2,
          miniapp_external_received_today: 4,
          business_api_calls_today: 31,
          business_api_active_users_today: 2
        },
        api_breakdown: [
          {
            api_scope: 'open',
            auth_mode: 'api_key',
            success_calls_today: 3,
            failed_calls_today: 1,
            success_calls: 8,
            failed_calls: 2
          },
          {
            api_scope: 'open',
            auth_mode: 'bearer_token',
            success_calls_today: 2,
            failed_calls_today: 4,
            success_calls: 7,
            failed_calls: 5
          }
        ],
        share_channels: [
          { source_channel: 'api', created_today: 2, visits_today: 3, created: 5, visits: 6 },
          { source_channel: 'web', created_today: 4, visits_today: 7, created: 8, visits: 9 },
          { source_channel: 'miniapp', created_today: 1, visits_today: 2, created: 3, visits: 4 }
        ],
        share_channel_trend: [
          { date: '2026-10-18', source_channel: 'web', created: 4, visits: 7 },
          { date: '2026-10-20', source_channel: 'desktop', created: 2, visits: 5 },
          { date: '2026-10-18', source_channel: 'unknown', created: 0, visits: 8 }
        ],
        trend: [
          { date: '2026-10-19' },
          {
            date: '2026-10-18',
            system_created: 7,
            hosted_created: 5,
            system_received: 10,
            hosted_received: 8,
            external_received: 12,
            miniapp_system_received: 3,
            miniapp_hosted_received: 2,
            miniapp_external_received: 4,
            api_calls: 4,
            api_active_users: 1,
            business_api_calls: 31,
            business_api_active_users: 2
          }
        ]
      }
    })
    const wrapper = mount(Monitoring, {
      global: { stubs: { CustomSelect: true, DailyTrendChart: true } }
    })
    await flushPromises()
    const text = wrapper.text()
    const mailboxRows = wrapper
      .find('[data-testid="mailbox-summary"] tbody')
      .findAll('tr')
      .map((row) => row.findAll('td').map((cell) => cell.text()))
    expect(mailboxRows).toEqual([
      ['系统邮箱', '7', '0', '0', '0', '3'],
      ['域名邮箱', '5', '0', '0', '0', '2'],
      ['第三方邮箱', '—', '—', '0', '0', '4']
    ])
    expect(text).not.toContain('第三方邮箱今日申请')
    expect(text).toContain('站内客户端今日请求')
    expect(text).toContain('开放平台今日请求')
    const charts = wrapper.findAllComponents(DailyTrendChart)
    const receiptChart = charts.find((chart) => chart.props('label') === '每日邮箱收件')!
    const receiptOption = buildDailyTrendOption(
      receiptChart.props('rows'),
      receiptChart.props('series')
    ) as any
    expect(receiptOption.series.map((series: any) => series.data)).toEqual([
      [10, 0],
      [8, 0],
      [12, 0]
    ])
    const miniappChart = charts.find(
      (chart) => chart.props('label') === '小程序账号归属邮箱每日收件'
    )!
    const miniappOption = buildDailyTrendOption(
      miniappChart.props('rows'),
      miniappChart.props('series')
    ) as any
    expect(miniappOption.series.map((series: any) => series.data)).toEqual([
      [3, 0],
      [2, 0],
      [4, 0]
    ])
    const apiChart = charts.find((chart) => chart.props('label') === '每日 API 请求次数')!
    const apiOption = buildDailyTrendOption(apiChart.props('rows'), apiChart.props('series')) as any
    expect(apiOption.series.map((series: any) => series.data)).toEqual([
      [31, 0],
      [4, 0]
    ])
    expect(wrapper.find('[data-testid="business-trend"] table').exists()).toBe(false)
    expect(wrapper.find('[data-testid="share-trend"] table').exists()).toBe(false)
    const authRows = wrapper
      .findAll('[data-testid="api-breakdown"] tbody tr')
      .map((row) => row.findAll('td').map((cell) => cell.text()))
    expect(authRows).toEqual([
      ['开放平台接口', 'API Key', '8', '2'],
      ['开放平台接口', '用户登录凭证', '7', '5']
    ])
    expect(wrapper.find('[data-testid="share-channels"] table').exists()).toBe(false)
    const sourceCharts = wrapper
      .find('[data-testid="share-channels"]')
      .findAllComponents(DailyTrendChart)
    const sourceOptions = sourceCharts.map(
      (chart) => buildDailyTrendOption(chart.props('rows'), chart.props('series')) as any
    )
    expect(sourceOptions[0].xAxis.data).toEqual(['2026-10-18', '2026-10-19', '2026-10-20'])
    expect(
      sourceOptions[0].series.map((series: any) => [series.name, series.type, series.data])
    ).toEqual([
      ['网页', 'line', [4, 0, 0]],
      ['桌面端', 'line', [0, 0, 2]]
    ])
    expect(sourceOptions[1].series.map((series: any) => [series.name, series.data])).toEqual([
      ['网页', [7, 0, 0]],
      ['桌面端', [0, 0, 5]],
      ['未标记来源', [8, 0, 0]]
    ])
    expect(sourceOptions[0].series[1].itemStyle.color).toBe(
      sourceOptions[1].series[1].itemStyle.color
    )
    wrapper.unmount()
  })

  it('does not invent daily source values when the backend only returns interval totals', async () => {
    route.meta.monitoringSection = 'business'
    api.getBusinessStats.mockResolvedValue({
      code: 0,
      data: {
        trend: [{ date: '2026-10-18' }],
        share_channels: [{ source_channel: 'web', created: 50, visits: 100 }]
      }
    })
    const wrapper = mount(Monitoring, {
      global: { stubs: { CustomSelect: true, DailyTrendChart: true } }
    })
    await flushPromises()
    expect(wrapper.find('[data-testid="share-channels"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('keeps mailbox metrics in business monitoring instead of repeating them on the overview', async () => {
    route.meta.monitoringSection = 'overview'
    api.getOverview.mockResolvedValue({
      code: 0,
      data: {
        today_stats: {
          system_received_today: 10,
          hosted_received_today: 8,
          external_received_today: 12
        }
      }
    })
    const wrapper = mount(Monitoring, {
      global: { stubs: { CustomSelect: true, DailyTrendChart: true } }
    })
    await flushPromises()
    expect(wrapper.text()).not.toContain('系统邮箱今日收件')
    expect(wrapper.text()).not.toContain('域名邮箱今日收件')
    expect(wrapper.text()).not.toContain('第三方邮箱今日收件')
    expect(wrapper.text()).not.toContain('系统邮箱申请趋势')
    expect(wrapper.text()).toContain('用户注册趋势')
    expect(wrapper.text()).toContain('访问量趋势')
    wrapper.unmount()
  })
})
