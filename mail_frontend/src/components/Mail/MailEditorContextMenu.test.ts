import { flushPromises, mount } from '@vue/test-utils'
import { Editor } from '@tiptap/vue-3'
import { createI18n } from 'vue-i18n'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMailEditorExtensions } from '@/utils/mailEditor'
import zhCN from '@/i18n/messages/zh-CN'
import MailEditorContextMenu from './MailEditorContextMenu.vue'
import { showMessage } from '@/utils/message'

vi.mock('@/utils/message', () => ({ showMessage: vi.fn() }))

const cleanup: (() => void)[] = []
const setup = () => {
  const element = document.createElement('div')
  document.body.append(element)
  const editor = new Editor({
    element,
    extensions: createMailEditorExtensions(),
    content:
      '<table><tr><td><p>A1</p></td><td><p>A2</p></td></tr><tr><td><p>B1</p></td><td><p>B2</p></td></tr></table><p>Outside</p>',
    editorProps: {
      handleScrollToSelection: () => true,
      // jsdom cannot place a native pointer; test the custom selection and context event instead.
      handleDOMEvents: { mousedown: (_view, event) => event.button === 2 }
    }
  })
  vi.spyOn(editor.view, 'posAtCoords').mockReturnValue(null)
  editor.commands.setTextSelection(editor.state.doc.content.size - 1)
  const wrapper = mount(MailEditorContextMenu, {
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
  vi.restoreAllMocks()
})
const tick = async () => {
  await flushPromises()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  await flushPromises()
}
const menu = () => document.querySelector<HTMLElement>('[role="menu"]')
const item = (label: string) =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')).find(
    (button) =>
      button.textContent?.trim() === label ||
      button.querySelector('span')?.textContent?.trim() === label
  )!
const rightClick = async (cell: Element, x = 100, y = 100) => {
  const down = new MouseEvent('mousedown', { button: 2, bubbles: true, cancelable: true })
  cell.dispatchEvent(down)
  const context = new MouseEvent('contextmenu', {
    button: 2,
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y
  })
  cell.dispatchEvent(context)
  await tick()
  return { down, context }
}
const cellPositions = (editor: Editor) => {
  const cells: number[] = []
  editor.state.doc.descendants((node, pos) => {
    if (['tableCell', 'tableHeader'].includes(node.type.name)) cells.push(pos)
  })
  return cells
}

