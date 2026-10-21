import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { rememberLoginRedirect } from '@/utils/loginRedirect'

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  completeLogin: vi.fn(),
  completeGoogleLogin: vi.fn(),
  route: { path: '/auth/google/success', hash: '', query: {} as Record<string, string> }
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: mocks.replace, push: mocks.push }),
  useRoute: () => mocks.route
}))
vi.mock('@/api/auth', () => ({ default: { completeGoogleLogin: mocks.completeGoogleLogin } }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ completeLogin: mocks.completeLogin, user: { id: 1 } })
}))

import GoogleSuccess from './GoogleSuccess.vue'

beforeEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
  const flow = 's'.repeat(43)
  mocks.route.query = { ticket: 't'.repeat(43), flow }
  sessionStorage.setItem('google-oauth:' + flow, JSON.stringify({ verifier: 'v'.repeat(43), createdAt: Date.now() }))
  mocks.completeGoogleLogin.mockResolvedValue({ code: 0, data: { token: 'verified-session' } })
  mocks.completeLogin.mockResolvedValue({ success: true })
})

describe('Google login completion', () => {
  it('returns to the mailbox the guest wanted to open', async () => {
    rememberLoginRedirect('/user/mailboxes/hosted')
    const wrapper = mount(GoogleSuccess)
    await flushPromises()
    expect(mocks.completeLogin).toHaveBeenCalledWith('verified-session', 'google')
    expect(mocks.replace).toHaveBeenCalledWith('/user/mailboxes/hosted')
    wrapper.unmount()
  })

  it('uses the workspace when login did not start from a mailbox', async () => {
    const wrapper = mount(GoogleSuccess)
    await flushPromises()
    expect(mocks.replace).toHaveBeenCalledWith('/user')
    wrapper.unmount()
  })

  it('rejects a legacy callback containing only a session token', async () => {
    mocks.route.query = { token: 'untrusted-url-token' }
    const wrapper = mount(GoogleSuccess)
    await flushPromises()
    expect(mocks.completeGoogleLogin).not.toHaveBeenCalled()
    expect(mocks.completeLogin).not.toHaveBeenCalled()
    expect(mocks.replace).toHaveBeenCalledWith('/login?error=googleAuth.loginFailed')
    wrapper.unmount()
  })
})
