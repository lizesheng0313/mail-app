import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, reactive } from 'vue'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ user: {} as any }))
vi.mock('@/stores/user', () => ({ useUserStore: () => mocks.user }))
vi.mock('@/services/sessionIdentity', () => ({ getBrowserInstanceId: () => 'browser', getTabSessionId: () => 'tab' }))
import { useAuthSessionSync } from './useAuthSessionSync'
let wrapper: any
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('BroadcastChannel', undefined)
  mocks.user = reactive({ isAuthenticated: true, user: { id: 1 }, logout: vi.fn() })
  wrapper = mount(defineComponent({ setup() { useAuthSessionSync(); return () => null } }))
})
afterEach(() => { wrapper.unmount(); vi.useRealTimers(); vi.unstubAllGlobals(); localStorage.clear() })
it('preserves cross-tab account isolation without creating an online heartbeat timer', async () => {
  await flushPromises()
  await vi.advanceTimersByTimeAsync(1)
  expect(vi.getTimerCount()).toBe(0)
  await vi.advanceTimersByTimeAsync(3600000)
  window.dispatchEvent(new StorageEvent('storage', { key: '__auth_session_sync__', newValue: JSON.stringify({
    type: 'auth-switch', browser_instance_id: 'browser', tab_session_id: 'another-tab', user_id: 2,
  }) }))
  expect(mocks.user.logout).toHaveBeenCalledOnce()
})
it('ignores another browser and the same account', () => {
  for (const [browser, user] of [['other-browser', 2], ['browser', 1]]) {
    window.dispatchEvent(new StorageEvent('storage', { key: '__auth_session_sync__', newValue: JSON.stringify({
      type: 'auth-switch', browser_instance_id: browser, tab_session_id: 'another-tab', user_id: user,
    }) }))
  }
  expect(mocks.user.logout).not.toHaveBeenCalled()
})