describe('mail table context menu', () => {
  it('shows a keyboard shortcut when clipboard access is unavailable', async () => {
    const { editor } = setup()
    await rightClick(editor.view.dom.lastElementChild!)
    item('粘贴').click()
    await tick()
    expect(showMessage).toHaveBeenCalledWith(expect.stringContaining('Ctrl+V'), 'info')
  })
  it.each([
    ['上方插入行', 3, 2],
    ['下方插入行', 3, 2],
    ['删除当前行', 1, 2],
    ['左侧插入列', 2, 3],
    ['右侧插入列', 2, 3],
    ['删除当前列', 2, 1]
  ])(
    'applies %s to the right-clicked cell rather than the previous cursor position',
    async (label, rows, cols) => {
      const { editor } = setup()
      const { context } = await rightClick(editor.view.dom.querySelectorAll('td')[2])
      expect(context.defaultPrevented).toBe(true)
      expect(menu()).not.toBeNull()
      expect(item(String(label)).disabled).toBe(false)
      item(String(label)).click()
      await tick()
      const resultRows = editor.view.dom.querySelectorAll('tr')
      expect(resultRows).toHaveLength(Number(rows))
      expect(resultRows[0].children).toHaveLength(Number(cols))
      expect(menu()).toBeNull()
      expect(editor.view.dom.lastElementChild?.textContent).toBe('Outside')
      if (label === '下方插入行') expect(resultRows[2].textContent).toBe('')
      if (label === '删除当前行') expect(resultRows[0].textContent).toBe('A1A2')
      if (label === '删除当前列') expect(resultRows[0].textContent).toBe('A2')
    }
  )

  it('preserves a multi-cell selection on right mouse down and merges/splits through the menu', async () => {
    const { editor } = setup()
    const positions = cellPositions(editor)
    editor.commands.setCellSelection({ anchorCell: positions[0], headCell: positions[1] })
    const selection = editor.state.selection.toJSON()
    const { down } = await rightClick(editor.view.dom.querySelectorAll('td')[1])
    expect(down.defaultPrevented).toBe(true)
    expect(editor.state.selection.toJSON()).toEqual(selection)
    expect(item('合并单元格').disabled).toBe(false)
    item('合并单元格').click()
    await tick()
    const merged = editor.view.dom.querySelector('td[colspan="2"]')!
    expect(merged.textContent).toBe('A1A2')
    await rightClick(merged)
    expect(item('拆分单元格').disabled).toBe(false)
    item('拆分单元格').click()
    await tick()
    expect(editor.view.dom.querySelectorAll('td')).toHaveLength(4)
    expect(editor.getHTML()).not.toContain('colspan="2"')
  })

  it('opens AI from ordinary text and preserves its selected range', async () => {
    const { editor, wrapper } = setup()
    const end = editor.state.doc.content.size - 1
    editor.commands.setTextSelection({ from: end - 7, to: end })
    vi.mocked(editor.view.posAtCoords).mockReturnValue({ pos: end - 3, inside: -1 })
    const selection = editor.state.selection.toJSON()
    const html = editor.getHTML()
    await rightClick(editor.view.dom.lastElementChild!)
    expect(editor.state.selection.toJSON()).toEqual(selection)
    expect(menu()?.getAttribute('aria-label')).toBe('正文')
    item('智能润色').click()
    await tick()
    expect(wrapper.emitted('ai')).toEqual([['polish', undefined]])
    expect(menu()).toBeNull()
    expect(editor.getHTML()).toBe(html)
  })

  it('selects a translation language from the right-click menu without a generic AI entry', async () => {
    const { editor, wrapper } = setup()
    await rightClick(editor.view.dom.lastElementChild!)
    expect(menu()?.textContent).not.toContain('AI 辅助')
    item('智能翻译').click()
    await tick()
    item('English').click()
    await tick()
    expect(wrapper.emitted('ai')).toEqual([['translate', 'en']])
    expect(menu()).toBeNull()
  })

  it('disables AI for an empty draft and a multi-cell selection', async () => {
    const { editor } = setup()
    const positions = cellPositions(editor)
    editor.commands.setCellSelection({ anchorCell: positions[0], headCell: positions[1] })
    await rightClick(editor.view.dom.querySelector('td')!)
    expect(item('智能润色').disabled).toBe(true)
    editor.commands.setContent('<p></p>')
    await rightClick(editor.view.dom.lastElementChild!)
    expect(item('智能润色').disabled).toBe(true)
    expect(item('智能翻译').disabled).toBe(true)
  })

  it('moves the selection when right-clicking an unselected cell and disables merging', async () => {
    const { editor } = setup()
    const positions = cellPositions(editor)
    editor.commands.setCellSelection({ anchorCell: positions[0], headCell: positions[1] })
    await rightClick(editor.view.dom.querySelectorAll('td')[3])
    expect(editor.view.dom.querySelectorAll('.selectedCell')).toHaveLength(1)
    expect(item('合并单元格').disabled).toBe(true)
    expect(item('拆分单元格').disabled).toBe(true)
    expect(item('删除表格').disabled).toBe(false)
  })

  it('opens the ordinary editor menu and leaves native editing available when disabled', async () => {
    const { editor, wrapper } = setup()
    expect((await rightClick(editor.view.dom.lastElementChild!)).context.defaultPrevented).toBe(
      true
    )
    expect(menu()?.getAttribute('aria-label')).toBe('正文')
    expect(item('智能润色').disabled).toBe(false)
    await rightClick(editor.view.dom.querySelector('td')!)
    await wrapper.setProps({ disabled: true })
    expect(menu()).toBeNull()
    expect((await rightClick(editor.view.dom.querySelector('td')!)).context.defaultPrevented).toBe(
      false
    )
    await wrapper.setProps({ disabled: false })
    editor.setEditable(false)
    expect((await rightClick(editor.view.dom.querySelector('td')!)).context.defaultPrevented).toBe(
      false
    )
    expect(menu()).toBeNull()
  })

  it('supports the context menu key, keyboard navigation and Escape without leaking the key event', async () => {
    const { editor } = setup()
    editor.commands.setTextSelection(cellPositions(editor)[0] + 2)
    editor.view.dom.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true, cancelable: true })
    )
    await tick()
    expect(menu()).not.toBeNull()
    expect(document.activeElement).toBe(item('上方插入行'))
    item('上方插入行').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true })
    )
    expect(document.activeElement).toBe(item('智能翻译'))
    const bubbleListener = vi.fn()
    document.addEventListener('keydown', bubbleListener)
    try {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      )
      await tick()
      expect(menu()).toBeNull()
      expect(document.activeElement).toBe(editor.view.dom)
      expect(bubbleListener).not.toHaveBeenCalled()
    } finally {
      document.removeEventListener('keydown', bubbleListener)
    }
  })

  it('dismisses on outside click, scrolling, resizing and document changes', async () => {
    const { editor } = setup()
    const openAgain = () => rightClick(editor.view.dom.querySelector('td')!)
    await openAgain()
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    await tick()
    expect(menu()).toBeNull()
    await openAgain()
    document.dispatchEvent(new Event('scroll'))
    await tick()
    expect(menu()).toBeNull()
    await openAgain()
    window.dispatchEvent(new Event('resize'))
    await tick()
    expect(menu()).toBeNull()
    await openAgain()
    editor.commands.setContent('<p>New draft</p>', { emitUpdate: false })
    await tick()
    expect(menu()).toBeNull()
  })

  it('keeps the menu within the viewport near its lower-right corner', async () => {
    const { editor } = setup()
    const original = HTMLElement.prototype.getBoundingClientRect
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      return this.getAttribute('role') === 'menu'
        ? new DOMRect(0, 0, 192, 360)
        : original.call(this)
    })
    await rightClick(
      editor.view.dom.querySelector('td')!,
      window.innerWidth - 1,
      window.innerHeight - 1
    )
    expect(menu()!.style.left).toBe(`${window.innerWidth - 200}px`)
    expect(menu()!.style.top).toBe(`${window.innerHeight - 368}px`)
  })
})
