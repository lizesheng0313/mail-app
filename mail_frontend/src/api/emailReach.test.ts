import { afterEach, expect, it } from 'vitest'
import api from '@/services/api'
import emailReachApi from './emailReach'

const originalAdapter = api.defaults.adapter
afterEach(() => { api.defaults.adapter = originalAdapter })
it('serializes day boundaries as repeated keys and sends task pagination', async () => {
  const requests: any[] = []
  api.defaults.adapter = async config => {
    requests.push(config)
    return { data: { code: 0, data: {} }, status: 200, statusText: 'OK', headers: {}, config }
  }
  await emailReachApi.getSendTrend({ day_boundaries: [1000, 2000] })
  const url = new URL(api.getUri(requests[0]), 'http://test')
  expect(url.searchParams.getAll('day_boundaries')).toEqual(['1000', '2000'])
  await emailReachApi.getTaskSendRecords(12, { page: 3, limit: 50 })
  expect(requests[1].url).toBe('/email-reach/tasks/12/send-records')
  expect(requests[1].params).toEqual({ page: 3, limit: 50 })
})
