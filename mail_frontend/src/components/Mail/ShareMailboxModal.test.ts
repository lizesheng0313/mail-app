import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ isAuthenticated: true }) }))
vi.mock('@/services/api', () => ({ isTauri: () => false, extractApiErrorMessage: () => '' }))

import ShareMailboxModal from './ShareMailboxModal.vue'

describe('share creation dialog', () => {
  it('does not duplicate the sidebar share-link management entry', () => {
    const wrapper = mount(ShareMailboxModal, {
      props: { visible: true, mailboxIds: [1], mailboxType: 'system' },
      global: { stubs: { Teleport: true } }
    })

    expect(wrapper.text()).toContain('shareMailbox.title')
    expect(wrapper.text()).not.toContain('shareMailbox.managedTitle')
    wrapper.unmount()
  })

  it('explains the choices that change link access and timing', async () => {
    const wrapper = mount(ShareMailboxModal, {
      props: { visible: true, mailboxIds: [1], mailboxType: 'system' },
      global: { stubs: { Teleport: true } }
    })

    for (const key of [
      'selectedMailboxesHelp', 'expireModeHelp', 'daysHelp',
      'linkCountHelp', 'latestOnlyHelp', 'createHelp'
    ]) {
      expect(wrapper.find(`button[aria-label="shareMailbox.${key}"]`).exists()).toBe(true)
    }

    const minutes = wrapper.findAll('button').find((button) => button.text() === 'shareMailbox.minutesMode')
    await minutes?.trigger('click')
    expect(wrapper.find('button[aria-label="shareMailbox.minutesHelp"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="shareMailbox.startModeHelp"]').exists()).toBe(true)
    wrapper.unmount()
  })
})
