import type { EChartsOption } from 'echarts'

export interface TrendSeries {
  key: string
  label: string
  type?: 'line' | 'bar'
  stack?: string
  unit?: string
  color?: string
}

export type TrendRow = { date: string; [key: string]: unknown }

export function buildDailyTrendOption(
  rows: TrendRow[],
  definitions: TrendSeries[],
  options: { showValues?: boolean } = {}
): EChartsOption {
  const data = [...rows].sort((a, b) => a.date.localeCompare(b.date))
  const zoom = data.length > 14
  const hideLegend = options.showValues && definitions.length === 1
  const units = [...new Set(definitions.map((series) => series.unit).filter(Boolean))]
  return {
    animation: false,
    color: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444'],
    aria: {
      enabled: true,
      label: {
        description: `${data[0]?.date || ''} 至 ${data[data.length - 1]?.date || ''}，共 ${data.length} 天。展示${definitions.map((series) => series.label).join('、')}的每日趋势。`
      }
    },
    tooltip: { trigger: 'axis', confine: true },
    legend: {
      show: !hideLegend,
      type: 'scroll',
      top: 0,
      left: 0,
      right: 0,
      itemWidth: 12,
      itemHeight: 8
    },
    grid: {
      top: hideLegend ? 28 : options.showValues ? 60 : 48,
      left: 12,
      right: 18,
      bottom: zoom ? 64 : 20,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map((row) => row.date),
      boundaryGap: definitions.some((series) => series.type === 'bar'),
      axisLabel: { formatter: (date: string) => date.slice(5), hideOverlap: true },
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      name: options.showValues && units.length === 1 ? units[0] : undefined,
      axisLabel: { color: '#6b7280' },
      splitLine: { lineStyle: { color: '#f3f4f6' } }
    },
    dataZoom: zoom
      ? [
          { type: 'inside', filterMode: 'none' },
          { type: 'slider', height: 18, bottom: 4 }
        ]
      : [],
    series: definitions.map((definition) => ({
      name: definition.label,
      type: definition.type || 'line',
      stack: definition.stack,
      ...(definition.color ? { itemStyle: { color: definition.color } } : {}),
      data: data.map((row) => {
        const value = Number(row[definition.key] ?? 0)
        return Number.isFinite(value) ? value : 0
      }),
      showSymbol: data.length <= 14,
      symbolSize: 5,
      barMaxWidth: 28,
      label: {
        show: Boolean(options.showValues) && definitions.length === 1 && !zoom,
        position: 'top',
        color: '#4b5563',
        formatter: (params) =>
          Number(params.value) > 0 ? Number(params.value).toLocaleString('zh-CN') : ''
      },
      emphasis: { focus: 'series' },
      tooltip: {
        valueFormatter: (value) =>
          `${Number(value).toLocaleString('zh-CN')}${definition.unit || ''}`
      }
    }))
  }
}
