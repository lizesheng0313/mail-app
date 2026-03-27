export type AIUiAction = {
  type?: string
  target?: string
  mailbox_type?: string
}

export const AI_UI_ACTION_EVENT = 'ai-ui-actions'

export const dispatchAIUiActions = (actions: AIUiAction[] | undefined | null) => {
  if (!Array.isArray(actions) || actions.length === 0 || typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent(AI_UI_ACTION_EVENT, {
      detail: { actions }
    })
  )
}
