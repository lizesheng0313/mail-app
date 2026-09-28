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
})
