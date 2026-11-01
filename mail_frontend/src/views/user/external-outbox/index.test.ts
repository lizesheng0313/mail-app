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

  it('shows failures and reasons in the sent records table', async () => {
    getSentEmails.mockResolvedValue({code:0,data:{records:[{
      id:17,subject:'Failed mail',from_email:'sender@example.com',to_email:'receiver@example.com',
      status:'failed',error_message:'535 Authentication failed',created_at:1000
    }],pagination:{total:1}}})
    const wrapper=shallowMount(OutboxPage,{global:{stubs:{
      AdminDataTable:{template:'<table><tbody><slot name="tbody" /></tbody></table>'}
    }}})
    await flushPromises()
    expect(wrapper.text()).toContain('发送失败')
    expect(wrapper.text()).toContain('535 Authentication failed')
    expect(wrapper.find('.bg-rose-50').exists()).toBe(true)
    wrapper.unmount()
  })
})
