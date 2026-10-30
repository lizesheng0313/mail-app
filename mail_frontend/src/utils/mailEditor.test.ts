import { afterEach, describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/vue-3'
import { createMailEditorExtensions, mailHtmlToText, prepareMailHtml } from './mailEditor'

const editors: Editor[] = []
const createEditor = (content = '<p>Hello</p>') => {
  const editor = new Editor({ extensions: createMailEditorExtensions(), content })
  editors.push(editor)
  return editor
}
afterEach(() => editors.splice(0).forEach((editor) => editor.destroy()))
const cells = (editor: Editor) => {
  const result: number[] = []
  editor.state.doc.descendants((node, pos) => {
    if (['tableCell', 'tableHeader'].includes(node.type.name)) result.push(pos)
  })
  return result
}
const tableShape = (editor: Editor) => {
  const dom = new DOMParser().parseFromString(editor.getHTML(), 'text/html')
  return [dom.querySelectorAll('tr').length, dom.querySelector('tr')?.children.length]
}

describe('mail editor tables', () => {
  it('inserts tables and adds/removes rows and columns around the selected cell', () => {
    const editor = createEditor()
    editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true })
    expect(tableShape(editor)).toEqual([3, 3])
    editor.commands.setTextSelection(cells(editor)[4] + 2)
    expect(editor.commands.addRowBefore()).toBe(true)
    expect(editor.commands.addRowAfter()).toBe(true)
    expect(tableShape(editor)).toEqual([5, 3])
    expect(editor.commands.deleteRow()).toBe(true)
    expect(editor.commands.addColumnBefore()).toBe(true)
    expect(editor.commands.addColumnAfter()).toBe(true)
    expect(tableShape(editor)).toEqual([4, 5])
    expect(editor.commands.deleteColumn()).toBe(true)
    expect(tableShape(editor)).toEqual([4, 4])
    expect(editor.commands.deleteTable()).toBe(true)
    expect(editor.getHTML()).not.toContain('<table')
  })

  it('merges and splits selected cells and retains cell backgrounds in HTML', () => {
    const editor = createEditor()
    editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false })
    const positions = cells(editor)
    editor.commands.setCellSelection({ anchorCell: positions[0], headCell: positions[1] })
    expect(editor.commands.mergeCells()).toBe(true)
    expect(editor.getHTML()).toContain('colspan="2"')
    expect(editor.commands.setCellAttribute('backgroundColor', '#fef08a')).toBe(true)
    expect(editor.commands.splitCell()).toBe(true)
    expect(tableShape(editor)).toEqual([2, 2])
    editor.commands.toggleHeaderRow()
    expect(editor.getHTML()).toContain('<th')
    editor.commands.toggleHeaderColumn()
    const restored = createEditor(prepareMailHtml(editor.getHTML()))
    expect(restored.getHTML()).toContain('background-color: rgb(254, 240, 138)')
    expect(tableShape(restored)).toEqual([2, 2])
  })
})

describe('email HTML and text', () => {
  it('retains fonts, alignment, links, images and tables through a saved draft round trip', () => {
    const editor = createEditor(
      '<p style="text-align:center"><span style="font-family:Georgia;font-size:20px;color:#123456;background-color:#fef08a"><strong><u>Format</u></strong></span> <a href="https://example.test">Link</a></p><img src="https://example.test/picture.png" alt="Picture"><table><tr><td><p>A</p></td><td><p>B</p></td></tr></table>'
    )
    const outgoing = prepareMailHtml(editor.getHTML())
    const restored = createEditor(outgoing)
    const dom = new DOMParser().parseFromString(restored.getHTML(), 'text/html')
    expect(dom.querySelector('p')?.style.textAlign).toBe('center')
    expect(dom.querySelector('span')?.style.fontSize).toBe('20px')
    expect(dom.querySelector('span')?.style.fontFamily).toBe('Georgia')
    expect(dom.querySelector('strong u, u strong')).not.toBeNull()
    expect(dom.querySelector('a')?.getAttribute('href')).toBe('https://example.test/')
    expect(dom.querySelector('img')?.getAttribute('src')).toContain('picture.png')
    expect(dom.querySelector('td')?.style.border).toContain('1px solid')
    expect(dom.querySelector('table')?.style.borderCollapse).toBe('collapse')
    expect(mailHtmlToText(outgoing)).toContain('A\tB')
    expect(mailHtmlToText(outgoing)).toContain('Picture')
  })

  it('keeps paragraph, line and cell boundaries in the plain text alternative', () => {
    expect(
      mailHtmlToText(
        '<p>First<br>Next</p><p>Second</p><table><tr><th>Name</th><th>Count</th></tr><tr><td>A</td><td>2</td></tr></table>'
      )
    ).toBe('First\nNext\nSecond\nName\tCount\nA\t2')
    expect(mailHtmlToText('<p></p>')).toBe('')
  })

  it('removes unsafe source HTML and supplies inline formatting for email clients', () => {
    const html = prepareMailHtml(
      '<script>alert(1)</script><p onclick="alert(1)">Hello</p><a href="javascript:alert(1)">Bad</a><img src="x" onerror="alert(1)"><table><tr><th>Header</th><td>Value</td></tr></table>'
    )
    expect(html).not.toMatch(/<script|onclick|onerror|javascript:/)
    const dom = new DOMParser().parseFromString(html, 'text/html')
    expect(dom.querySelector('p')?.style.margin).toBe('0px 0px 8px')
    expect(dom.querySelector('th')?.style.backgroundColor).toBe('rgb(241, 245, 249)')
    expect(dom.querySelector('td')?.style.padding).toBe('6px 8px')
    expect(dom.querySelector('table')?.getAttribute('cellspacing')).toBe('0')
  })
})
