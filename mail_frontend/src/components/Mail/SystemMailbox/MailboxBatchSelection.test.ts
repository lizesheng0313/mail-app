import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, params?: Record<string, unknown>) =>
        key === 'mailToolbar.selectedMailboxes'
          ? `已选 ${params?.count ?? 0} 个邮箱`
          : key
    })
  }
})

vi.mock('@/stores/auth', () => ({
  useMailboxStore: () => ({
    mailboxes: [],
    currentPage: 1,
    totalPages: 1,
    totalMailboxes: 0,
    pageSize: 50,
    searchKeyword: '',
    fetchMailboxes: vi.fn()
  })
}))

vi.mock('@/api/mailboxTags', () => ({
  mailboxTagsAPI: {
    getBatchMailboxTags: vi.fn().mockResolvedValue({ data: {} })
  }
}))

vi.mock('@/api/unified', () => ({
  unifiedAPI: {
    batchDeleteMailboxes: vi.fn()
  }
}))

import SystemMailboxList from './MailboxList.vue'

describe('SystemMailbox batch selection', () => {
  it('keeps the toolbar count in sync when four mailbox checkboxes are selected', async () => {
    const mailboxes = Array.from({ length: 4 }, (_, index) => ({
      id: index + 1,
      email: `mailbox-${index + 1}@example.test`,
      created_at: Date.now()
    }))

    const wrapper = mount(SystemMailboxList, {
      attachTo: document.body,
      props: {
        mailboxes,
        showPagination: false,
        searchable: false
      },
      global: {
        stubs: {
          Teleport: true,
          MailboxTags: true,
          Pagination: true,
          ConfirmDialog: true,
          HoverTooltip: true
        }
      }
    })

    await wrapper.get('button').trigger('click')

    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes).toHaveLength(4)

    for (const checkbox of checkboxes) {
      await checkbox.trigger('click')
    }

    expect(wrapper.text()).toContain('已选 4 个邮箱')
    wrapper.unmount()
  })
})
