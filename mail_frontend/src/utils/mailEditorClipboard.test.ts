import { Editor } from '@tiptap/vue-3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMailEditorExtensions } from './mailEditor'
import { editMailClipboard } from './mailEditorClipboard'

const editors: Editor[] = []
const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
const execDescriptor = Object.getOwnPropertyDescriptor(document, 'execCommand')
const setup = () => {
  const editor = new Editor({
    extensions: createMailEditorExtensions(),
    content: '<p><strong>Hello</strong> world</p>',
    editorProps: { handleScrollToSelection: () => true }
  })
  editors.push(editor)
  editor.commands.setTextSelection({ from: 1, to: 6 })
  return editor
}
const setClipboard = (clipboard: object) =>
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard })
const blobText = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsText(blob)
  })
beforeEach(() => {
  vi.stubGlobal(
    'ClipboardItem',
    class {
      constructor(public data: Record<string, Blob>) {}
    }
  )
  vi.stubGlobal('ClipboardEvent', class extends Event {})
})
afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy())
  if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor)
  else Reflect.deleteProperty(navigator, 'clipboard')
  if (execDescriptor) Object.defineProperty(document, 'execCommand', execDescriptor)
  else Reflect.deleteProperty(document, 'execCommand')
  vi.unstubAllGlobals()
})

describe('editor context clipboard commands', () => {
  it('uses native editing commands when available', async () => {
    const editor = setup()
    const exec = vi.fn().mockReturnValue(true)
    const write = vi.fn()
    Object.defineProperty(document, 'execCommand', { configurable: true, value: exec })
    setClipboard({ write })
    await editMailClipboard(editor, 'copy')
    expect(exec).toHaveBeenCalledWith('copy')
    expect(write).not.toHaveBeenCalled()
  })

  it('copies only the selected rich text and cuts it with undo support', async () => {
    const editor = setup()
    const write = vi.fn().mockResolvedValue(undefined)
    setClipboard({ write })
    await editMailClipboard(editor, 'cut')
    const payload = write.mock.calls[0][0][0].data
    expect(await blobText(payload['text/html'])).toContain('<strong>Hello</strong>')
    expect(await blobText(payload['text/plain'])).toBe('Hello')
    expect(editor.getText()).toBe(' world')
    editor.commands.undo()
    expect(editor.getText()).toBe('Hello world')
  })

  it('falls back to plain text copying when rich clipboard writing is unavailable', async () => {
    const editor = setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })
    await editMailClipboard(editor, 'copy')
    expect(writeText).toHaveBeenCalledWith('Hello')
    expect(editor.getText()).toBe('Hello world')
  })

  it('pastes sanitized HTML while retaining bold text and tables', async () => {
    const editor = setup()
    setClipboard({
      read: vi
        .fn()
        .mockResolvedValue([
          {
            types: ['text/html'],
            getType: async () => ({
              text: async () =>
                '<p><strong>New</strong></p><script>alert(1)</script><table><tr><td onclick="bad()">A</td><td>B</td></tr></table>'
            })
          }
        ])
    })
    await editMailClipboard(editor, 'paste')
    expect(editor.getHTML()).toContain('<strong>New</strong>')
    expect(editor.getHTML()).toContain('<table')
    expect(editor.getHTML()).not.toMatch(/<script|onclick|alert/)
  })

  it('pastes plain text with line breaks when HTML clipboard access is unavailable', async () => {
    const editor = setup()
    setClipboard({ readText: vi.fn().mockResolvedValue('Line one\nLine two') })
    await editMailClipboard(editor, 'paste')
    expect(editor.getText()).toContain('Line one')
    expect(editor.getText()).toContain('Line two')
    expect(editor.getHTML()).not.toContain('Hello')
  })

  it('does not delete or paste into a draft changed during an asynchronous clipboard operation', async () => {
    const editor = setup()
    let finish!: () => void
    setClipboard({
      writeText: () =>
        new Promise<void>((resolve) => {
          finish = resolve
        })
    })
    const pending = editMailClipboard(editor, 'cut')
    editor.commands.setContent('<p>Another draft</p>', { emitUpdate: false })
    finish()
    await pending
    expect(editor.getText()).toBe('Another draft')
  })
})
