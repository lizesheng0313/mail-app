import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  isAuthenticated: true,
  getMyShares: vi.fn(),
  deleteShare: vi.fn(),
  batchDeleteShares: vi.fn()
}))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string, params?: { count?: number }) => params?.count ? `${key}:${params.count}` : key }) }))
vi.mock('@/stores/user', () => ({ useUserStore: () => mocks }))
vi.mock('@/services/api', () => ({ isTauri: () => false }))
vi.mock('@/utils/message', () => ({ showMessage: vi.fn() }))
vi.mock('@/api/mailboxShare', () => ({
  mailboxShareAPI: { getMyShares: mocks.getMyShares, deleteShare: mocks.deleteShare, batchDeleteShares: mocks.batchDeleteShares }
}))

import ShareLinksPage from './index.vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import AdminPagination from '@/components/AdminPagination/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'

const share = {
  id: 42,
  mailbox_emails: ['sample@example.com'],
  mailbox_ids: '1',
  status: 'active',
  expire_mode: 'permanent',
  expire_at: null,
  open_count: 2,
  last_opened_at: '2026-09-28T11:30:00',
  share_url: '/share/example-token'
}

const mountPage = () => mount(ShareLinksPage, { global: { stubs: { Teleport: true } } })

describe('share-link workspace page', () => {
  beforeEach(() => {
    mocks.isAuthenticated = true
    mocks.getMyShares.mockReset()
    mocks.deleteShare.mockReset()
    mocks.batchDeleteShares.mockReset()
  })

  it('loads links in the page and uses the site confirmation dialog to revoke', async () => {
    mocks.getMyShares
      .mockResolvedValueOnce({ code: 0, data: { shares: [share], pagination: { total: 1 } } })
      .mockResolvedValueOnce({ code: 0, data: { shares: [], pagination: { total: 0 } } })
    mocks.deleteShare.mockResolvedValue({ code: 0 })
    const nativeConfirm = vi.spyOn(window, 'confirm')
    const wrapper = mountPage()
    await flushPromises()

    expect(mocks.getMyShares).toHaveBeenCalledWith(1, 20, false, '')
    expect(wrapper.classes()).toContain('h-full')
    expect(wrapper.findComponent(AdminDataTable).exists()).toBe(true)
    expect(wrapper.get('table').findAll('thead th')).toHaveLength(8)
    expect(wrapper.findComponent(AdminPagination).props('total')).toBe(1)
    expect(wrapper.get('.admin-pagination').exists()).toBe(true)
    expect(wrapper.text()).toContain('sample@example.com')
    expect(wrapper.text()).toContain('shareMailbox.openCountValue:2')
    expect(wrapper.text()).toContain('shareMailbox.lastOpened')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    await wrapper.get('button[aria-label="shareMailbox.revoke"]').trigger('click')

    const dialog = wrapper.getComponent(ConfirmDialog)
    expect(dialog.props('visible')).toBe(true)
    expect(nativeConfirm).not.toHaveBeenCalled()
    dialog.vm.$emit('confirm')
    await flushPromises()
    await nextTick()

    expect(mocks.deleteShare).toHaveBeenCalledWith(42, false)
    expect(dialog.props('visible')).toBe(false)
    wrapper.unmount()
    nativeConfirm.mockRestore()
  })

  it('loads guest-owned links without a signed-in account', async () => {
    mocks.isAuthenticated = false
    mocks.getMyShares.mockResolvedValue({ code: 0, data: { shares: [], pagination: { total: 0 } } })
    const wrapper = mountPage()
    await flushPromises()

    expect(mocks.getMyShares).toHaveBeenCalledWith(1, 20, true, '')
    expect(wrapper.text()).toContain('shareMailbox.noShares')
    wrapper.unmount()
  })

  it('uses the shared pagination to load another page', async () => {
    mocks.getMyShares.mockResolvedValue({ code: 0, data: { shares: [share], pagination: { total: 21 } } })
    const wrapper = mountPage()
    await flushPromises()

    const pagination = wrapper.getComponent(AdminPagination)
    expect(pagination.props('totalPages')).toBe(2)
    pagination.vm.$emit('page-change', 2)
    await flushPromises()

    expect(mocks.getMyShares).toHaveBeenCalledWith(2, 20, false, '')
    expect(wrapper.getComponent(AdminPagination).props('currentPage')).toBe(2)
    wrapper.unmount()
  })

  it('shows first-open duration and uses the delete action for an expired record', async () => {
    const minutesShare = { ...share, expire_mode: 'minutes', expire_minutes: 30, created_at: '2026-09-28T09:36:12' }
    const expiredShare = { ...share, id: 43, status: 'expired', expire_at: '2026-09-27T09:36:12' }
    mocks.getMyShares.mockResolvedValue({ code: 0, data: { shares: [minutesShare, expiredShare], pagination: { total: 2 } } })
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.get('thead').findAll('th').map((column) => column.text())).toEqual([
      '',
      'shareMailbox.mailboxColumn',
      'shareMailbox.typeColumn',
      'shareMailbox.createdAtColumn',
      'shareMailbox.validityColumn',
      'shareMailbox.statusColumn',
      'shareMailbox.openCountColumn',
      'shareMailbox.actionColumn'
    ])
    expect(wrapper.text()).toContain('shareMailbox.firstOpenMinutes:30')
    expect(wrapper.text()).toContain('shareMailbox.awaitingFirstOpen')
    const firstRowCells = wrapper.get('tbody').findAll('tr')[0].findAll('td')
    expect(firstRowCells[3].text()).toContain('2026')
    expect(firstRowCells[4].text()).toBe('shareMailbox.firstOpenMinutes:30')
    const expiredStatus = wrapper.get('tbody').findAll('tr')[1].findAll('td')[5].get('span')
    expect(expiredStatus.text()).toBe('shareMailbox.expired')
    expect(expiredStatus.classes()).toEqual(expect.arrayContaining(['bg-gray-100', 'text-gray-600']))
    expect(wrapper.get('button[aria-label="shareMailbox.deleteRecord"]').exists()).toBe(true)
    expect(wrapper.findAll('button[aria-label="common.copy"]')).toHaveLength(1)
    await wrapper.get('button[aria-label="shareMailbox.deleteRecord"]').trigger('click')
    expect(wrapper.getComponent(ConfirmDialog).props('title')).toBe('shareMailbox.deleteRecord')
    wrapper.unmount()
  })

  it('searches all shares by mailbox address through the API', async () => {
    mocks.getMyShares.mockResolvedValue({ code: 0, data: { shares: [], pagination: { total: 0 } } })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('input[type="search"]').setValue(' sample@example.com ')
    await wrapper.findAll('button').find((button) => button.text() === 'shareMailbox.search')!.trigger('click')
    await flushPromises()

    expect(mocks.getMyShares).toHaveBeenLastCalledWith(1, 20, false, 'sample@example.com')
    expect(wrapper.text()).toContain('shareMailbox.noSearchResults')
    wrapper.unmount()
  })

  it('selects the current page and deletes owned links in one request', async () => {
    const secondShare = { ...share, id: 43, share_url: '/share/second-token' }
    mocks.getMyShares
      .mockResolvedValueOnce({ code: 0, data: { shares: [share, secondShare], pagination: { total: 2 } } })
      .mockResolvedValueOnce({ code: 0, data: { shares: [], pagination: { total: 0 } } })
    mocks.batchDeleteShares.mockResolvedValue({ code: 0, data: { deleted_count: 2 } })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('input[aria-label="shareMailbox.selectPage"]').setValue(true)
    expect(wrapper.text()).toContain('shareMailbox.selectedCount:2')
    await wrapper.findAll('button').find((button) => button.text() === 'shareMailbox.deleteSelected')!.trigger('click')
    const dialog = wrapper.getComponent(ConfirmDialog)
    expect(dialog.props('message')).toBe('shareMailbox.deleteSelectedConfirm:2')
    dialog.vm.$emit('confirm')
    await flushPromises()

    expect(mocks.batchDeleteShares).toHaveBeenCalledWith([42, 43], false)
    expect(mocks.deleteShare).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
