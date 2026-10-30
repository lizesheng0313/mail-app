import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  isAuthenticated: true,
  getMyShareBatches: vi.fn(),
  deleteShare: vi.fn(),
  deleteShareBatches: vi.fn(),
  updateBatchNote: vi.fn(),
  updateLinkNote: vi.fn(),
  writeText: vi.fn()
}))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string, params?: { count?: number }) => params?.count !== undefined ? `${key}:${params.count}` : key }) }))
vi.mock('@/stores/user', () => ({ useUserStore: () => mocks }))
vi.mock('@/services/api', () => ({ isTauri: () => false }))
vi.mock('@/utils/message', () => ({ showMessage: vi.fn() }))
vi.mock('@/api/mailboxShare', () => ({ mailboxShareAPI: mocks }))

import ShareLinksPage from './index.vue'
import AdminDataTable from '@/components/AdminDataTable/index.vue'
import AdminPagination from '@/components/AdminPagination/index.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'

const link = {
  id: 42, mailbox_emails: ['sample@example.com'], mailbox_ids: '1', status: 'active',
  expire_mode: 'permanent', expire_at: null, open_count: 2,
  last_opened_at: '2026-09-28T11:30:00', share_url: '/share/example-token'
}
const batch = {
  ...link, batch_key: 'a'.repeat(32), batch_title: '客户交付第一批',
  link_count: 1, active_count: 1, awaiting_count: 0, shares: [link]
}
const response = (batches: any[], total = batches.length) => ({ code: 0, data: { batches: structuredClone(batches), pagination: { total } } })
const mountPage = () => mount(ShareLinksPage, { global: { stubs: {
  Teleport: true,
  Dialog: { props: ['open'], template: '<div v-if="open" role="dialog"><slot /></div>' },
  DialogPanel: { template: '<div><slot /></div>' },
  DialogTitle: { template: '<h2><slot /></h2>' }
} } })

