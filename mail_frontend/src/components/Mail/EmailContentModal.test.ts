import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { translateEmail, showMessage } = vi.hoisted(() => ({
  translateEmail: vi.fn(),
  showMessage: vi.fn(),
}))

vi.mock('vue-i18n', async (importOriginal) => ({
  ...await importOriginal<typeof import('vue-i18n')>(),
  useI18n: () => ({ t: (key: string) => key }),
}))
vi.mock('@/api/email', () => ({ emailAPI: { translateEmail } }))
vi.mock('@/utils/message', () => ({ showMessage }))

import EmailContentModal from './EmailContentModal.vue'

beforeEach(() => {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['zh-CN'])
  translateEmail.mockReset()
  showMessage.mockReset()
})

afterEach(() => vi.restoreAllMocks())

describe('email translation entry', () => {
  it('translates an email, switches back to the original, and reuses the translation', async () => {
    const email = { id: 8101, subject: 'Meeting invitation', content: 'Please join our meeting on Friday.' }
    translateEmail.mockResolvedValue({ code: 0, data: { subject: '会议邀请', content: '请于周五参加会议。' } })
    const wrapper = mount(EmailContentModal, { props: { visible: true, email }, global: { stubs: { Teleport: true } } })

    await wrapper.get('button[type="button"]').trigger('click')
    await flushPromises()
    expect(translateEmail).toHaveBeenCalledWith({ subject: email.subject, content: email.content, target_language: 'zh-CN' })
    expect(wrapper.text()).toContain('会议邀请')
    expect(wrapper.text()).toContain('请于周五参加会议。')
    expect(wrapper.get('button[type="button"]').text()).toBe('emailDetail.viewOriginal')
    expect(email.content).toBe('Please join our meeting on Friday.')

    await wrapper.get('button[type="button"]').trigger('click')
    expect(wrapper.text()).toContain(email.subject)
    expect(wrapper.text()).toContain(email.content)
    await wrapper.get('button[type="button"]').trigger('click')
    expect(wrapper.text()).toContain('请于周五参加会议。')
    expect(translateEmail).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('keeps the original email when translation fails', async () => {
    const email = { id: 8102, subject: 'Meeting invitation', content: 'Please join our meeting on Friday.' }
    translateEmail.mockResolvedValue({ code: 1, message: 'AI unavailable' })
    const wrapper = mount(EmailContentModal, { props: { visible: true, email }, global: { stubs: { Teleport: true } } })

    await wrapper.get('button[type="button"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain(email.content)
    expect(wrapper.get('button[type="button"]').text()).toBe('emailDetail.translate')
    expect(showMessage).toHaveBeenCalledWith('emailDetail.translateFailed', 'error')
    wrapper.unmount()
  })
})
