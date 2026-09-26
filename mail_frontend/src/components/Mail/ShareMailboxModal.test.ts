import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  isAuthenticated: true,
  getMyShares: vi.fn(),
  deleteShare: vi.fn()
}))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/stores/user', () => ({ useUserStore: () => mocks }))
vi.mock('@/services/api', () => ({ isTauri: () => false, extractApiErrorMessage: () => '' }))
vi.mock('@/utils/message', () => ({ showMessage: vi.fn() }))
vi.mock('@/api/mailboxShare', () => ({
  mailboxShareAPI: { getMyShares: mocks.getMyShares, deleteShare: mocks.deleteShare }
}))

import ShareMailboxModal from './ShareMailboxModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog/index.vue'

const share = {
  id: 42,
  mailbox_emails: ['sample@example.com'],
  mailbox_ids: '1',
  status: 'active',
  expire_mode: 'permanent',
  expire_at: null,
  share_url: '/share/example-token'
}

const mountManager = () => mount(ShareMailboxModal, {
  props: { visible: true, manageOnly: true, mailboxIds: [], mailboxType: 'system' },
  global: { stubs: { Teleport: true } }
})

describe('share link management', () => {
  beforeEach(() => {
    mocks.isAuthenticated = true
    mocks.getMyShares.mockReset()
    mocks.deleteShare.mockReset()
  })

  it('uses the site confirmation dialog before revoking a link', async () => {
    mocks.getMyShares
      .mockResolvedValueOnce({ code: 0, data: { shares: [share], pagination: { total: 1 } } })
      .mockResolvedValueOnce({ code: 0, data: { shares: [], pagination: { total: 0 } } })
    mocks.deleteShare.mockResolvedValue({ code: 0 })
    const nativeConfirm = vi.spyOn(window, 'confirm')
    const wrapper = mountManager()
    await flushPromises()

    expect(mocks.getMyShares).toHaveBeenCalledWith(1, 20, false)
    expect(wrapper.text()).toContain('sample@example.com')
    await wrapper.findAll('button').find((button) => button.text() === 'shareMailbox.revoke')!.trigger('click')

    const dialog = wrapper.getComponent(ConfirmDialog)
    expect(dialog.props('visible')).toBe(true)
    expect(dialog.props('zIndex')).toBe(12000)
    expect(nativeConfirm).not.toHaveBeenCalled()
    dialog.vm.$emit('confirm')
    await flushPromises()
    await nextTick()

    expect(mocks.deleteShare).toHaveBeenCalledWith(42, false)
    expect(wrapper.getComponent(ConfirmDialog).props('visible')).toBe(false)
    wrapper.unmount()
    nativeConfirm.mockRestore()
  })

  it('loads guest-owned links without requiring a signed-in account', async () => {
    mocks.isAuthenticated = false
    mocks.getMyShares.mockResolvedValue({ code: 0, data: { shares: [], pagination: { total: 0 } } })
    const wrapper = mountManager()
    await flushPromises()

    expect(mocks.getMyShares).toHaveBeenCalledWith(1, 20, true)
    expect(wrapper.text()).toContain('shareMailbox.noShares')
    wrapper.unmount()
  })
})
