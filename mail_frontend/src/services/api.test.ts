import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ showMessage: vi.fn() }))
vi.mock('@/utils/message', () => ({ showMessage: mocks.showMessage }))
vi.mock('@/i18n', () => ({ getCurrentLocale: () => 'zh-CN', i18n: { global: { t: (key: string) => key } } }))

import { handleSessionUnauthorized, shouldSuppressErrorMessage } from './api'

describe('API error message suppression', () => {
  it('treats boolean suppressErrorMessage as silent', () => {
    expect(shouldSuppressErrorMessage({ suppressErrorMessage: true })).toBe(true)
  })
})

describe('session authorization failures', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    sessionStorage.clear()
    mocks.showMessage.mockClear()
    localStorage.setItem('token', 'current-token')
    localStorage.setItem('user', '{"id":1}')
    localStorage.setItem('isAuthenticated', 'true')
    vi.spyOn(globalThis, 'setTimeout')
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('clears the current login and preserves the session replacement reason', () => {
    handleSessionUnauthorized({ detail: { error_code: 'SESSION_REPLACED' } }, 'current-token')
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    expect(localStorage.getItem('isAuthenticated')).toBeNull()
    expect(sessionStorage.getItem('login_error_message')).toBe('common.sessionReplaced')
    expect(mocks.showMessage).toHaveBeenCalledWith('common.sessionReplaced', 'error')
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 500)
  })

  it.each(['old-token', ''])('preserves the current login when the failed connection used token %j', (token) => {
    handleSessionUnauthorized({ detail: { error_code: 'SESSION_REPLACED' } }, token)
    expect(localStorage.getItem('token')).toBe('current-token')
    expect(localStorage.getItem('user')).toBe('{"id":1}')
    expect(localStorage.getItem('isAuthenticated')).toBe('true')
    expect(sessionStorage.getItem('login_error_message')).toBeNull()
    expect(mocks.showMessage).not.toHaveBeenCalled()
    expect(setTimeout).not.toHaveBeenCalledWith(expect.any(Function), 500)
  })

  it('handles token expiry without an HTTP request', () => {
    handleSessionUnauthorized({ detail: 'Could not validate credentials' }, 'current-token')
    expect(localStorage.getItem('token')).toBeNull()
    expect(mocks.showMessage).toHaveBeenCalledWith('common.sessionExpired', 'error')
  })
})
