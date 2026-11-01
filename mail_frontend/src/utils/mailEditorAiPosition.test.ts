import { describe, expect, it } from 'vitest'
import { getMailAiPanelPosition } from './mailEditorAiPosition'

const editor = { left: 200, top: 120, bottom: 740, width: 800 }
const screen = { width: 1280, height: 800 }

describe('AI result vertical anchoring', () => {
  it('aligns both horizontal edges with the editor and follows the caret vertically', () => {
    const first = getMailAiPanelPosition(editor, { top: 240, bottom: 264 }, 180, screen)
    const second = getMailAiPanelPosition(editor, { top: 420, bottom: 444 }, 180, screen)
    expect(first.style).toMatchObject({
      left: '212px',
      width: '776px',
      top: '272px',
      height: '180px'
    })
    expect(second.style.top).toBe('452px')
    expect(second.style.left).toBe(first.style.left)
    expect(second.style.width).toBe(first.style.width)
  })

  it('flips above near the editor bottom without moving left or right', () => {
    const result = getMailAiPanelPosition(editor, { top: 680, bottom: 704 }, 180, screen)
    expect(result.placement).toBe('above')
    expect(result.style).toMatchObject({ top: '492px', left: '212px', width: '776px' })
  })

  it('limits long results to available space and keeps the caret uncovered', () => {
    const result = getMailAiPanelPosition(
      { ...editor, bottom: 500 },
      { top: 300, bottom: 324 },
      600,
      screen
    )
    expect(result.placement).toBe('above')
    expect(result.style).toMatchObject({ top: '120px', maxHeight: '172px', height: '172px' })
  })

  it('does not float over other sections when the caret scrolls outside the editor', () => {
    const result = getMailAiPanelPosition(editor, { top: 80, bottom: 100 }, 180, screen)
    expect(result.style.visibility).toBe('hidden')
  })

  it('clips the width to the window while preserving the editor left edge', () => {
    const result = getMailAiPanelPosition(editor, { top: 240, bottom: 264 }, 180, {
      ...screen,
      width: 900
    })
    expect(result.style.left).toBe('212px')
    expect(result.style.width).toBe('680px')
  })
})
