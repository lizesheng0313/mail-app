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
        trend: [
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
    const wrapper = mount(Monitoring, { global: { stubs: { CustomSelect: true } } })
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
    expect(text).toContain('小程序账号归属邮箱今日收件')
    expect(text).toContain('小程序第三方收件')
    expect(text).toContain('开放平台 API 今日使用人数')
    expect(text).toContain('普通业务 API 今日调用量')
    const cells = wrapper
      .find('[data-testid="business-trend"] tbody tr')
      .findAll('td')
      .map((cell) => cell.text())
    expect(cells.slice(2, 10)).toEqual(['7', '5', '8', '12', '10', '3', '2', '4'])
    expect(cells.slice(10)).toEqual(['4', '1', '31', '2'])
    const authRows = wrapper
      .findAll('[data-testid="api-breakdown"] tbody tr')
      .map((row) => row.findAll('td').map((cell) => cell.text()))
    expect(authRows).toEqual([
      ['开放平台', 'API Key', '3', '1', '8', '2'],
      ['开放平台', 'Bearer', '2', '4', '7', '5']
    ])
    const sourceRows = wrapper
      .findAll('[data-testid="share-channels"] tbody tr')
      .map((row) => row.findAll('td').map((cell) => cell.text()))
    expect(sourceRows.map((row) => row[0])).toEqual(['API', '网页', '小程序'])
    expect(wrapper.text()).toContain('撤销分享后历史计数保留')
    wrapper.unmount()
  })

  it('shows all three receipt types separately on the overview', async () => {
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
    const wrapper = mount(Monitoring, { global: { stubs: { CustomSelect: true } } })
    await flushPromises()
    expect(wrapper.text()).toContain('系统邮箱今日收件')
    expect(wrapper.text()).toContain('域名邮箱今日收件')
    expect(wrapper.text()).toContain('第三方邮箱今日收件')
    expect(wrapper.text()).toContain('系统邮箱申请趋势')
    wrapper.unmount()
  })
})
