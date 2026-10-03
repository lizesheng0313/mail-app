import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import MilkAccountTabs from './MilkAccountTabs.vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

const renderTabs = async (path: string) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/user/finance', component: { template: '<div />' } },
      { path: '/user/purchases', component: { template: '<div />' } }
    ]
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(MilkAccountTabs, { global: { plugins: [router] } })
  return { wrapper, router }
}

describe('Milk account tabs', () => {
  it('opens balance and top-up by default while keeping the ledger one click away', async () => {
    const { wrapper } = await renderTabs('/user/finance')
    expect(wrapper.get('a[href="/user/finance"]').attributes('aria-current')).toBe('page')
    expect(wrapper.get('a[href="/user/purchases"]').text()).toBe('userLayout.transactions')
    wrapper.unmount()
  })

  it('marks the existing ledger URL as the active tab', async () => {
    const { wrapper } = await renderTabs('/user/purchases')
    expect(wrapper.get('a[href="/user/purchases"]').attributes('aria-current')).toBe('page')
    wrapper.unmount()
  })
})
