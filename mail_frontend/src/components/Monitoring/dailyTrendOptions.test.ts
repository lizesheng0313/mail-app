import { describe, expect, it } from 'vitest'
import { buildDailyTrendOption } from './dailyTrendOptions'

describe('daily monitoring chart data', () => {
  it('sorts dates without changing the source and keeps empty days on the timeline', () => {
    const rows = [
      { date: '2026-10-20', oauth: '3', password: 2 },
      { date: '2026-10-18', oauth: 4, password: 1 },
      { date: '2026-10-19', oauth: 0 }
    ]
    const option = buildDailyTrendOption(rows, [
      { key: 'oauth', label: 'OAuth', type: 'bar', stack: 'mailboxes' },
      { key: 'password', label: '密码', type: 'bar', stack: 'mailboxes' }
    ]) as any
    expect(option.xAxis.data).toEqual(['2026-10-18', '2026-10-19', '2026-10-20'])
    expect(option.series.map((series: any) => series.data)).toEqual([
      [4, 0, 3],
      [1, 0, 2]
    ])
    expect(rows[0].date).toBe('2026-10-20')
  })
})
