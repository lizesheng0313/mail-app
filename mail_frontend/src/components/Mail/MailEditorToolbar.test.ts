import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { Editor } from '@tiptap/vue-3'
import { afterEach, describe, expect, it, vi } from 'vitest'
import zhCN from '@/i18n/messages/zh-CN'
import { createMailEditorExtensions } from '@/utils/mailEditor'

const { uploadImageFile } = vi.hoisted(() => ({ uploadImageFile: vi.fn() }))
vi.mock('@/utils/imageUpload', () => ({ uploadImageFile }))
vi.mock('@/services/api', () => ({ getApiBaseURL: () => '/api' }))
vi.mock('@/utils/message', () => ({ showMessage: vi.fn() }))
import MailEditorToolbar from './MailEditorToolbar.vue'

const cleanup: (() => void)[] = []
const setup = () => {
  const element = document.createElement('div')
  document.body.append(element)
  const editor = new Editor({
    element,
    extensions: createMailEditorExtensions(),
    content: '<p>Hello</p>',
    editorProps: { handleScrollToSelection: () => true }
  })
  const wrapper = mount(MailEditorToolbar, {
    props: { editor },
    attachTo: document.body,
    global: {
      plugins: [createI18n({ legacy: false, locale: 'zh-CN', messages: { 'zh-CN': zhCN } })]
    }
  })
  cleanup.push(() => {
    wrapper.unmount()
    editor.destroy()
    element.remove()
  })
  return { editor, wrapper }
}
afterEach(() => {
  cleanup.splice(0).forEach((fn) => fn())
  vi.clearAllMocks()
})
const button = (label: string) =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
    (el) => el.textContent?.trim() === label
  )!
const tick = async () => {
  await flushPromises()
  // Tiptap restores the selection on the next animation frame after focusing.
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  await flushPromises()
}

describe('rich mail toolbar interactions', () => {
  it('inserts a table using the menu and applies add/delete commands to the selected table', async () => {
    const { editor, wrapper } = setup()
    await wrapper.get('button[aria-label="表格"]').trigger('click')
    await tick()
    const form = document.querySelector('form')!
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await tick()
    expect(editor.view.dom.querySelectorAll('tr')).toHaveLength(3)
    await wrapper.get('button[aria-label="表格"]').trigger('click')
    await tick()
    button('下方插入行').click()
    await tick()
    expect(editor.view.dom.querySelectorAll('tr')).toHaveLength(4)
    let firstCell = -1
    editor.state.doc.descendants((node, pos) => {
      if (firstCell === -1 && ['tableCell', 'tableHeader'].includes(node.type.name)) firstCell = pos
    })
    editor.commands.setTextSelection(firstCell + 2)
    await tick()
    await wrapper.get('button[aria-label="表格"]').trigger('click')
    await tick()
    expect(button('删除表格').disabled).toBe(false)
    button('删除表格').click()
    await tick()
    expect(editor.view.dom.querySelector('table')).toBeNull()
  })

  it('validates links and inserts them without losing the editor selection', async () => {
    const { editor, wrapper } = setup()
    editor.commands.setTextSelection({ from: 1, to: 6 })
    await wrapper.get('button[aria-label="链接"]').trigger('click')
    await tick()
    const input = document.querySelector<HTMLInputElement>('input[aria-label="链接地址"]')!
    input.value = 'javascript:alert(1)'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    document
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await tick()
    expect(document.querySelector('[role="alert"]')).not.toBeNull()
    expect(editor.getHTML()).not.toContain('<a')
    input.value = 'example.test'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    document
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await tick()
    expect(editor.view.dom.querySelector('a')?.textContent).toBe('Hello')
    expect(editor.getHTML()).toContain('href="https://example.test/"')
  })

  it('reports an inline image upload in progress and inserts the uploaded URL', async () => {
    const { editor, wrapper } = setup()
    let resolveUpload!: (value: { url: string }) => void
    uploadImageFile.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve
      })
    )
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [new File(['picture'], 'picture.png', { type: 'image/png' })]
    })
    await input.trigger('change')
    expect(wrapper.emitted('busy')?.[0]).toEqual([true])
    resolveUpload({ url: '/uploads/picture.png' })
    await tick()
    expect(editor.view.dom.querySelector('img')?.src).toContain('/uploads/picture.png')
    expect(wrapper.emitted('busy')).toEqual([[true], [false]])
  })
})
