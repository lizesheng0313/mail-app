import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/services/api', () => ({ isTauri: () => false }))
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({
    user: { email: 'user@example.com', is_admin: false },
    isAuthenticated: true,
    logout: vi.fn()
  })
}))
vi.mock('@/components/AccountActions/index.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/FloatingLiveChat/index.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/BaseModal/index.vue', () => ({ default: { template: '<div />' } }))

import UserLayout from './UserLayout.vue'

const cleanups: Array<() => void> = []
afterEach(() => cleanups.splice(0).forEach((cleanup) => cleanup()))

const createWorkbench = async (path: string) => {
  const page = defineComponent({ template: '<div>Existing business page</div>' })
  const verification = defineComponent({
    setup() {
      return { count: ref(0) }
    },
    template: '<button data-testid="verification-progress" @click="count++">{{ count }}</button>'
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/user',
        component: UserLayout,
        children: [
          { path: 'automation/workflows', component: page },
          { path: 'automation/browser-workflows', component: page },
          { path: 'mailboxes/external', component: page, meta: { mailboxType: 'external' } },
          { path: 'mailboxes/hosted', component: page, meta: { mailboxType: 'hosted' } },
          { path: 'domains', component: page },
          { path: 'external-bulk-send', component: page },
          { path: 'external-batch-verify', component: verification, meta: { keepAlive: true } },
          { path: 'email-reach/templates/25/edit', component: page },
          { path: 'finance', component: page },
          { path: 'purchases', component: page }
        ]
      },
      { path: '/:pathMatch(.*)*', component: page }
    ]
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(defineComponent({ template: '<router-view />' }), {
    global: { plugins: [router] }
  })
  cleanups.push(() => wrapper.unmount())
  await flushPromises()
  return { wrapper, router }
}

