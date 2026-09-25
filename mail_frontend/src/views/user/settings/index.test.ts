import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  get: vi.fn(async () => ({
    code: 0,
    data: { username: 'Member', email: 'member@example.com', google_id: 'google-user' }
  })),
  showMessage: vi.fn()
}))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ user: {} }) }))
vi.mock('@/services/api', () => ({ default: { get: mocks.get }, isTauri: () => false }))
vi.mock('@/utils/message', () => ({ showMessage: mocks.showMessage }))
vi.mock('@/utils/dialog', () => ({ showConfirm: vi.fn() }))
vi.mock('@/utils/openExternalAuthUrl', () => ({ openExternalAuthUrl: vi.fn() }))

import Settings from './index.vue'

let wrapper: ReturnType<typeof mount> | undefined
afterEach(() => {
  wrapper?.unmount()
  vi.clearAllMocks()
})

describe('Google binding callbacks in personal settings', () => {
  it('refreshes binding results on arrival and on a later desktop callback, preserving other URL state', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/user/settings', component: Settings }]
    })
    await router.push('/user/settings?google_bind_success=1&source=account#binding')
    await router.isReady()
    wrapper = mount({ template: '<router-view />' }, { global: { plugins: [router] } })
    await flushPromises()

    expect(mocks.get).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Member')
    expect(wrapper.text()).toContain('profile.bound')
    expect(mocks.showMessage).toHaveBeenCalledWith('profile.bindSuccess', 'success')
    expect(router.currentRoute.value.fullPath).toBe('/user/settings?source=account#binding')

    await router.push('/user/settings?google_bind_error=Binding%20failed&source=account#binding')
    await flushPromises()

    expect(mocks.get).toHaveBeenCalledTimes(2)
    expect(mocks.showMessage).toHaveBeenCalledWith('Binding failed', 'error')
    expect(router.currentRoute.value.fullPath).toBe('/user/settings?source=account#binding')
  })
})