describe('share creation batches', () => {
  beforeEach(() => {
    mocks.isAuthenticated = true
    mocks.getMyShareBatches.mockReset()
    mocks.deleteShare.mockReset()
    mocks.deleteShareBatches.mockReset()
    mocks.updateBatchNote.mockReset()
    mocks.updateLinkNote.mockReset()
    mocks.writeText.mockReset().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: mocks.writeText } })
  })

  it('shows one row per creation batch and confirms deletion of the entire batch', async () => {
    mocks.getMyShareBatches.mockResolvedValueOnce(response([batch])).mockResolvedValueOnce(response([]))
    mocks.deleteShareBatches.mockResolvedValue({ code: 0 })
    const nativeConfirm = vi.spyOn(window, 'confirm')
    const wrapper = mountPage()
    await flushPromises()
    expect(mocks.getMyShareBatches).toHaveBeenCalledWith(1, 20, false, '')
    expect(wrapper.findComponent(AdminDataTable).exists()).toBe(true)
    expect(wrapper.get('thead').findAll('th')).toHaveLength(8)
    expect(wrapper.get('thead').text()).not.toContain('shareMailbox.openCountColumn')
    expect(wrapper.get('tbody').findAll('tr')).toHaveLength(1)
    expect(wrapper.text()).toContain('客户交付第一批')
    expect(wrapper.get('tbody tr').findAll('td')[3].text()).toBe('1')
    await wrapper.get('button[aria-label="shareMailbox.deleteBatch"]').trigger('click')
    const dialog = wrapper.getComponent(ConfirmDialog)
    expect(dialog.props('visible')).toBe(true)
    expect(dialog.props('message')).toBe('shareMailbox.deleteBatchesConfirm:1')
    dialog.vm.$emit('confirm')
    await flushPromises()
    expect(nativeConfirm).not.toHaveBeenCalled()
    expect(mocks.deleteShareBatches).toHaveBeenCalledWith([batch.batch_key], false)
    expect(mocks.deleteShare).not.toHaveBeenCalled()
    wrapper.unmount()
    nativeConfirm.mockRestore()
  })

  it('loads and paginates batches with the guest ownership flag', async () => {
    mocks.isAuthenticated = false
    mocks.getMyShareBatches.mockResolvedValue(response([batch], 21))
    const wrapper = mountPage()
    await flushPromises()
    expect(mocks.getMyShareBatches).toHaveBeenCalledWith(1, 20, true, '')
    expect(wrapper.getComponent(AdminPagination).props('totalPages')).toBe(2)
    wrapper.getComponent(AdminPagination).vm.$emit('page-change', 2)
    await flushPromises()
    expect(mocks.getMyShareBatches).toHaveBeenLastCalledWith(2, 20, true, '')
    wrapper.unmount()
  })

  it('opens all links in a batch and copies only active links in order', async () => {
    const shares = [{ ...link, open_count: 0, link_note: '仅管理者可见' }, { ...link, id: 43, open_count: 2, status: 'expired', share_url: '/share/expired' }, { ...link, id: 44, open_count: 7, share_url: '/share/third' }]
    mocks.getMyShareBatches.mockResolvedValue(response([{ ...batch, link_count: 3, active_count: 2, open_count: 9, shares }]))
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.get('button[aria-label="shareMailbox.viewBatchLinks"]').trigger('click')
    const preview = wrapper.get('[role="dialog"]')
    expect(preview.findAll('input[readonly]')).toHaveLength(3)
    expect(preview.findAll('output').map(counter => counter.text())).toEqual(['0', '2', '7'])
    expect(preview.get('output[aria-label="shareMailbox.openCountColumn 3"]').text()).toBe('7')
    expect(preview.findAll('button[aria-label="shareMailbox.deleteRecord"]')).toHaveLength(3)
    expect(preview.find('button[aria-label="shareMailbox.revoke"]').exists()).toBe(false)
    expect(preview.findAll('a').map((anchor) => anchor.attributes('href'))).toEqual([
      `${window.location.origin}/share/example-token`, `${window.location.origin}/share/third`
    ])
    await preview.findAll('button').find((button) => button.text() === 'shareMailbox.copyBatchCount:2')!.trigger('click')
    expect(mocks.writeText).toHaveBeenCalledWith(`${window.location.origin}/share/example-token\n${window.location.origin}/share/third`)
    wrapper.unmount()
  })

  it('copies Mini Program paths and keeps separate batches with the same title', async () => {
    const wx = { ...link, share_url: null, miniapp_path: '/pages/shared-mailbox/index?token=wx' }
    mocks.getMyShareBatches.mockResolvedValue(response([batch, { ...batch, batch_key: 'b'.repeat(32), miniapp_path: wx.miniapp_path, shares: [wx] }]))
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.get('tbody').findAll('tr')).toHaveLength(2)
    expect(wrapper.get('tbody').findAll('button[aria-label="shareMailbox.copyActiveLinks"]')).toHaveLength(0)
    await wrapper.findAll('button[aria-label="shareMailbox.viewBatchLinks"]')[1].trigger('click')
    await wrapper.get('[role="dialog"]').findAll('button').find(button => button.text() === 'shareMailbox.copyBatchCount:1')!.trigger('click')
    expect(mocks.writeText).toHaveBeenCalledWith(wx.miniapp_path)
    wrapper.unmount()
  })

  it('deletes one link and returns to the remaining links in that batch', async () => {
    const second = { ...link, id: 43, share_url: '/share/second' }
    mocks.getMyShareBatches.mockResolvedValueOnce(response([{ ...batch, link_count: 2, active_count: 2, shares: [link, second] }])).mockResolvedValueOnce(response([{ ...batch, shares: [second] }]))
    mocks.deleteShare.mockResolvedValue({ code: 0 })
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.get('button[aria-label="shareMailbox.viewBatchLinks"]').trigger('click')
    await wrapper.findAll('button[aria-label="shareMailbox.deleteRecord"]')[0].trigger('click')
    const confirmation = wrapper.getComponent(ConfirmDialog)
    expect(confirmation.props('title')).toBe('shareMailbox.deleteRecord')
    expect(confirmation.props('message')).toBe('shareMailbox.deleteRecordConfirm')
    confirmation.vm.$emit('confirm')
    await flushPromises()
    expect(mocks.deleteShare).toHaveBeenCalledWith(42, false)
    expect(mocks.deleteShareBatches).not.toHaveBeenCalled()
    expect(wrapper.get('[role="dialog"]').findAll('input[readonly]')).toHaveLength(1)
    expect((wrapper.get('input[readonly]').element as HTMLInputElement).value).toContain('/share/second')
    wrapper.unmount()
  })

  it('searches titles and mailboxes and deletes multiple complete batches', async () => {
    const second = { ...batch, batch_key: 'b'.repeat(32), link_count: 100 }
    mocks.getMyShareBatches.mockResolvedValue(response([batch, second]))
    mocks.deleteShareBatches.mockResolvedValue({ code: 0 })
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.get('input[type="search"]').setValue(' 客户交付 ')
    await wrapper.findAll('button').find((button) => button.text() === 'shareMailbox.search')!.trigger('click')
    await flushPromises()
    expect(mocks.getMyShareBatches).toHaveBeenLastCalledWith(1, 20, false, '客户交付')
    await wrapper.get('input[aria-label="shareMailbox.selectBatchPage"]').setValue(true)
    await wrapper.findAll('button').find((button) => button.text() === 'shareMailbox.batchDelete')!.trigger('click')
    wrapper.getComponent(ConfirmDialog).vm.$emit('confirm')
    await flushPromises()
    expect(mocks.deleteShareBatches).toHaveBeenCalledWith([batch.batch_key, second.batch_key], false)
    wrapper.unmount()
  })

  it('edits notes independently and shows the last opened time only in details', async () => {
    mocks.isAuthenticated = false
    mocks.getMyShareBatches.mockResolvedValue(response([{ ...batch, created_at: '2026-10-25T12:30:00', link_count: 2, shares: [link, { ...link, id: 43 }] }]))
    mocks.updateBatchNote.mockResolvedValue({ code: 0, data: { batch_title: '第二批交付' } })
    mocks.updateLinkNote.mockResolvedValue({ code: 0, data: { link_note: '已发给小李' } })
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.get('tbody').text()).not.toContain('shareMailbox.lastOpened')
    await wrapper.get('button[aria-label="shareMailbox.viewBatchLinks"]').trigger('click')
    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.text()).toContain('12:30')
    expect(dialog.text()).toContain('shareMailbox.lastOpened')
    await dialog.get('button[aria-label="shareMailbox.editNote · shareMailbox.batchNote"]').trigger('click')
    await dialog.get('textarea[aria-label="shareMailbox.batchNote"]').setValue(' 第二批交付 ')
    await dialog.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.updateBatchNote).toHaveBeenCalledWith(batch.batch_key, '第二批交付', true)
    expect(wrapper.get('tbody').text()).toContain('第二批交付')
    expect(dialog.text()).toContain('第二批交付')
    await dialog.findAll('button[aria-label="shareMailbox.addNote · shareMailbox.linkNote"]')[0].trigger('click')
    await dialog.get('textarea[aria-label="shareMailbox.linkNote"]').setValue(' 已发给小李 ')
    await dialog.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.updateLinkNote).toHaveBeenCalledWith(42, '已发给小李', true)
    expect(dialog.text()).toContain('已发给小李')
    expect(dialog.findAll('button[aria-label="shareMailbox.addNote · shareMailbox.linkNote"]')).toHaveLength(1)
    expect(dialog.findAll('input[readonly]')).toHaveLength(2)
    wrapper.unmount()
  })

  it('preserves a failed note draft for retry and allows cancelling without saving', async () => {
    mocks.getMyShareBatches.mockResolvedValue(response([batch]))
    mocks.updateLinkNote.mockRejectedValueOnce(new Error('保存失败')).mockResolvedValueOnce({ code: 0, data: { link_note: '客户甲' } })
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.get('button[aria-label="shareMailbox.viewBatchLinks"]').trigger('click')
    const dialog = wrapper.get('[role="dialog"]')
    await dialog.get('button[aria-label="shareMailbox.addNote · shareMailbox.linkNote"]').trigger('click')
    await dialog.get('textarea[aria-label="shareMailbox.linkNote"]').setValue('客户甲')
    await dialog.get('form').trigger('submit')
    await flushPromises()
    expect(dialog.get('[role="alert"]').text()).toBe('保存失败')
    expect((dialog.get('textarea[aria-label="shareMailbox.linkNote"]').element as HTMLTextAreaElement).value).toBe('客户甲')
    await dialog.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.updateLinkNote).toHaveBeenCalledTimes(2)
    await dialog.get('button[aria-label="shareMailbox.editNote · shareMailbox.linkNote"]').trigger('click')
    await dialog.get('textarea[aria-label="shareMailbox.linkNote"]').setValue('放弃修改')
    await dialog.get('form').findAll('button').find((button) => button.text() === 'common.cancel')!.trigger('click')
    expect(dialog.text()).toContain('客户甲')
    expect(dialog.text()).not.toContain('放弃修改')
    expect(mocks.updateLinkNote).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it('keeps an individual mailbox list when a link has a different scope', async () => {
    const mailboxes = ['first@example.com', 'second@example.com']
    mocks.getMyShareBatches.mockResolvedValue(response([{ ...batch, mailbox_emails: mailboxes, link_count: 2, shares: [
      { ...link, mailbox_emails: mailboxes },
      { ...link, id: 43, mailbox_emails: [mailboxes[1]] }
    ] }]))
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.get('button[aria-label="shareMailbox.viewBatchLinks"]').trigger('click')
    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.findAll('button[aria-label="shareMailbox.linkMailboxes"]')).toHaveLength(1)
    await dialog.get('button[aria-label="shareMailbox.linkMailboxes"]').trigger('click')
    expect(dialog.get('ul').text()).toBe(mailboxes[1])
    wrapper.unmount()
  })

  it('shows mailbox counts, expands the complete collection and filters it without changing link scope', async () => {
    const mailboxes = Array.from({ length: 20 }, (_, index) => `delivery-${String(index + 1).padStart(2, '0')}@example.com`)
    const shares = [42, 43, 44].map(id => ({ ...link, id, mailbox_emails: mailboxes, mailbox_ids: Array.from({ length: 20 }, (_, index) => index + 1).join(',') }))
    mocks.getMyShareBatches.mockResolvedValue(response([
      { ...batch, mailbox_emails: mailboxes, link_count: 3, shares },
      { ...batch, batch_key: 'b'.repeat(32), mailbox_emails: ['other-batch@example.com'] }
    ]))
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.get('tbody').text()).toContain('shareMailbox.scopeMailboxCount:20')
    await wrapper.findAll('button[aria-label="shareMailbox.viewBatchLinks"]')[0].trigger('click')
    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.text()).not.toContain('other-batch@example.com')
    expect(dialog.findAll('ul')).toHaveLength(0)
    expect(dialog.findAll('input[readonly]')).toHaveLength(3)
    const batchScope = dialog.get('button[aria-label="shareMailbox.batchMailboxes"]')
    await batchScope.trigger('click')
    expect(batchScope.attributes('aria-expanded')).toBe('true')
    expect(dialog.get('ul').findAll('li')).toHaveLength(20)
    const search = dialog.get('input[type="search"]')
    await search.setValue('DELIVERY-20')
    expect(dialog.get('ul').findAll('li')).toHaveLength(1)
    expect(dialog.get('ul').text()).toBe(mailboxes[19])
    expect(dialog.text()).toContain('1/20')
    await search.setValue('absent')
    expect(dialog.text()).toContain('shareMailbox.noMatchingMailboxes')
    await search.setValue('')
    expect(dialog.get('ul').findAll('li')).toHaveLength(20)
    await batchScope.trigger('click')
    expect(dialog.findAll('ul')).toHaveLength(0)
    expect(dialog.findAll('button[aria-label="shareMailbox.linkMailboxes"]')).toHaveLength(0)
    expect(dialog.text()).not.toContain('shareMailbox.notesPrivate')
    expect(mocks.getMyShareBatches).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
