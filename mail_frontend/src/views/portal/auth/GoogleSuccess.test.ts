import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { rememberLoginRedirect } from '@/utils/loginRedirect'

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  completeLogin: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: mocks.replace, push: mocks.push }),
  useRoute: () => ({ query: { token: 'oauth-token' } })
}))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ completeLogin: mocks.completeLogin, user: { id: 1 } })
}))

import GoogleSuccess from './GoogleSuccess.vue'

beforeEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
  mocks.completeLogin.mockResolvedValue({ success: true })
})

describe('Google login completion', () => {
  it('returns to the mailbox the guest wanted to open', async () => {
    rememberLoginRedirect('/user/mailboxes/hosted')
    const wrapper = mount(GoogleSuccess)
    await flushPromises()
    expect(mocks.replace).toHaveBeenCalledWith('/user/mailboxes/hosted')
    wrapper.unmount()
  })

  it('uses the workspace when login did not start from a mailbox', async () => {
    const wrapper = mount(GoogleSuccess)
    await flushPromises()
    expect(mocks.replace).toHaveBeenCalledWith('/user')
    wrapper.unmount()
  })
})
