import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import zhCN from '@/i18n/messages/zh-CN'

const mocks = vi.hoisted(() => ({
  desktop: true,
  getExternal: vi.fn(),
  getSmtp: vi.fn(),
  invoke: vi.fn(),
  save: vi.fn(),
  proxy: vi.fn(),
  message: vi.fn()
}))
vi.mock('@/services/api', () => ({
  isTauri: () => mocks.desktop,
  getApiBaseURL: () => '/api',
  default: { post: vi.fn() }
}))
vi.mock('@/api/batchLogin', () => ({ batchLoginAPI: { getAccounts: mocks.getExternal } }))
vi.mock('@/api/smtpAccounts', () => ({
  default: { getAccounts: mocks.getSmtp, saveSentEmails: mocks.save }
}))
vi.mock('@/api/mailboxProxy', () => ({ default: { previewRuntimeProxy: mocks.proxy } }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke }))
vi.mock('@/utils/message', () => ({ showMessage: mocks.message }))
import SendEmailPanel from './SendEmailPanel.vue'

const wrappers: ReturnType<typeof mount>[] = []
const setup = async () => {
  const wrapper = mount(SendEmailPanel, {
    props: { pageMode: true, selectedMailboxIds: [7] },
    attachTo: document.body,
    global: {
      plugins: [createI18n({ legacy: false, locale: 'zh-CN', messages: { 'zh-CN': zhCN } })]
    }
  })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.desktop = true
  mocks.getExternal.mockResolvedValue({
    code: 0,
    data: { accounts: [{ id: 7, email: 'sender@example.test' }] }
  })
  mocks.getSmtp.mockResolvedValue({
    code: 0,
    data: {
      accounts: [
        {
          id: 9,
          email: 'sender@example.test',
          password: 'fixture-only',
          smtp_host: 'smtp.example.test',
          smtp_port: 465,
          status: 'active'
        }
      ]
    }
  })
  mocks.proxy.mockResolvedValue({ code: 0, data: {} })
  mocks.invoke.mockResolvedValue({ response_code: 250 })
  mocks.save.mockResolvedValue({ code: 0 })
})
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()))
const loadDraft = async (wrapper: ReturnType<typeof mount>) => {
  ;(wrapper.vm as any).loadDraftFromSent({
    id: 1,
    from_email: 'sender@example.test',
    to_email: 'recipient@example.test',
    subject: 'Table test',
    content_html:
      '<p style="text-align:center"><strong>Report</strong></p><table><tr><th><p>Name</p></th><th><p>Count</p></th></tr><tr><td><p>A</p></td><td><p>2</p></td></tr></table>',
    created_at: 0
  })
  await flushPromises()
}

describe('compact composer', () => {
  it('keeps AI and fullscreen available in the desktop inbox composer', async () => {
    const wrapper = await setup()
    await wrapper.setProps({ pageMode: false })
    await wrapper.get('button[aria-label="AI 辅助"]').trigger('click')
    expect(wrapper.find('aside').exists()).toBe(true)
    await wrapper.get('button[aria-label="全屏写信"]').trigger('click')
    expect(wrapper.find('section').classes()).toContain('fixed')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(wrapper.find('section').classes()).not.toContain('fixed')
  })
  it('uses icon entries and keeps the draft through fullscreen and HTML mode', async () => {
    const wrapper = await setup()
    expect(wrapper.text()).not.toContain('收件人、附件和正文都在这里一次处理完。')
    expect(wrapper.text()).not.toContain('未添加附件')
    const ai = wrapper.get('button[aria-label="AI 辅助"]')
    expect(ai.text()).toBe('')
    await ai.trigger('click')
    expect(wrapper.find('aside').exists()).toBe(true)
    await loadDraft(wrapper)
    const fullscreen = wrapper.get('button[aria-label="全屏写信"]')
    expect(fullscreen.text()).toBe('')
    await fullscreen.trigger('click')
    expect(document.body.style.overflow).toBe('hidden')
    await wrapper.get('button[aria-label="退出全屏"]').trigger('click')
    expect(document.body.style.overflow).toBe('')
    await wrapper.get('button[aria-label="HTML 源码"]').trigger('click')
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toContain('<table')
    await wrapper.get('button[aria-label="富文本编辑"]').trigger('click')
    expect(wrapper.findAll('.ProseMirror tr')).toHaveLength(2)
    expect((wrapper.get('input[id$="subject"]').element as HTMLInputElement).value).toBe(
      'Table test'
    )
  })

  it('sends styled HTML plus readable table text to the mocked desktop command and sent records', async () => {
    const wrapper = await setup()
    await loadDraft(wrapper)
    const send = wrapper.findAll('button').find((button) => button.text() === '发送')!
    expect(send.attributes('disabled')).toBeUndefined()
    await send.trigger('click')
    await flushPromises()
    expect(mocks.invoke).toHaveBeenCalledTimes(1)
    const [command, payload] = mocks.invoke.mock.calls[0]
    expect(command).toBe('send_smtp_email')
    expect(payload.content).toContain('Name\tCount\nA\t2')
    expect(payload.contentHtml).toContain('border-collapse: collapse')
    expect(payload.contentHtml).toContain('text-align: center')
    expect(payload.toEmail).toBe('recipient@example.test')
    expect(mocks.save.mock.calls[0][0].records[0].content_html).toBe(payload.contentHtml)
    expect(wrapper.get('.ProseMirror').text()).toBe('')
  })

  it('allows web editing while keeping desktop-only sending disabled', async () => {
    mocks.desktop = false
    const wrapper = await setup()
    await loadDraft(wrapper)
    expect(wrapper.text()).not.toContain('网页可编辑，发送请使用桌面端。')
    expect(wrapper.get('.ProseMirror').attributes('contenteditable')).toBe('true')
    expect(
      wrapper
        .findAll('button')
        .find((button) => button.text() === '发送')
        ?.attributes('disabled')
    ).toBeDefined()
    expect(mocks.invoke).not.toHaveBeenCalled()
  })
})
