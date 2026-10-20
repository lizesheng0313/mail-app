import type { EChartsOption } from 'echarts'

export interface MailboxProvider {
  key: string
  name: string
  connected_mailboxes: number
  unique_owners?: number
  oauth_mailboxes?: number
  password_mailboxes?: number
  share_percent?: number
  domains?: string[]
}

export function buildProviderBarOption(providers: MailboxProvider[]): EChartsOption {
  const data = [...providers].sort((a, b) => b.connected_mailboxes - a.connected_mailboxes)
  const number = (value: number | undefined) => Number(value || 0).toLocaleString('zh-CN')
  return {
    animation: false,
    color: ['#2563eb'],
    aria: { enabled: true },
    grid: { top: 12, left: 0, right: 52, bottom: 28, containLabel: true },
    tooltip: {
      trigger: 'item',
      confine: true,
      renderMode: 'richText',
      formatter: (params) => {
        const point = Array.isArray(params) ? params[0] : params
        const provider = data[point.dataIndex]
        return [
          provider.name,
          `接入邮箱  ${number(provider.connected_mailboxes)}（${provider.share_percent || 0}%）`,
          `用户  ${number(provider.unique_owners)}`,
          `OAuth  ${number(provider.oauth_mailboxes)}`,
          `密码 / 授权码  ${number(provider.password_mailboxes)}`,
          ...(provider.domains?.length ? [provider.domains.join('、')] : [])
        ].join('\n')
      }
    },
    xAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#6b7280' },
      splitLine: { lineStyle: { color: '#f3f4f6' } }
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: data.map((provider) => provider.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#374151', width: 112, overflow: 'break', lineHeight: 18 }
    },
    series: [
      {
        name: '接入邮箱',
        type: 'bar',
        barMaxWidth: 24,
        data: data.map((provider) => provider.connected_mailboxes),
        label: {
          show: true,
          position: 'right',
          color: '#374151',
          formatter: (params) => number(Number(params.value))
        },
        itemStyle: { borderRadius: [0, 4, 4, 0] }
      }
    ]
  }
}
