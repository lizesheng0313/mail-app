import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ThreeColumnLayout from './ThreeColumnLayout.vue'

vi.mock('@/components/PageHeader/index.vue', () => ({
  default: { template: '<header data-testid="page-header">Header</header>' }
}))

describe('ThreeColumnLayout', () => {
  it('renders the embedded workspace without the old guest landing or standalone header', () => {
    const wrapper = mount(ThreeColumnLayout, {
      props: { embedded: true, workspaceMode: true, compactPanels: true },
      slots: {
        toolbar: '<button>Create mailbox</button>',
        left: '<section data-testid="mailboxes">Mailboxes</section>',
        middle: '<section data-testid="inbox">Inbox</section>',
        right: '<section data-testid="detail">Detail</section>'
      }
    })

    expect(wrapper.find('[data-testid="page-header"]').exists()).toBe(false)
    expect(wrapper.find('.mail-layout--embedded').exists()).toBe(true)
    expect(wrapper.find('.mail-landing').exists()).toBe(false)
    expect(wrapper.get('[data-testid="mailboxes"]').text()).toBe('Mailboxes')
    expect(wrapper.get('[data-testid="inbox"]').text()).toBe('Inbox')
    expect(wrapper.get('[data-testid="detail"]').text()).toBe('Detail')
    wrapper.unmount()
  })

  it('keeps the standalone layout available for the public share page', () => {
    const wrapper = mount(ThreeColumnLayout, {
      slots: { middle: '<section>Shared inbox</section>' }
    })

    expect(wrapper.get('[data-testid="page-header"]').text()).toBe('Header')
    expect(wrapper.text()).toContain('Shared inbox')
    wrapper.unmount()
  })

  it('constrains the resizable workspace to the available height', () => {
    const wrapper = mount(ThreeColumnLayout, {
      props: { embedded: true, workspaceMode: true, resizablePanels: true },
      slots: {
        toolbar: '<button>Create mailbox</button>',
        left: '<section>Mailboxes</section>',
        middle: '<section>Inbox</section>',
        right: '<section>Detail</section>'
      }
    })

    expect(wrapper.get('.mail-layout--embedded > div').classes()).toContain('min-h-0')
    expect(wrapper.get('.mail-layout-grid-shell').classes()).toContain('min-h-0')
    expect(wrapper.get('.mail-resizable-grid--triple').classes()).toContain('min-h-0')
    wrapper.unmount()
  })

  it('omits the separate toolbar row when actions move into the mailbox header', () => {
    const wrapper = mount(ThreeColumnLayout, {
      props: { embedded: true, workspaceMode: true },
      slots: { left: '<section>Mailboxes</section>' }
    })

    expect(wrapper.find('.mail-layout-safe').exists()).toBe(false)
    wrapper.unmount()
  })

  it('keeps mobile mailboxes, inbox and detail in switchable panes', async () => {
    const wrapper = mount(ThreeColumnLayout, {
      props: {
        embedded: true,
        compactPanels: true,
        mobilePanes: [
          { key: 'left', label: '邮箱' },
          { key: 'middle', label: '收件箱' },
          { key: 'right', label: '邮件详情' }
        ],
        mobileActivePane: 'left'
      },
      slots: {
        left: '<section>Mailboxes</section>',
        middle: '<section>Inbox</section>',
        right: '<section>Detail</section>'
      }
    })

    expect(wrapper.get('.mail-mobile-pane-grid').exists()).toBe(true)
    expect(wrapper.get('.mail-pane--left').classes()).toContain('mail-pane--active')
    expect(wrapper.get('.mail-pane--right').classes()).not.toContain('mail-pane--active')

    await wrapper.get('button[aria-current="page"]').trigger('click')
    await wrapper.findAll('.mail-mobile-tabs button')[2].trigger('click')
    expect(wrapper.emitted('update:mobileActivePane')?.[1]).toEqual(['right'])

    await wrapper.setProps({ mobileActivePane: 'right' })
    expect(wrapper.get('.mail-pane--right').classes()).toContain('mail-pane--active')
    expect(wrapper.findAll('button[aria-current="page"]')).toHaveLength(1)
    wrapper.unmount()
  })
})
