import type { Editor } from '@tiptap/vue-3'
import { sanitizeEmailHtml } from './emailHtml'

export type MailClipboardAction = 'cut' | 'copy' | 'paste'

/** Use native editing first, then the browser clipboard without dropping rich formatting. */
export const editMailClipboard = async (editor: Editor, action: MailClipboardAction) => {
  editor.view.focus()
  try {
    if (document.execCommand?.(action)) return
  } catch {
    /* Fall back to clipboard APIs when the native command is unavailable. */
  }
  const doc = editor.state.doc
  const selection = editor.state.selection
  const stillCurrent = () =>
    !editor.isDestroyed &&
    editor.isEditable &&
    editor.state.doc === doc &&
    editor.state.selection.eq(selection)
  if (action !== 'paste') {
    const { dom, text } = editor.view.serializeForClipboard(selection.content())
    let copied = false
    if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([String(sanitizeEmailHtml(dom.innerHTML))], {
              type: 'text/html'
            }),
            'text/plain': new Blob([text], { type: 'text/plain' })
          })
        ])
        copied = true
      } catch {
        /* Some webviews support plain text clipboard access only. */
      }
    }
    if (!copied) await navigator.clipboard.writeText(text)
    if (action === 'cut' && stillCurrent()) editor.commands.deleteSelection()
    return
  }
  let html = ''
  let text = ''
  if (navigator.clipboard?.read) {
    const items = await navigator.clipboard.read()
    for (const item of items) {
      if (item.types.includes('text/html')) {
        html = await (await item.getType('text/html')).text()
        break
      }
      if (item.types.includes('text/plain')) text = await (await item.getType('text/plain')).text()
    }
  } else text = await navigator.clipboard.readText()
  if (!stillCurrent()) return
  editor.view.focus()
  if (html) editor.view.pasteHTML(String(sanitizeEmailHtml(html)))
  else if (text) editor.view.pasteText(text)
  else throw new Error('Clipboard contains no text or HTML')
}
