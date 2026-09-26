import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ user: { email: 'admin@example.com' }, logout: vi.fn() })
}))

import AdminLayout from './AdminLayout.vue'

const page = defineComponent({ template: '<div>管理内容</div>' })
const wrappers: Array<ReturnType<typeof mount>> = []

afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()))

const mountAdmin = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: page },
      {
        path: '/admin',
        component: AdminLayout,
        children: [
          { path: 'domains', component: page },
          { path: 'help-center', component: page },
          { path: ':pathMatch(.*)*', component: page }
        ]
      }
    ]
  })
  await router.push('/admin/domains')
  await router.isReady()
  const wrapper = mount(AdminLayout, { global: { plugins: [router] } })
  wrappers.push(wrapper)
  return { wrapper, router }
}

describe('Admin mobile navigation', () => {
  it('opens and closes the drawer without losing the current page', async () => {
    const { wrapper, router } = await mountAdmin()
    const toggle = wrapper.get('button[aria-label="打开管理菜单"]')
    expect(toggle.attributes('aria-expanded')).toBe('false')

    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('#admin-sidebar').classes()).toContain('fixed')

    await wrapper.get('#admin-sidebar button[aria-label="关闭管理菜单"]').trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(router.currentRoute.value.path).toBe('/admin/domains')
  })

  it('closes after navigation and shows the selected page title', async () => {
    const { wrapper, router } = await mountAdmin()
    await wrapper.get('button[aria-label="打开管理菜单"]').trigger('click')
    await wrapper.get('a[href="/admin/help-center"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/admin/help-center')
    expect(wrapper.get('button[aria-label="打开管理菜单"]').attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('header h1').text()).toBe('帮助中心')
  })

  it('closes the drawer with Escape', async () => {
    const { wrapper } = await mountAdmin()
    await wrapper.get('button[aria-label="打开管理菜单"]').trigger('click')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(wrapper.get('button[aria-label="打开管理菜单"]').attributes('aria-expanded')).toBe('false')
  })
})
