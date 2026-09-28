import { flushPromises, shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const getSentEmails = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/api/smtpAccounts', () => ({ smtpAccountsAPI: { getSentEmails } }))

import OutboxPage from './index.vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'

describe('outbox page layout', () => {
  it('fills the workspace with the empty table and keeps its footer at the bottom', async () => {
    getSentEmails.mockResolvedValue({ code: 0, data: { records: [], pagination: { total: 0 } } })
    const wrapper = shallowMount(OutboxPage)
    await flushPromises()

    expect(wrapper.classes()).toContain('h-full')
    const table = wrapper.getComponent(AdminDataTable)
    expect(table.element.parentElement?.classList.contains('flex')).toBe(true)
    expect(table.classes()).toContain('w-full')
    expect(table.props('fillEmptyHeight')).toBe(true)
    wrapper.unmount()
  })
})
