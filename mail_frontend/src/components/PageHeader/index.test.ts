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
      { path: '/user/mailboxes/system', component: { template: '<div />' } },
      { path: '/user/mailboxes/hosted', component: { template: '<div />' } },
      { path: '/user/mailboxes/external', component: { template: '<div />' } },
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
    expect(wrapper.get('.page-header-shell').classes()).toContain('site-header-inline-padding')
    expect(wrapper.findAll('.h-\\[54px\\]')).toHaveLength(2)
    expect(wrapper.get('nav h1').classes()).toEqual(
      expect.arrayContaining(['text-base', 'font-semibold', 'text-black'])
    )
    const workbench = wrapper.get('a[href="/"][class*="whitespace-nowrap"]')
    expect(workbench.text()).toBe('pageHeader.workspace')
    expect(wrapper.findAll('a[href="/"]')).toHaveLength(3)
    expect(wrapper.get('nav button[aria-label="pageHeader.navigationMenu"]').element.parentElement?.children[0].tagName).toBe('BUTTON')
    expect(wrapper.get('nav a[aria-label="pageHeader.workspace"] svg').exists()).toBe(true)
    expect(wrapper.get('nav a[aria-label="pageHeader.resourceMarket"] svg').exists()).toBe(true)
    expect(wrapper.get('nav h1').element.parentElement?.parentElement?.classList.contains('hidden')).toBe(true)

    await router.push('/download')
    await flushPromises()
    expect(wrapper.get('a[href="/"][class*="whitespace-nowrap"]').text()).toBe('pageHeader.workspace')
    wrapper.unmount()
  })

  it('opens the signed-in workspace from the marketplace', async () => {
    auth.isAuthenticated = true
    const { wrapper } = await mountHeader()
    expect(wrapper.get('a[href="/user"] h1').text()).toBe('pageHeader.siteName')
    expect(wrapper.get('a[href="/user"][class*="whitespace-nowrap"]').text()).toBe('pageHeader.workspace')
    expect(wrapper.find('a[href="/market"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('keeps long navigation labels in a mobile menu', async () => {
    auth.isAuthenticated = true
    const { wrapper } = await mountHeader()
    expect(wrapper.get('.page-header-shell .hidden.md\\:flex').exists()).toBe(true)
    const menuButton = wrapper.get('button[aria-label="pageHeader.navigationMenu"]')
    expect(menuButton.attributes('aria-expanded')).toBe('false')

    await menuButton.trigger('click')
    expect(menuButton.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('[role="dialog"] a[href="/user/mailboxes/system"]').exists()).toBe(true)
    expect(wrapper.get('[role="dialog"]').text()).toContain('shareMailbox.managedTitle')
    expect(wrapper.get('a[href="/market"][class*="rounded-lg"]').text()).toBe('pageHeader.resourceMarket')

    await wrapper.get('a[href="/market"][class*="rounded-lg"]').trigger('click')
    expect(menuButton.attributes('aria-expanded')).toBe('false')
    wrapper.unmount()
  })
})