describe('User workspace navigation', () => {
  it('shows the brand as the home link without a duplicate mailbox title', async () => {
    const { wrapper } = await createWorkbench('/user/mailboxes/external')
    expect(wrapper.get('header').attributes('style')).toContain('height: 54px')
    expect(wrapper.get('a[href="/"] h1').text()).toBe('pageHeader.siteName')
    expect(wrapper.get('a[href="/"]').element.parentElement?.classList.contains('site-header-inline-padding')).toBe(true)
    expect(wrapper.get('a[href="/"]').attributes('aria-label')).toBe('pageHeader.siteName')
    expect(wrapper.get('a[href="/"] h1').classes()).toEqual(
      expect.arrayContaining(['text-base', 'font-semibold', 'text-black'])
    )
    expect(wrapper.find('header h1').exists()).toBe(false)
    await wrapper.get('button[aria-label="收起菜单"]').trigger('click')
    const expandButton = wrapper.get('button[aria-label="展开菜单"]')
    expect(expandButton.exists()).toBe(true)
    expect(expandButton.element.parentElement?.classList.contains('justify-start')).toBe(true)
    expect(expandButton.classes()).toContain('ml-0')
    expect(wrapper.get('.sidebar-shell').classes()).toContain('sidebar-shell--collapsed')
    expect(wrapper.get('header button[aria-label="展开菜单"]').exists()).toBe(true)
  })

  it('hides duplicate mailbox headings but keeps titles on other workspace pages', async () => {
    const { wrapper, router } = await createWorkbench('/user/mailboxes/hosted')
    expect(wrapper.find('header h1').exists()).toBe(false)
    await router.push('/user/domains')
    await flushPromises()
    expect(wrapper.find('header h1').exists()).toBe(false)
    await router.push('/user/automation/workflows')
    await flushPromises()
    expect(wrapper.get('header h1').text()).toBe('userLayout.automationWorkflows')
  })

  it('keeps public pages reachable from the workspace header', async () => {
    const { wrapper } = await createWorkbench('/user/automation/workflows')
    expect(wrapper.get('a[href="/user"][aria-current="page"] span.hidden').text()).toBe('pageHeader.workspace')
    expect(wrapper.get('a[href="/user"][aria-current="page"]').attributes('aria-label')).toBe('pageHeader.workspace')
    expect(wrapper.get('a[href="/user"][aria-current="page"] svg.md\\:hidden').exists()).toBe(true)
    for (const path of ['/market', '/open-platform', '/download', '/about']) {
      expect(wrapper.find(`a[href="${path}"]`).exists(), path).toBe(true)
    }
    expect(wrapper.get('a[aria-label="pageHeader.resourceMarket"]').attributes('href')).toBe('/market')
  })

  it('uses the same mobile drawer for workspace and public links', async () => {
    const { wrapper } = await createWorkbench('/user/mailboxes/external')
    await wrapper.get('header button[aria-label="展开菜单"]').trigger('click')
    const drawer = wrapper.get('[role="dialog"]')
    expect(drawer.get('a[href="/user/mailboxes/external"]').exists()).toBe(true)
    expect(drawer.get('a[href="/market"]').exists()).toBe(true)
    expect(drawer.get('a[href="/about"]').exists()).toBe(true)

    await drawer.get('button[aria-label="pageHeader.closeNavigationMenu"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('keeps the workspace entry in place while moving between workspace pages', async () => {
    const { wrapper, router } = await createWorkbench('/user/mailboxes/external')
    await router.push('/user/automation/workflows')
    await flushPromises()
    expect(wrapper.get('a[href="/user"][aria-current="page"] span.hidden').text()).toBe('pageHeader.workspace')
  })

  it('shows the original workflows under automation while the browser workflow transition is hidden', async () => {
    const { wrapper } = await createWorkbench('/user/automation/workflows')
    expect(wrapper.find('a[href="/user/automation/workflows"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/user/automation/browser-workflows"]').exists()).toBe(false)
    const account = wrapper
      .findAll('button')
      .find((button) => button.text() === 'workspace.account')!
    await account.trigger('click')
    expect(wrapper.find('a[href="/user/resource-orders"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/user/finance"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/user/purchases"]').exists()).toBe(false)
  })

  it('opens original third-party tool URLs with the parent menu and tool tab selected', async () => {
    const { wrapper, router } = await createWorkbench('/user/external-bulk-send')
    expect(wrapper.find('a[href="/user/mailboxes/external"]').classes()).toContain(
      'text-primary-700'
    )
    const tools = wrapper.get('nav[aria-label="workspace.mailboxTools"]')
    expect(tools.get('a[aria-current="page"]').attributes('href')).toBe('/user/external-bulk-send')
    await router.push('/user/mailboxes/external')
    await flushPromises()
    expect(tools.get('a[aria-current="page"]').text()).toBe('mail.inbox')
  })

  it('preserves verification progress while switching to the inbox and back', async () => {
    const { wrapper, router } = await createWorkbench('/user/external-batch-verify')
    await wrapper.get('[data-testid="verification-progress"]').trigger('click')
    await router.push('/user/mailboxes/external')
    await flushPromises()
    expect(wrapper.find('[data-testid="verification-progress"]').exists()).toBe(false)
    await router.push('/user/external-batch-verify')
    await flushPromises()
    expect(wrapper.get('[data-testid="verification-progress"]').text()).toBe('1')
  })

  it('opens the active section when navigating directly to a detail page', async () => {
    const { wrapper, router } = await createWorkbench('/user/automation/workflows')
    await router.push('/user/email-reach/templates/25/edit')
    await flushPromises()
    expect(wrapper.get('a[href="/user/email-reach/templates"]').classes()).toContain(
      'text-primary-700'
    )
  })

  it('keeps the milk coin account selected for the old transaction URL', async () => {
    const { wrapper } = await createWorkbench('/user/purchases')
    expect(wrapper.get('a[href="/user/finance"]').classes()).toContain('text-primary-700')
  })
})
