import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'

const { getTaskSendRecords, showMessage } = vi.hoisted(() => ({
  getTaskSendRecords: vi.fn(), showMessage: vi.fn()
}))
vi.mock('@/api/emailReach', () => ({ default: { getTaskSendRecords } }))
vi.mock('@/utils/message', () => ({ showMessage }))
import TaskDetailModal from './TaskDetailModal.vue'

const table = defineComponent({
  name: 'AdminDataTable', props: ['pagination', 'loading'], emits: ['page-change'],
  template: '<div><slot name="tbody" /></div>'
})
const deferred = () => {
  let resolve!: (value: any) => void
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}
const response = (page = 1, email = 'one@test.invalid') => ({
  code: 0, data: { items: [{ id: page, recipient_email: email }], page, limit: 50, total: 103, pages: 3 }
})
const openModal = (task = { id: 12, planned_count: 103, sent_count: 100 }) => mount(TaskDetailModal, {
  props: { visible: true, task },
  global: { stubs: { BaseModal: { template: '<div><slot /></div>' }, AdminDataTable: table } }
})
beforeEach(() => { getTaskSendRecords.mockReset(); showMessage.mockReset() })

describe('task recipient pagination', () => {
  it('loads 50 rows per page, keeps overall task totals, and reaches the last page', async () => {
    getTaskSendRecords.mockResolvedValueOnce(response()).mockResolvedValueOnce(response(3, 'last@test.invalid'))
    const wrapper = openModal()
    await flushPromises()
    expect(getTaskSendRecords).toHaveBeenCalledWith(12, { page: 1, limit: 50 })
    expect(wrapper.text()).toContain('103')
    const grid = wrapper.getComponent(table)
    grid.vm.$emit('page-change', 3)
    await flushPromises()
    expect(getTaskSendRecords).toHaveBeenLastCalledWith(12, { page: 3, limit: 50 })
    expect(grid.props('pagination')).toMatchObject({ page: 3, total: 103, pages: 3 })
    expect(wrapper.text()).toContain('last@test.invalid')
    expect(wrapper.text()).not.toContain('one@test.invalid')
    expect(wrapper.text()).toContain('103')
    wrapper.unmount()
  })

  it('resets to page one on task changes and ignores a previous task response', async () => {
    const first = deferred()
    getTaskSendRecords.mockReturnValueOnce(first.promise).mockResolvedValueOnce(response(1, 'new@test.invalid'))
    const wrapper = openModal()
    await wrapper.setProps({ task: { id: 13 } })
    await flushPromises()
    first.resolve(response(1, 'stale@test.invalid'))
    await flushPromises()
    expect(getTaskSendRecords).toHaveBeenLastCalledWith(13, { page: 1, limit: 50 })
    expect(wrapper.text()).toContain('new@test.invalid')
    expect(wrapper.text()).not.toContain('stale@test.invalid')
    expect(wrapper.getComponent(table).props('loading')).toBe(false)
    wrapper.unmount()
  })

  it('discards pending rows when closed and requests page one when reopened', async () => {
    const first = deferred()
    getTaskSendRecords.mockReturnValueOnce(first.promise).mockResolvedValueOnce(response())
    const wrapper = openModal()
    await wrapper.setProps({ visible: false })
    first.resolve(response(2, 'closed@test.invalid'))
    await flushPromises()
    expect(wrapper.text()).not.toContain('closed@test.invalid')
    await wrapper.setProps({ visible: true })
    await flushPromises()
    expect(getTaskSendRecords).toHaveBeenLastCalledWith(12, { page: 1, limit: 50 })
    wrapper.unmount()
  })

  it.each([new Error('network'), { code: 1, message: '获取失败' }])('keeps the current page when the next request fails: %s', async (failure) => {
    getTaskSendRecords.mockResolvedValueOnce(response())
    if (failure instanceof Error) getTaskSendRecords.mockRejectedValueOnce(failure)
    else getTaskSendRecords.mockResolvedValueOnce(failure)
    const wrapper = openModal()
    await flushPromises()
    wrapper.getComponent(table).vm.$emit('page-change', 2)
    await flushPromises()
    expect(wrapper.getComponent(table).props('pagination').page).toBe(1)
    expect(wrapper.text()).toContain('one@test.invalid')
    expect(showMessage).toHaveBeenCalledOnce()
    expect(wrapper.getComponent(table).props('loading')).toBe(false)
    wrapper.unmount()
  })
})
