const LOGIN_REDIRECT_KEY = 'login_return_path'

const safeLocalPath = (value: unknown): string | null =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
    ? value
    : null

export const rememberLoginRedirect = (value: unknown): void => {
  try {
    const path = safeLocalPath(value)
    if (path) sessionStorage.setItem(LOGIN_REDIRECT_KEY, path)
    else sessionStorage.removeItem(LOGIN_REDIRECT_KEY)
  } catch {
    // OAuth login still works when storage is unavailable.
  }
}

export const takeLoginRedirect = (): string | null => {
  try {
    const path = sessionStorage.getItem(LOGIN_REDIRECT_KEY)
    sessionStorage.removeItem(LOGIN_REDIRECT_KEY)
    return safeLocalPath(path)
  } catch {
    return null
  }
}
