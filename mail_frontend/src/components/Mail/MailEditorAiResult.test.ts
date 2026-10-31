import { flushPromises, mount } from '@vue/test-utils'
import { Editor } from '@tiptap/vue-3'
import { createI18n } from 'vue-i18n'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMailEditorExtensions } from '@/utils/mailEditor'
import { applyMailAiResult, getMailAiTarget } from '@/utils/mailEditorAi'
import zhCN from '@/i18n/messages/zh-CN'
import MailEditorAiResult from './MailEditorAiResult.vue'

const mocks = vi.hoisted(() => ({ post: vi.fn(), message: vi.fn() }))
vi.mock('@/services/api', () => ({ default: { post: mocks.post } }))
vi.mock('@/utils/message', () => ({ showMessage: mocks.message }))
const cleanup: (() => void)[] = []
const setup = (content = '<p>Before <strong>original</strong> after</p><p>Signature</p>') => {
  const editor = new Editor({
    extensions: createMailEditorExtensions(),
    content,
    editorProps: { handleScrollToSelection: () => true }
  })
  if (editor.state.doc.firstChild?.type.name === 'paragraph')
    editor.commands.setTextSelection({ from: 8, to: 16 })
  const wrapper = mount(MailEditorAiResult, {
    props: { editor },
    attachTo: document.body,
    global: {
      plugins: [createI18n({ legacy: false, locale: 'zh-CN', messages: { 'zh-CN': zhCN } })]
    }
  })
  cleanup.push(() => {
    wrapper.unmount()
    editor.destroy()
  })
  return { editor, wrapper, start: (wrapper.vm as any).start }
}
const button = (wrapper: ReturnType<typeof mount>, text: string) =>
  wrapper.findAll('button').find((b) => b.text() === text)!
const pending = () => {
  let resolve!: (value: any) => void
  const promise = new Promise((r) => {
    resolve = r
  })
  return { promise, resolve }
}
afterEach(() => {
  cleanup.splice(0).forEach((fn) => fn())
  vi.resetAllMocks()
})

describe('right-click AI preview', () => {
  it('previews only the selection, then replaces its original range after the cursor moves; undo restores formatting', async () => {
    mocks.post.mockResolvedValue({ code: 0, data: { content: 'improved', subject: 'ignored' } })
    const { editor, wrapper, start } = setup()
    const original = editor.getHTML()
    await start('polish')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledWith(
      '/ai/polish-email',
      { content: 'original' },
      expect.anything()
    )
    expect(editor.getHTML()).toBe(original)
    expect(wrapper.text()).toContain('improved')
    editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    await button(wrapper, '使用内容').trigger('click')
    expect(editor.getText()).toBe('Before improved after\n\nSignature')
    expect(wrapper.find('section').exists()).toBe(false)
    editor.commands.undo()
    expect(editor.getHTML()).toBe(original)
  })

  it('translates the whole body without a selection and inserts below while keeping the original HTML', async () => {
    mocks.post.mockResolvedValue({
      code: 0,
      data: { content: '<script>alert(1)</script>\nTranslation\n\nRegards' }
    })
    const { editor, wrapper, start } = setup()
    editor.commands.setTextSelection(1)
    await start('translate', 'en')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledWith(
      '/ai/translate-email',
      { content: 'Before original after\nSignature', target_language: 'en' },
      expect.anything()
    )
    await button(wrapper, '在下方插入').trigger('click')
    expect(editor.getHTML()).toContain('<strong>original</strong>')
    expect(editor.getHTML()).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(editor.getText()).toMatch(
      /Signature\n\n<script>alert\(1\)<\/script>\nTranslation\n\nRegards$/
    )
  })

  it('ignores an older translation after changing the target language', async () => {
    const first = pending(),
      second = pending()
    mocks.post.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { wrapper, start } = setup()
    await start('translate', 'en')
    expect(wrapper.text()).toContain('正在翻译原文')
    await wrapper.get('select').setValue('ja')
    expect(mocks.post.mock.calls[0][2].signal.aborted).toBe(true)
    second.resolve({ code: 0, data: { content: '新しい翻訳' } })
    await flushPromises()
    first.resolve({ code: 0, data: { content: 'Obsolete translation' } })
    await flushPromises()
    expect(wrapper.text()).toContain('新しい翻訳')
    expect(wrapper.text()).not.toContain('Obsolete')
    expect(mocks.post.mock.calls[1][1].target_language).toBe('ja')
  })

  it.each(['edit', 'close', 'draft'])('discards pending results after %s', async (mode) => {
    const response = pending()
    mocks.post.mockReturnValue(response.promise)
    const { editor, wrapper, start } = setup()
    await start('polish')
    if (mode === 'edit') editor.commands.insertContent('Changed')
    else if (mode === 'draft')
      editor.commands.setContent('<p>Another draft</p>', { emitUpdate: false })
    else await wrapper.get('button[aria-label="关闭"]').trigger('click')
    const html = editor.getHTML()
    response.resolve({ code: 0, data: { content: 'Stale content' } })
    await flushPromises()
    expect(wrapper.find('section').exists()).toBe(false)
    expect(editor.getHTML()).toBe(html)
    expect(mocks.post.mock.calls[0][2].signal.aborted).toBe(true)
    expect(wrapper.emitted('busy')?.slice(-1)[0]).toEqual([false])
  })

  it('offers retry after a failure and can further improve the preview', async () => {
    mocks.post
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ code: 0, data: { content: 'First preview' } })
      .mockResolvedValueOnce({ code: 0, data: { content: 'Better preview' } })
    const { editor, wrapper, start } = setup()
    await start('polish')
    await flushPromises()
    expect(wrapper.text()).toContain('处理失败，请重试')
    await button(wrapper, '重试').trigger('click')
    await flushPromises()
    await button(wrapper, '优化内容').trigger('click')
    await flushPromises()
    expect(mocks.post.mock.calls[2][1].content).toBe('First preview')
    expect(wrapper.text()).toContain('Better preview')
    expect(editor.getText()).toContain('original')
  })

  it('replaces only one table cell and refuses multi-cell selection or stale document replacement', () => {
    const { editor } = setup('<table><tr><td><p>A1</p></td><td><p>A2</p></td></tr></table>')
    const cells: number[] = []
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'tableCell') cells.push(pos)
    })
    editor.commands.setCellSelection({ anchorCell: cells[0] })
    const target = getMailAiTarget(editor)!
    expect(target.text).toBe('A1')
    expect(applyMailAiResult(editor, target, 'Improved cell')).toBe(true)
    expect(editor.view.dom.querySelectorAll('td')).toHaveLength(2)
    expect(editor.view.dom.querySelectorAll('td')[1].textContent).toBe('A2')
    expect(applyMailAiResult(editor, target, 'Stale result')).toBe(false)
    const nextCells: number[] = []
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'tableCell') nextCells.push(pos)
    })
    editor.commands.setCellSelection({ anchorCell: nextCells[0], headCell: nextCells[1] })
    expect(getMailAiTarget(editor)).toBeNull()
  })
})
