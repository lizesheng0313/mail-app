import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

import AdminDataTable from './index.vue'

describe('workspace data table height', () => {
  it('keeps the sticky header above scrolling row actions', () => {
    const wrapper = mount(AdminDataTable, {
      slots: {
        thead: '<tr><th>操作</th></tr>',
        tbody: '<tr><td><button>删除</button></td></tr>'
      }
    })

    expect(wrapper.get('thead').classes()).toEqual(expect.arrayContaining(['sticky', 'top-0', 'z-10', 'bg-gray-50']))
    wrapper.unmount()
  })

  it('fills the available table area only for an empty, loaded list', async () => {
    const wrapper = mount(AdminDataTable, {
      props: { fillEmptyHeight: true },
      slots: {
        thead: '<tr><th>Column</th></tr>',
        tbody: '<tr><td>No records</td></tr>'
      }
    })

    expect(wrapper.get('table').classes()).toContain('h-full')
    await wrapper.setProps({ loading: true })
    expect(wrapper.get('table').classes()).not.toContain('h-full')
    wrapper.unmount()
  })
})
