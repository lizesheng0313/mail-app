interface EditorBounds {
  left: number
  top: number
  bottom: number
  width: number
}

interface CaretBounds {
  top: number
  bottom: number
}

/** Keep the horizontal rails on the editor; only the caret's Y affects placement. */
export const getMailAiPanelPosition = (
  editor: EditorBounds,
  caret: CaretBounds,
  panelHeight: number,
  screen: { width: number; height: number }
) => {
  const edge = 8
  const gap = 8
  const left = Math.max(edge, editor.left + 12)
  const width = Math.max(0, Math.min(editor.width - 24, screen.width - edge - left))
  const topLimit = Math.max(edge, editor.top)
  const bottomLimit = Math.min(screen.height - edge, editor.bottom)
  const below = Math.max(0, bottomLimit - caret.bottom - gap)
  const above = Math.max(0, caret.top - gap - topLimit)
  const cap = Math.max(0, Math.min(360, screen.height * 0.45))
  const desired = Math.min(cap, panelHeight)
  const upwards = below < desired && above > below
  const maxHeight = Math.min(cap, upwards ? above : below)
  const top = upwards ? caret.top - gap - Math.min(desired, maxHeight) : caret.bottom + gap
  return {
    placement: upwards ? 'above' : 'below',
    style: {
      left: `${left}px`,
      width: `${width}px`,
      top: `${Math.max(topLimit, top)}px`,
      height: `${Math.min(desired, maxHeight)}px`,
      maxHeight: `${maxHeight}px`,
      visibility:
        width && maxHeight && caret.bottom >= topLimit && caret.top <= bottomLimit
          ? ('visible' as const)
          : ('hidden' as const)
    }
  }
}
