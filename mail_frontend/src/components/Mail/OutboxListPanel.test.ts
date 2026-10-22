import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, expect, it, vi } from 'vitest'
import { dispatchAccountState } from '@/services/accountRealtime'

const api = vi.hoisted(() => ({ getSentEmails: vi.fn() }))
vi.mock('@/api/smtpAccounts', () => ({ default: api }))
vi.mock('@/utils/message', () => ({ showMessage: vi.fn() }))
import OutboxListPanel from './OutboxListPanel.vue'

afterEach(() => { vi.useRealTimers(); localStorage.clear() })

it('keeps the outbox quiet when idle and reloads on a saved send or bounce event', async () => {
  vi.useFakeTimers()
  localStorage.setItem('token', 'test-session')
  api.getSentEmails.mockResolvedValue({ code: 0, data: { records: [], pagination: { total: 0 } } })
  const wrapper = mount(OutboxListPanel)
  try {
    await flushPromises()
    expect(api.getSentEmails).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
    expect(api.getSentEmails).toHaveBeenCalledTimes(1)
    api.getSentEmails.mockResolvedValue({ code: 0, data: {
      records: [{ id: 9, subject: '发送记录', status: 'bounced' }], pagination: { total: 1 }
    } })
    dispatchAccountState('outbox')
    await flushPromises()
    expect(api.getSentEmails).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('发送记录')
    expect(wrapper.text()).toContain('已退信')
  } finally { wrapper.unmount() }
})
