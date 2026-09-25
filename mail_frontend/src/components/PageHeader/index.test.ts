import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ isAuthenticated: false }))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/stores/user', () => ({ useUserStore: () => auth }))
vi.mock('@/services/api', () => ({ isTauri: () => false }))
vi.mock('@/components/AccountActions/index.vue', () => ({ default: { template: '<div />' } }))

import PageHeader from './index.vue'

const mountHeader = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/user', component: { template: '<div />' } },
      { path: '/market', component: { template: '<div />' } },
      { path: '/download', component: { template: '<div />' } },
      { path: '/open-platform', component: { template: '<div />' } },
      { path: '/about', component: { template: '<div />' } }
    ]
  })
  await router.push('/market')
  await router.isReady()
  const wrapper = mount(PageHeader, { global: { plugins: [router] } })
  return { router, wrapper }
}

describe('public page workbench entry', () => {
  beforeEach(() => { auth.isAuthenticated = false })

  it('stays visible on public pages and opens the guest mailbox for visitors', async () => {
    const { router, wrapper } = await mountHeader()
    expect(wrapper.get('.page-header-shell > div').classes()).toContain('h-[54px]')
    expect(wrapper.findAll('.h-\\[54px\\]')).toHaveLength(2)
    const workbench = wrapper.get('a[href="/"][class*="whitespace-nowrap"]')
    expect(workbench.text()).toBe('pageHeader.workspace')
    expect(wrapper.findAll('a[href="/"]')).toHaveLength(2)

    await router.push('/download')
    await flushPromises()
    expect(wrapper.get('a[href="/"][class*="whitespace-nowrap"]').text()).toBe('pageHeader.workspace')
    wrapper.unmount()
  })

  it('opens the signed-in workspace from the marketplace', async () => {
    auth.isAuthenticated = true
    const { wrapper } = await mountHeader()
    expect(wrapper.get('a[href="/user"]').text()).toBe('pageHeader.workspace')
    expect(wrapper.find('a[href="/market"]').exists()).toBe(true)
    wrapper.unmount()
  })
})
