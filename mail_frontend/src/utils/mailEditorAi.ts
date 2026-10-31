import type { Editor } from '@tiptap/vue-3'

export type MailAiAction = 'polish' | 'translate'
export interface MailAiTarget {
  doc: Editor['state']['doc']
  from: number
  to: number
  insertAt: number
  text: string
}

/** Capture the original range so moving the cursor cannot change what AI replaces. */
export const getMailAiTarget = (editor: Editor): MailAiTarget | null => {
  const { doc, selection } = editor.state
  let { from, to } = selection
  const json = selection.toJSON()
  if (json.type === 'cell') {
    // A single cell can be rewritten without changing its surrounding table.
    if (json.anchor !== json.head) return null
    const cell = doc.nodeAt(json.anchor)
    if (!cell) return null
    from = json.anchor + 1
    to = json.anchor + cell.nodeSize - 1
  } else if (selection.empty) {
    from = 0
    to = doc.content.size
  }
  const text = doc.textBetween(from, to, '\n').trim()
  if (!text) return null
  let insertAt = to
  if (to < doc.content.size) {
    const end = doc.resolve(to)
    for (let depth = end.depth; depth > 0; depth--) {
      if (end.node(depth).isTextblock) {
        insertAt = end.after(depth)
        break
      }
    }
  }
  return { doc, from, to, insertAt, text }
}

/** AI returns plain text. Never interpret its output as HTML. */
export const applyMailAiResult = (
  editor: Editor,
  target: MailAiTarget,
  text: string,
  insert = false
) => {
  if (editor.isDestroyed || !editor.isEditable || !editor.state.doc.eq(target.doc)) return false
  const normalized = text.replace(/\r\n?/g, '\n')
  const inline =
    !insert &&
    !normalized.includes('\n') &&
    target.doc.resolve(target.from).sameParent(target.doc.resolve(target.to)) &&
    target.doc.resolve(target.from).parent.inlineContent
  const content = inline
    ? [{ type: 'text', text: normalized }]
    : normalized.split(/\n{2,}/).map((block) => ({
        type: 'paragraph',
        content: block
          .split('\n')
          .flatMap((line, index) => [
            ...(index ? [{ type: 'hardBreak' }] : []),
            ...(line ? [{ type: 'text', text: line }] : [])
          ])
      }))
  return editor
    .chain()
    .focus()
    .insertContentAt(insert ? target.insertAt : { from: target.from, to: target.to }, content)
    .run()
}
