import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/CustomSelect/index.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/services/api', () => ({ isTauri: () => false }))
vi.mock('@/api/batchLogin', () => ({ default: {} }))
vi.mock('@/api/mailboxProxy', () => ({ default: { getOptions: vi.fn() } }))
vi.mock('@/utils/message', () => ({ showMessage: vi.fn() }))

import BatchAddAccountModal from './BatchAddAccountModal.vue'

const mountModal = () => mount(BatchAddAccountModal, {
  props: { visible: true },
  global: { stubs: { Teleport: true } }
})

describe('Batch add external mailbox input', () => {
  it('accepts an OAuth mailbox address without requesting its web password', async () => {
    const wrapper = mountModal()
    await wrapper.get('textarea').setValue('owner@gmail.com\nowner@outlook.com')
    await wrapper.findAll('button').find((button) => button.text().includes('batchAdd.startAdd'))!.trigger('click')

    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual([
      expect.objectContaining({ email: 'owner@gmail.com', password: '', oauth_only: true }),
      expect.objectContaining({ email: 'owner@outlook.com', password: '', oauth_only: true })
    ])
    wrapper.unmount()
  })

  it('still requires an authorization code for a regular mailbox', async () => {
    const wrapper = mountModal()
    await wrapper.get('textarea').setValue('owner@163.com')
    await wrapper.findAll('button').find((button) => button.text().includes('batchAdd.startAdd'))!.trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.text()).toContain('缺少密码或授权码')
    wrapper.unmount()
  })
})
