import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  desktop: true,
  invoke: vi.fn(),
  listen: vi.fn(),
  message: vi.fn(),
  proxies: vi.fn(),
  promote: vi.fn(),
  importCandidates: vi.fn()
}))
vi.mock('@/services/api', () => ({ isTauri: () => mocks.desktop }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke }))
vi.mock('@tauri-apps/api/event', () => ({ listen: mocks.listen }))
vi.mock('@/utils/message', () => ({ showMessage: mocks.message }))
vi.mock('@/api/mailboxProxy', () => ({ default: { getOptions: mocks.proxies } }))
vi.mock('@/api/externalVerifyPool', () => ({
  default: { promoteCandidates: mocks.promote, importCandidates: mocks.importCandidates }
}))
vi.mock('@/utils/externalMailboxRelay', () => ({
  createExternalMailboxFailure: (value: any) => new Error(value.message),
  runExternalMailboxWithRelayFallback: async ({ localAction }: any) => ({
    source: 'local',
    result: await localAction()
  }),
  verifyExternalMailboxThroughRelay: vi.fn()
}))
import BatchVerify from './index.vue'

const wrappers: ReturnType<typeof mount>[] = []
const setup = async () => {
  const wrapper = mount(BatchVerify, { attachTo: document.body })
  wrappers.push(wrapper)
  await vi.dynamicImportSettled()
  await flushPromises()
  return wrapper
}
const button = (wrapper: ReturnType<typeof mount>, label: string) =>
  wrapper.findAll('button').find((item) => item.text().startsWith(label))!
beforeEach(() => {
  vi.clearAllMocks()
  mocks.desktop = true
  mocks.proxies.mockResolvedValue({ code: 0, data: { proxies: [] } })
  mocks.listen.mockResolvedValue(vi.fn())
})
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()))

describe('batch verification workbench', () => {
  it('keeps the results pane visible, parses mixed input and resets errors with clear', async () => {
    const wrapper = await setup()
    expect(wrapper.find('section[aria-label="验号结果"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('验号结果将在这里显示')
    expect(button(wrapper, '开始验号').attributes('disabled')).toBeDefined()
    await wrapper
      .get('textarea')
      .setValue(
        'one@example.test,fixture-only,imap\nbroken\ntwo@example.test----fixture-only----pop3'
      )
    expect(wrapper.text()).toContain('3 个账号')
    expect(wrapper.text()).toContain('可验 2')
    expect(wrapper.text()).toContain('异常 1')
    expect(wrapper.get('section[aria-label="验号结果"]').text()).toContain('邮箱格式不对')
    expect(button(wrapper, '开始验号').attributes('disabled')).toBeUndefined()
    await button(wrapper, '清空').trigger('click')
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('')
    expect(wrapper.text()).toContain('验号结果将在这里显示')
  })

  it('updates filtered rows and progress while desktop verification finishes', async () => {
    const wrapper = await setup()
    const finish: Array<(value: any) => void> = []
    mocks.invoke.mockImplementation(() => new Promise((resolve) => finish.push(resolve)))
    await wrapper
      .get('textarea')
      .setValue('one@example.test,fixture-only,imap\ntwo@example.test,fixture-only,imap')
    await button(wrapper, '开始验号').trigger('click')
    await vi.dynamicImportSettled()
    await flushPromises()
    expect(mocks.invoke).toHaveBeenCalledTimes(2)
    expect(wrapper.get('textarea').attributes('disabled')).toBeDefined()
    expect(button(wrapper, '清空').attributes('disabled')).toBeDefined()
    await button(wrapper, '失败').trigger('click')
    expect(wrapper.text()).toContain('没有符合筛选条件的结果')
    finish[0]({ success: true, protocol: 'imap', smtp_checked: true, smtp_verified: true })
    finish[1]({ success: false, message: '邮箱或授权码错误' })
    await flushPromises()
    const results = wrapper.get('section[aria-label="验号结果"]')
    expect(results.text()).toContain('two@example.test')
    expect(results.text()).not.toContain('one@example.test')
    expect(results.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('100')
    expect(button(wrapper, '通过').text()).toContain('1')
    expect(button(wrapper, '失败').text()).toContain('1')
    await button(wrapper, '通过').trigger('click')
    expect(results.text()).toContain('one@example.test')
    expect(results.text()).toContain('SMTP 可发')
    expect(button(wrapper, '导出结果').attributes('disabled')).toBeUndefined()
    expect(button(wrapper, '导入成功账号').attributes('disabled')).toBeUndefined()
  })

  it('keeps password verification on desktop and does not call native verification from the web', async () => {
    mocks.desktop = false
    const wrapper = await setup()
    expect(wrapper.text()).not.toContain('网页端仅用于查看页面和入口')
    await wrapper.get('textarea').setValue('one@example.test,fixture-only,imap')
    await button(wrapper, '开始验号').trigger('click')
    await flushPromises()
    expect(mocks.message).toHaveBeenCalledWith(
      '账号密码类批量验号需要在桌面端客户端里操作',
      'warning'
    )
    expect(mocks.invoke).not.toHaveBeenCalled()
  })
})
