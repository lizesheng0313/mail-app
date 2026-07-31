export type SessionErrorKind = 'replaced' | 'expired' | 'disabled' | 'loggedOut' | 'other'

export const getSessionErrorCode = (payload: any): string => {
  const code = payload?.detail?.error_code || payload?.error_code || payload?.data?.error_code
  return typeof code === 'string' ? code : ''
}

export const classifySessionError = (payload: any): SessionErrorKind => {
  switch (getSessionErrorCode(payload)) {
    case 'SESSION_REPLACED':
      return 'replaced'
    case 'SESSION_EXPIRED':
      return 'expired'
    case 'SESSION_LOGOUT':
      return 'loggedOut'
    case 'ACCOUNT_DISABLED':
      return 'disabled'
    default:
      return 'other'
  }
}
