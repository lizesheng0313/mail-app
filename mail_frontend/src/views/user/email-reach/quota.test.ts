import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { api, chartOptions } = vi.hoisted(() => ({ api: {
  getAccessSummary: vi.fn(), getQuotaSummary: vi.fn(), getSendTrend: vi.fn(),
  getSendRecords: vi.fn(), getUnsubscribes: vi.fn()
}, chartOptions: [] as any[] }))
vi.mock('@/api/emailReach', () => ({ default: api }))
vi.mock('@/stores/auth', () => ({ useMailboxStore: () => ({ upsertMailboxes: vi.fn() }) }))
vi.mock('echarts', () => ({
  init: () => ({ setOption: (options: any) => chartOptions.push(options), resize: vi.fn(), dispose: vi.fn() }),
  graphic: { LinearGradient: class {} }
}))
import QuotaPage from './quota.vue'
afterEach(() => { vi.useRealTimers(); chartOptions.length = 0; vi.clearAllMocks() })

describe('quota charts with paginated send records', () => {
  it('loads seven-day totals independently and keeps all counts beyond the first 50 rows', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 23, 12))
    api.getAccessSummary.mockResolvedValue({ code: 0, data: { status: 'trial' } })
    api.getQuotaSummary.mockResolvedValue({ code: 0, data: { used_total: 9999, used_today: 123, total_quota: 0 } })
    api.getUnsubscribes.mockResolvedValue({ code: 0, data: { items: [{ created_at: Date.now() }] } })
    api.getSendTrend.mockImplementation(async ({ day_boundaries }) => ({ code: 0, data: {
      items: day_boundaries.slice(0, 7).map((start_at_ms, index) => ({
        start_at_ms, sent_count: index === 0 ? 601 : 0, failed_count: index === 6 ? 99 : 0,
        blocked_count: index === 6 ? 77 : 0
      }))
    } }))
    const wrapper = shallowMount(QuotaPage)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(100)
    expect(api.getSendRecords).not.toHaveBeenCalled()
    const boundaries = api.getSendTrend.mock.calls[0][0].day_boundaries
    expect(boundaries).toHaveLength(8)
    expect(new Date(boundaries[0]).getDate()).toBe(17)
    expect(new Date(boundaries[7]).getDate()).toBe(24)
    expect(chartOptions).toHaveLength(4)
    expect(chartOptions[0].series[0].data).toEqual([601, 0, 0, 0, 0, 0, 0])
    expect(chartOptions[1].series[0].data).toEqual([0, 0, 0, 0, 0, 0, 1])
    expect(chartOptions[2].series[0].data).toEqual([0, 0, 0, 0, 0, 0, 99])
    expect(chartOptions[3].series[0].data).toEqual([0, 0, 0, 0, 0, 0, 77])
    expect(wrapper.text()).toContain('9,999')
    expect(wrapper.text()).toContain('123')
    wrapper.unmount()
  })
})
