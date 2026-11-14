import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), message: vi.fn() }))
vi.mock('@/services/api', () => ({ default: mocks }))
vi.mock('@/utils/message', () => ({ showMessage: mocks.message }))
import Config from './NewMailNotificationConfig.vue'

const template = {
  template_id: 'mail-template',
  title: '新邮件提醒',
  template_type: 'once',
  fields: ['thing1', 'time2'],
  content: '邮件主题：{{thing1.DATA}}\n收件时间：{{time2.DATA}}'
}
const wrappers: ReturnType<typeof mount>[] = []
const setup = async () => {
  const wrapper = mount(Config, {
    props: { miniappId: 1 },
    global: {
      stubs: {
        CustomSelect: {
          props: ['modelValue', 'options'],
          emits: ['update:modelValue', 'change'],
          template: `<select :value="modelValue" @change="$emit('update:modelValue', $event.target.value); $emit('change', $event.target.value)">
        <option value=""></option><option v-for="item in options" :value="item.value">{{ item.label }}</option></select>`
        }
      }
    }
  })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}
const button = (wrapper: ReturnType<typeof mount>, text: string) =>
  wrapper.findAll('button').find((item) => item.text() === text)!
beforeEach(() => {
  vi.clearAllMocks()
  mocks.get.mockImplementation(async (url: string, options: any) => ({
    code: 0,
    data: url.endsWith('/mail-notifications')
      ? null
      : url.includes('/mail-notification-keywords/')
        ? {
            items: [
              { kid: 1, name: '邮件主题' },
              { kid: 2, name: '收件时间' }
            ]
          }
        : options?.params?.public
          ? { items: [{ tid: '100', title: '新邮件提醒', type: 1 }] }
          : { items: [template] }
  }))
  mocks.put.mockResolvedValue({ code: 0 })
  mocks.post.mockResolvedValue({ code: 0, data: { template_id: 'mail-template' } })
})
afterEach(() => wrappers.splice(0).forEach((item) => item.unmount()))

it('requires all template fields before enabling and saves only the selected real template mapping', async () => {
  const wrapper = await setup()
  expect(mocks.put).not.toHaveBeenCalled()
  await wrapper.findAll('select')[0].setValue('mail-template')
  await wrapper.get('input[type=checkbox]').setValue(true)
  await button(wrapper, '保存').trigger('click')
  expect(mocks.put).not.toHaveBeenCalled()
  expect(mocks.message).toHaveBeenCalledWith('请选择模板并绑定全部字段', 'error')
  await wrapper.findAll('select')[1].setValue('subject')
  await button(wrapper, '保存').trigger('click')
  await flushPromises()
  expect(mocks.put).toHaveBeenCalledWith('/admin/miniapp/1/mail-notifications', {
    template_id: 'mail-template',
    field_mapping: { thing1: 'subject', time2: 'received_at' },
    miniprogram_state: 'formal',
    enabled: true
  })
})

it('searches the real account category library and adds only the explicitly selected keywords', async () => {
  const wrapper = await setup()
  await button(wrapper, '查找邮件模板').trigger('click')
  await flushPromises()
  expect(mocks.get).toHaveBeenCalledWith('/admin/miniapp/1/mail-notification-templates', {
    params: { public: true }
  })
  await button(wrapper, '选择').trigger('click')
  await flushPromises()
  await wrapper.findAll('input[type=checkbox]')[0].setValue(true)
  await button(wrapper, '添加模板').trigger('click')
  await flushPromises()
  expect(mocks.post).toHaveBeenCalledWith('/admin/miniapp/1/mail-notification-templates', {
    tid: '100',
    keyword_ids: [1]
  })
  expect(mocks.put).not.toHaveBeenCalled()
})

it('can disable notifications even when WeChat template lookup is unavailable', async () => {
  mocks.get.mockImplementation(async (url: string) => {
    if (url.endsWith('/mail-notifications'))
      return {
        code: 0,
        data: {
          template_id: 'removed-template',
          field_mapping: {},
          miniprogram_state: 'formal',
          enabled: true
        }
      }
    throw new Error('WeChat unavailable')
  })
  const wrapper = await setup()
  await wrapper.get('input[type=checkbox]').setValue(false)
  await button(wrapper, '保存').trigger('click')
  await flushPromises()
  expect(mocks.post).toHaveBeenCalledWith('/admin/miniapp/1/mail-notifications/disable')
})
