import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('vue-i18n', async importOriginal => ({
  ...await importOriginal<typeof import('vue-i18n')>(),
  useI18n: () => ({ t: (key: string) => key })
}))
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ isAuthenticated: true }) }))
vi.mock('@/services/api', () => ({ isTauri: () => false, extractApiErrorMessage: () => '' }))
vi.mock('@/utils/message', () => ({ showMessage: vi.fn() }))

import ShareMailboxModal from './ShareMailboxModal.vue'
import { mailboxShareAPI } from '@/api/mailboxShare'

describe('share creation dialog', () => {
  beforeEach(() => localStorage.clear())
  it('sends all selected mailboxes in one creation request and shows exactly the requested number of links', async () => {
    const createShare = vi.spyOn(mailboxShareAPI, 'createShare').mockResolvedValue({ code: 0, data: {
      batch_title: '客户第一批', shares: [{ share_url: '/share/one', link_note: '客户甲' }, { share_url: '/share/two', link_note: '' }, { share_url: '/share/three', link_note: '客户乙' }]
    } })
    const wrapper = mount(ShareMailboxModal, {
      props: { visible: true, mailboxIds: [1, 2, 3], mailboxType: 'system', selectedMailboxes: [
        { id: 1, email: 'one@example.com' }, { id: 2, email: 'two@example.com' }, { id: 3, email: 'three@example.com' }
      ] },
      global: { stubs: { Teleport: true } }
    })
    await wrapper.get('#share-batch-title').setValue('  客户第一批  ')
    await wrapper.get('#share-link-count').setValue(3)
    await wrapper.get('#share-link-note-1').setValue('  客户甲  ')
    await wrapper.get('#share-link-note-3').setValue('客户乙')
    await wrapper.findAll('button').find((button) => button.text() === 'shareMailbox.create')!.trigger('click')
    await flushPromises()
    expect(createShare).toHaveBeenCalledWith(expect.objectContaining({ mailbox_ids: [1, 2, 3], batch_title: '客户第一批', share_count: 3, link_notes: ['客户甲', '', '客户乙'] }), '')
    expect(wrapper.findAll('input[readonly]')).toHaveLength(3)
    expect(wrapper.text()).toContain('客户第一批')
    expect(wrapper.text()).toContain('客户甲')
    expect(wrapper.text()).toContain('客户乙')
    expect(localStorage.getItem('mailbox-share-preferences')).not.toContain('客户甲')
    wrapper.unmount()
    createShare.mockRestore()
  })

  it('preserves note drafts when the link count changes and sends only the current links', async () => {
    const createShare = vi.spyOn(mailboxShareAPI, 'createShare').mockResolvedValue({ code: 0, data: { shares: [{ share_url: '/share/one' }, { share_url: '/share/two' }] } })
    const wrapper = mount(ShareMailboxModal, { props: { visible: true, mailboxIds: [1], mailboxType: 'system' }, global: { stubs: { Teleport: true } } })
    await wrapper.get('#share-link-count').setValue(3)
    await wrapper.get('#share-link-note-1').setValue('第一条')
    await wrapper.get('#share-link-note-3').setValue('暂不用')
    await wrapper.get('#share-link-count').setValue(2)
    expect(wrapper.find('#share-link-note-3').exists()).toBe(false)
    expect((wrapper.get('#share-link-note-1').element as HTMLInputElement).value).toBe('第一条')
    await wrapper.findAll('button').find((button) => button.text() === 'shareMailbox.create')!.trigger('click')
    await flushPromises()
    expect(createShare).toHaveBeenCalledWith(expect.objectContaining({ share_count: 2, link_notes: ['第一条', ''] }), '')
    wrapper.unmount()
    createShare.mockRestore()
  })

  it('does not duplicate the sidebar share-link management entry', () => {
    const wrapper = mount(ShareMailboxModal, {
      props: { visible: true, mailboxIds: [1], mailboxType: 'system' },
      global: { stubs: { Teleport: true } }
    })

    expect(wrapper.text()).toContain('shareMailbox.title')
    expect(wrapper.text()).not.toContain('shareMailbox.managedTitle')
    wrapper.unmount()
  })

  it('shows help only for link count and latest-only mode', () => {
    const wrapper = mount(ShareMailboxModal, {
      props: { visible: true, mailboxIds: [1], mailboxType: 'system' },
      global: { stubs: { Teleport: true } }
    })

    const helpButtons = wrapper.findAll('button[aria-label$="Help"]')
    expect(helpButtons.map((button) => button.attributes('aria-label'))).toEqual([
      'shareMailbox.linkCountHelp',
      'shareMailbox.latestOnlyHelp'
    ])
    wrapper.unmount()
  })
})
