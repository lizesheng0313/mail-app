export const AI_UI_SYNC_EVENT = 'ai-ui-sync'

export type AIToolTraceItem = {
  name?: string
  arguments?: Record<string, any>
  result?: Record<string, any>
  needs_confirmation?: boolean
}

export type AIUiSyncPayload = {
  tool?: AIToolTraceItem | null
  toolTrace?: AIToolTraceItem[] | null
  uiActions?: Array<Record<string, any>> | null
}

export const normalizeAIToolTrace = (payload?: AIUiSyncPayload | null): AIToolTraceItem[] => {
  if (!payload) {
    return []
  }
  const trace = Array.isArray(payload.toolTrace)
    ? payload.toolTrace
    : payload.tool
      ? [payload.tool]
      : []

  return trace.filter((item) => item && typeof item === 'object' && item.name)
}

export const dispatchAIUiSync = (payload?: AIUiSyncPayload | null) => {
  if (typeof window === 'undefined' || !payload) {
    return
  }

  const toolTrace = normalizeAIToolTrace(payload)
  const uiActions = Array.isArray(payload.uiActions) ? payload.uiActions : []
  if (!toolTrace.length && !uiActions.length) {
    return
  }

  window.dispatchEvent(
    new CustomEvent(AI_UI_SYNC_EVENT, {
      detail: {
        tool: payload.tool || null,
        toolTrace,
        uiActions
      }
    })
  )
}

const normalizeIdList = (value: unknown) =>
  Array.from(
    new Set(
      (Array.isArray(value) ? value : [value])
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0)
    )
  )

export const extractToolIds = (
  item: AIToolTraceItem | undefined,
  singularKey: string,
  pluralKey: string
) => {
  const resultIds = normalizeIdList(item?.result?.[pluralKey] ?? item?.result?.[singularKey])
  if (resultIds.length) {
    return resultIds
  }
  return normalizeIdList(item?.arguments?.[pluralKey] ?? item?.arguments?.[singularKey])
}

export const extractMailboxType = (item: AIToolTraceItem | undefined) => {
  const mailboxType = String(
    item?.result?.mailbox_type ||
      item?.arguments?.mailbox_type ||
      item?.arguments?.type ||
      'system'
  ).toLowerCase()
  return mailboxType === 'external' ? 'external' : 'system'
}
