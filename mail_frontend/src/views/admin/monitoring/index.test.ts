import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
import { dispatchAccountState } from '@/services/accountRealtime'
import CustomSelect from '@/components/CustomSelect/index.vue'
import DailyTrendChart from '@/components/Monitoring/DailyTrendChart.vue'
import { buildDailyTrendOption } from '@/components/Monitoring/dailyTrendOptions'

beforeEach(() => {
  vi.clearAllMocks()
  Object.values(api).forEach((fn) => fn.mockResolvedValue({ code: 0, data: {} }))
})

afterEach(() => { vi.useRealTimers(); localStorage.clear() })

describe('independent mailbox monitoring dimensions', () => {
  it('separates actual WeChat operations from mailbox ownership and other clients', async () => {
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
          share_users_today: 3,
          share_links_created_today: 5,
          share_links_opened_today: 4,
          share_visitors_today: 8,
          share_visits_today: 12,
          business_api_calls_today: 31,
          business_api_active_users_today: 2
        },
        wechat_collection_started_at_ms: Date.parse('2026-10-18T00:00:00+08:00'),
        wechat_trend: [
          {
            date: '2026-10-18',
            wechat_active_users: 5,
            wechat_receive_users: 3,
            wechat_send_users: 1,
            wechat_share_users: 2,
            wechat_share_visit_users: 4,
            wechat_receive_actions: 12,
            wechat_share_creates: 6,
            wechat_share_visits: 8,
            wechat_send_count: 2
          }
        ],
        api_breakdown_trend: [
          {
            date: '2026-10-18',
            api_scope: 'open',
            auth_mode: 'api_key',
            success_calls: 8,
            failed_calls: 2
          },
          {
            date: '2026-10-18',
            api_scope: 'open',
            auth_mode: 'bearer_token',
            success_calls: 7,
            failed_calls: 5
          },
          {
            date: '2026-10-19',
            api_scope: 'open',
            auth_mode: 'api_key',
            success_calls: 3,
            failed_calls: 1
          },
          {
            date: '2026-10-18',
            api_scope: 'business',
            auth_mode: 'miniapp',
            success_calls: 20,
            failed_calls: 4
          },
          {
            date: '2026-10-18',
            api_scope: 'business',
            auth_mode: 'public',
            success_calls: 6,
            failed_calls: 1
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
          {
            date: '2026-10-19',
            share_users: 3,
            share_first_users_in_period: 1,
            share_returning_users_in_period: 2,
            share_links_created: 5,
            share_links_opened: 4,
            share_visitors: 8,
            share_visits: 12
          },
          {
            date: '2026-10-18',
            system_created: 7,
            hosted_created: 5,
            system_created_users: 3,
            hosted_created_users: 2,
            share_users: 6,
            share_first_users_in_period: 2,
            share_returning_users_in_period: 4,
            share_links_created: 10,
            share_links_opened: 20,
            share_visitors: 12,
            share_visits: 30,
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
    expect(text).toContain('站内客户端今日请求')
    expect(text).toContain('开放平台今日请求')
    const charts = wrapper.findAllComponents(DailyTrendChart)
    const applicationChart = charts.find((chart) => chart.props('label') === '每日邮箱申请')!
    const applicationOption = buildDailyTrendOption(
      applicationChart.props('rows'),
      applicationChart.props('series')
    ) as any
    expect(applicationOption.series.map((series: any) => [series.type, series.data])).toEqual([
      ['line', [7, 0]],
      ['line', [5, 0]]
    ])
    const applicantChart = charts.find((chart) => chart.props('label') === '每日邮箱申请人数')!
    const applicantOption = buildDailyTrendOption(
      applicantChart.props('rows'),
      applicantChart.props('series')
    ) as any
    expect(applicantOption.series.map((series: any) => series.data)).toEqual([
      [3, 0],
      [2, 0]
    ])
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
    expect(text).not.toContain('小程序账号归属邮箱每日收件')
    expect(text).not.toContain('微信登录后在网页上的操作计入网页')
    expect(text).not.toContain('新口径启用时间')
    const wechatChart = charts.find((chart) => chart.props('label') === '微信端每日使用人数')!
    const wechatOption = buildDailyTrendOption(
      wechatChart.props('rows'),
      wechatChart.props('series')
    ) as any
    expect(wechatOption.series.map((series: any) => series.data)).toEqual([[5], [3], [1], [2], [4]])
    const shareCards = wrapper.find('[data-testid="share-trend"]')
    const shareCharts = shareCards.findAllComponents(DailyTrendChart)
    expect(shareCharts.slice(0, 3).map((chart) => chart.props('label'))).toEqual([
      '每日创建分享人数',
      '每日新建分享链接',
      '每日访问分享人数'
    ])
    expect(
      shareCharts.map((chart) => {
        const option = buildDailyTrendOption(chart.props('rows'), chart.props('series'), {
          showValues: true
        }) as any
        expect(option.legend.show).toBe(false)
        expect(chart.props('showValues')).toBe(true)
        return [option.yAxis.name, option.series.map((series: any) => series.data)]
      })
    ).toEqual([
      ['人', [[6, 3]]],
      ['条', [[10, 5]]],
      ['人', [[12, 8]]],
      ['次', [[30, 12]]]
    ])
    expect(shareCards.text()).not.toContain('首次分享人数')
    expect(shareCards.text()).not.toContain('再次分享人数')
    const resultChart = (label: string) => {
      const chart = wrapper
        .findAllComponents(DailyTrendChart)
        .find((chart) => chart.props('label') === label)!
      return buildDailyTrendOption(chart.props('rows'), chart.props('series')) as any
    }
    expect(resultChart('开放平台每日请求结果').series.map((series: any) => series.data)).toEqual([
      [15, 3],
      [7, 1]
    ])
    expect(resultChart('站内客户端每日请求结果').series.map((series: any) => series.data)).toEqual([
      [26, 0],
      [5, 0]
    ])
    const authSelect = wrapper
      .findAllComponents(CustomSelect)
      .find((select) => select.props('options').some((option: any) => option.value === 'api_key'))!
    authSelect.vm.$emit('update:modelValue', 'api_key')
    await flushPromises()
    expect(resultChart('开放平台每日请求结果').series.map((series: any) => series.data)).toEqual([
      [8, 3],
      [2, 1]
    ])
    expect(resultChart('站内客户端每日请求结果').series.map((series: any) => series.data)).toEqual([
      [0, 0],
      [0, 0]
    ])
    expect(api.getBusinessStats).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-testid="business-trend"] table').exists()).toBe(false)
    expect(wrapper.find('[data-testid="api-breakdown"] table').exists()).toBe(false)
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
        share_channels: [{ source_channel: 'web', created: 50, visits: 100 }],
        api_breakdown: [
          { api_scope: 'open', auth_mode: 'api_key', success_calls: 80, failed_calls: 20 }
        ]
      }
    })
    const wrapper = mount(Monitoring, {
      global: { stubs: { CustomSelect: true, DailyTrendChart: true } }
    })
    await flushPromises()
    expect(wrapper.find('[data-testid="share-channels"]').exists()).toBe(false)
    const apiChart = wrapper
      .findAllComponents(DailyTrendChart)
      .find((chart) => chart.props('label') === '开放平台每日请求结果')!
    expect(apiChart.props('rows')).toEqual([])
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
  it('refreshes online counts on presence changes instead of every fifteen seconds', async () => {
    vi.useFakeTimers()
    localStorage.setItem('token', 'test-session')
    route.meta.monitoringSection = 'business'
    const wrapper = mount(Monitoring, { global: { stubs: { CustomSelect: true, DailyTrendChart: true } } })
    try {
      await flushPromises()
      const count = api.getOnlineCount.mock.calls.length
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
      expect(api.getOnlineCount).toHaveBeenCalledTimes(count)
      dispatchAccountState('presence')
      await flushPromises()
      expect(api.getOnlineCount).toHaveBeenCalledTimes(count + 1)
    } finally { wrapper.unmount() }
  })

})
