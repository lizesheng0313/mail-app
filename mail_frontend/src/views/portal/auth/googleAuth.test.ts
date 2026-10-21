import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  completeGoogleLogin: vi.fn(), getGoogleOnboardingInfo: vi.fn(),
  createGoogleAccount: vi.fn(), bindExistingGoogle: vi.fn(), completeLogin: vi.fn()
}))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/api/auth', () => ({ default: mocks }))
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ completeLogin: mocks.completeLogin }) }))
vi.mock('@/utils/loginRedirect', () => ({ takeLoginRedirect: () => null }))
import GoogleSuccess from './GoogleSuccess.vue'
import GoogleChoose from './GoogleChoose.vue'

const ticket = 't'.repeat(43)
const flow = 's'.repeat(43)
const verifier = 'v'.repeat(43)
const proof = { ticket, client_verifier: verifier }
let wrapper: ReturnType<typeof mount> | undefined

beforeEach(() => {
  sessionStorage.clear()
  sessionStorage.setItem('google-oauth:' + flow, JSON.stringify({ verifier, createdAt: Date.now() }))
  mocks.completeGoogleLogin.mockResolvedValue({ code: 0, data: { token: 'verified-session' } })
  mocks.getGoogleOnboardingInfo.mockResolvedValue({ code: 0, data: { email: 'verified@gmail.com', name: 'Verified User', picture: '' } })
  mocks.createGoogleAccount.mockResolvedValue({ code: 0, data: { token: 'new-session' } })
  mocks.bindExistingGoogle.mockResolvedValue({ code: 0, data: { token: 'bound-session' } })
  mocks.completeLogin.mockResolvedValue({ success: true })
})
afterEach(() => { wrapper?.unmount(); vi.clearAllMocks() })

async function open(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/auth/google/success', component: GoogleSuccess },
    { path: '/auth/google/choose', component: GoogleChoose },
    { path: '/login', component: { template: '<div>Login</div>' } },
    { path: '/user', component: { template: '<div>Home</div>' } },
    { path: '/user/settings', component: { template: '<div>Settings</div>' } }
  ] })
  await router.push(path)
  await router.isReady()
  wrapper = mount({ template: '<router-view />' }, { global: { plugins: [router] } })
  await flushPromises()
  return router
}

describe('verified Google callback pages', () => {
  it('exchanges the ticket with client proof and uses only the session from the API response', async () => {
    const router = await open(`/auth/google/success?ticket=${ticket}&flow=${flow}&token=forged-session`)
    expect(mocks.completeGoogleLogin).toHaveBeenCalledWith(proof)
    expect(mocks.completeLogin).toHaveBeenCalledWith('verified-session', 'google')
    expect(router.currentRoute.value.path).toBe('/user')
    expect(sessionStorage.getItem('google-oauth:' + flow)).toBeNull()
  })

  it('rejects old URL tokens and callbacks without the initiating client secret', async () => {
    sessionStorage.clear()
    const router = await open(`/auth/google/success?ticket=${ticket}&flow=${flow}&token=forged-session`)
    expect(mocks.completeGoogleLogin).not.toHaveBeenCalled()
    expect(mocks.completeLogin).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('finishes binding in the original logged-in client before showing settings', async () => {
    mocks.completeGoogleLogin.mockResolvedValue({ code: 0, data: { action: 'bind' } })
    const router = await open(`/auth/google/success?ticket=${ticket}&flow=${flow}`)
    expect(mocks.completeGoogleLogin).toHaveBeenCalledWith(proof)
    expect(mocks.completeLogin).not.toHaveBeenCalled()
    expect(router.currentRoute.value.fullPath).toBe('/user/settings?google_bind_success=1')
  })

  it('loads server-verified profile information and registers without resubmitting identity fields', async () => {
    const router = await open(`/auth/google/choose?ticket=${ticket}&flow=${flow}&google_email=forged@gmail.com`)
    expect(mocks.getGoogleOnboardingInfo).toHaveBeenCalledWith(proof)
    expect(wrapper!.text()).toContain('verified@gmail.com')
    expect(wrapper!.text()).not.toContain('forged@gmail.com')
    expect(router.currentRoute.value.query).toEqual({})
    await wrapper!.findAll('button')[0].trigger('click')
    await flushPromises()
    expect(mocks.createGoogleAccount).toHaveBeenCalledWith(proof)
    expect(mocks.completeLogin).toHaveBeenCalledWith('new-session', 'google')
    expect(router.currentRoute.value.path).toBe('/user')
  })

  it('requires the Google ticket together with local account credentials when binding an existing account', async () => {
    await open(`/auth/google/choose?ticket=${ticket}&flow=${flow}`)
    await wrapper!.findAll('button')[1].trigger('click')
    await wrapper!.find('input[type="email"]').setValue('member@example.com')
    await wrapper!.find('input[type="password"]').setValue('local-password')
    await wrapper!.find('form').trigger('submit')
    await flushPromises()
    expect(mocks.bindExistingGoogle).toHaveBeenCalledWith({ ...proof, email: 'member@example.com', password: 'local-password' })
    expect(mocks.completeLogin).toHaveBeenCalledWith('bound-session', 'google')
  })
})
