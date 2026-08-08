import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('vue-router', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  useRoute: () => ({ path: '/user/automation/workflows', params: {} })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

vi.mock('@/stores/user', () => ({
  useUserStore: () => ({
    user: { email: 'user@example.com', is_admin: false },
    logout: vi.fn()
  })
}))

vi.mock('@/components/SidebarLayout/index.vue', () => ({
  default: {
    props: {
      menuSections: { type: Array, required: true }
    },
    template: `
      <div data-testid="sidebar-menu">
        <template v-for="section in menuSections" :key="section.name">
          <span v-for="item in section.items" :key="item.path">{{ item.path }}</span>
        </template>
        <slot />
      </div>
    `
  }
}))

import UserLayout from './UserLayout.vue'

describe('UserLayout 浏览器工作流入口', () => {
  it('在左侧菜单显示浏览器工作流入口', () => {
    const wrapper = mount(UserLayout, {
      global: {
        stubs: {
          RouterView: { template: '<div />' }
        }
      }
    })

    expect(wrapper.get('[data-testid="sidebar-menu"]').text()).toContain(
      '/user/automation/browser-workflows'
    )
  })
})
