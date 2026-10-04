import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const { batchDeleteMailboxes } = vi.hoisted(() => ({
  batchDeleteMailboxes: vi.fn().mockResolvedValue({ code: 0 })
}))

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, params?: Record<string, unknown>) => {
        if (key === 'mailToolbar.selectedMailboxes') {
          return `已选 ${params?.count ?? 0} 个邮箱`
        }
        if (key === 'systemMailbox.deleteBatchMessage') {
          return `确定删除 ${params?.count ?? 0} 个邮箱？`
        }
        return key
      }
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
    batchDeleteMailboxes
  }
}))

vi.mock('@/utils/message', () => ({ showMessage: vi.fn() }))

import SystemMailboxList from './MailboxList.vue'

describe('SystemMailbox batch selection', () => {
  it('uses all four selected mailboxes for count, copy, share and delete', async () => {
    const mailboxes = Array.from({ length: 4 }, (_, index) => ({
      id: index + 1,
      email: `mailbox-${index + 1}@example.test`,
      created_at: Date.now()
    }))
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    })

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

    await wrapper.get('button[title="mailToolbar.batchShare"]').trigger('click')
    const sharedMailboxes = wrapper.emitted('share')?.[0]?.[0] as Array<{ id: number }>
    expect(sharedMailboxes.map((mailbox) => mailbox.id)).toEqual([1, 2, 3, 4])

    await wrapper.get('button[title="mailToolbar.batchCopy"]').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith(
      mailboxes.map((mailbox) => mailbox.email).join('\n')
    )

    await wrapper.get('button[title="mailToolbar.batchDelete"]').trigger('click')
    expect(wrapper.text()).toContain('确定删除 4 个邮箱？')

    const confirmButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'confirmDialog.confirm')
    expect(confirmButton).toBeDefined()
    await confirmButton!.trigger('click')
    await flushPromises()

    expect(batchDeleteMailboxes).toHaveBeenCalledWith([1, 2, 3, 4], 'system')
    expect(wrapper.emitted('deleted')).toEqual([[[1, 2, 3, 4]]])
    wrapper.unmount()
  })
})
