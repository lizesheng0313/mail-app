import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import zhCN from '@/i18n/messages/zh-CN'

const mocks = vi.hoisted(() => ({
  userStore: {
    isAuthenticated: true,
    user: { email: 'user@example.com', is_admin: false },
    logout: vi.fn()
  },
  apiGet: vi.fn(async () => ({ code: 0, data: { count: 0, items: [] } }))
}))
vi.mock('@/stores/user', () => ({ useUserStore: () => mocks.userStore }))
vi.mock('@/services/api', () => ({ default: { get: mocks.apiGet, post: vi.fn() } }))
vi.mock('@/utils/message', () => ({ showMessage: vi.fn() }))
vi.mock('@/components/LanguageSwitcher/index.vue', () => ({ default: { template: '<div />' } }))

import AccountActions from './index.vue'

const cleanups: Array<() => void> = []
beforeEach(() => {
  mocks.userStore.isAuthenticated = true
  mocks.userStore.user.is_admin = false
})
afterEach(() => cleanups.splice(0).forEach((cleanup) => cleanup()))

const renderActions = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }]
  })
  await router.push('/')
  const wrapper = mount(AccountActions, {
    global: {
      plugins: [router, createI18n({ legacy: false, locale: 'zh-CN', messages: { 'zh-CN': zhCN } })]
    }
  })
  cleanups.push(() => wrapper.unmount())
  await flushPromises()
  return wrapper
}

describe('Shared header account and notification entries', () => {
  it('shows login and registration for guests', async () => {
    mocks.userStore.isAuthenticated = false
    const wrapper = await renderActions()
    expect(wrapper.get('a[href="/login"]').text()).toBe('登录')
    expect(wrapper.get('a[href="/login?mode=register"]').text()).toBe('注册')
    expect(wrapper.find('[aria-label="账户菜单"]').exists()).toBe(false)
  })

  it('keeps account pages in the sidebar and hides the admin entry from members', async () => {
    const wrapper = await renderActions()
    await wrapper.get('[aria-label="账户菜单"]').trigger('click')
    for (const path of ['/user/settings', '/user/finance', '/user/purchases', '/profile']) {
      expect(wrapper.find(`a[href="${path}"]`).exists(), path).toBe(false)
    }
    expect(wrapper.find('a[href="/admin/domains"]').exists()).toBe(false)
  })

  it('keeps the admin entry for administrators', async () => {
    mocks.userStore.user.is_admin = true
    const wrapper = await renderActions()
    await wrapper.get('[aria-label="账户菜单"]').trigger('click')
    expect(wrapper.get('a[href="/admin/domains"]').text()).toContain('管理')
  })

  it('provides both personal notifications and system announcements', async () => {
    const wrapper = await renderActions()
    await wrapper.get('button[title="公告通知"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('a[href="/user/notifications?tab=personal"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/user/announcements"]').exists()).toBe(true)
  })
})
