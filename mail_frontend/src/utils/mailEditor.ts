import { Extension } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { TextStyleKit } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import Image from '@tiptap/extension-image'
import { sanitizeEmailHtml } from './emailHtml'

const cellStyle = 'border:1px solid #cbd5e1;padding:6px 8px;vertical-align:top;'
const tableCellColors = Extension.create({
  name: 'mailTableCellColors',
  addGlobalAttributes() {
    return [
      {
        types: ['tableCell', 'tableHeader'],
        attributes: {
          backgroundColor: {
            default: null,
            parseHTML: (element) => element.style.backgroundColor || null,
            renderHTML: (attributes) =>
              attributes.backgroundColor
                ? { style: `background-color:${attributes.backgroundColor}` }
                : {}
          }
        }
      }
    ]
  }
})

export const createMailEditorExtensions = (placeholder = '') => [
  StarterKit.configure({
    link: { openOnClick: false, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }
  }),
  TextStyleKit,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Image.configure({ allowBase64: true, HTMLAttributes: { style: 'max-width:100%;height:auto;' } }),
  Table.configure({
    resizable: true,
    cellMinWidth: 60,
    HTMLAttributes: {
      style: 'border-collapse:collapse;width:100%;',
      border: '1',
      cellpadding: '6',
      cellspacing: '0'
    }
  }),
  TableRow,
  TableCell.configure({ HTMLAttributes: { style: cellStyle } }),
  TableHeader.configure({ HTMLAttributes: { style: `${cellStyle}font-weight:600;` } }),
  tableCellColors,
  Placeholder.configure({ placeholder })
]

export const mailHtmlToText = (html: string): string => {
  if (!html.trim()) return ''
  if (typeof DOMParser === 'undefined')
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const blocks = new Set([
    'P',
    'DIV',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'LI',
    'BLOCKQUOTE',
    'PRE',
    'TABLE'
  ])
  const text = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || ''
    if (!(node instanceof Element)) return Array.from(node.childNodes).map(text).join('')
    if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.tagName)) return ''
    if (node.tagName === 'BR') return '\n'
    if (node.tagName === 'IMG') return node.getAttribute('alt') || node.getAttribute('src') || ''
    if (node.tagName === 'TR')
      return (
        Array.from(node.children)
          .map((cell) => text(cell).trim())
          .join('\t') + '\n'
      )
    return Array.from(node.childNodes).map(text).join('') + (blocks.has(node.tagName) ? '\n' : '')
  }
  return text(doc.body)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Keep formatting inside the message; mail clients cannot load the editor's CSS. */
export const prepareMailHtml = (html: string): string => {
  const doc = new DOMParser().parseFromString(String(sanitizeEmailHtml(html)), 'text/html')
  doc.querySelectorAll('table').forEach((table) => {
    table.style.borderCollapse = 'collapse'
    table.style.maxWidth = '100%'
    if (!table.style.width) table.style.width = '100%'
    table.setAttribute('border', '1')
    table.setAttribute('cellpadding', '6')
    table.setAttribute('cellspacing', '0')
  })
  doc.querySelectorAll<HTMLElement>('td, th').forEach((cell) => {
    if (!cell.style.border) cell.style.border = '1px solid #cbd5e1'
    if (!cell.style.padding) cell.style.padding = '6px 8px'
    if (!cell.style.verticalAlign) cell.style.verticalAlign = 'top'
    if (cell.tagName === 'TH' && !cell.style.backgroundColor) cell.style.backgroundColor = '#f1f5f9'
  })
  doc.querySelectorAll<HTMLElement>('p').forEach((paragraph) => {
    if (!paragraph.style.margin) paragraph.style.margin = '0 0 8px'
  })
  doc.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
    image.style.maxWidth = '100%'
    image.style.height = 'auto'
  })
  return doc.body.innerHTML
}
