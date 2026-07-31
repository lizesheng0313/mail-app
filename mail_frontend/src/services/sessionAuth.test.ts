import { describe, expect, it } from 'vitest'
import { classifySessionError, getSessionErrorCode } from './sessionAuth'

describe('session authentication errors', () => {
  it('reads the stable error code from FastAPI detail payloads', () => {
    expect(getSessionErrorCode({ detail: { error_code: 'SESSION_REPLACED' } })).toBe('SESSION_REPLACED')
    expect(getSessionErrorCode({ error_code: 'SESSION_EXPIRED' })).toBe('SESSION_EXPIRED')
  })

  it('classifies replaced and expired sessions separately', () => {
    expect(classifySessionError({ detail: { error_code: 'SESSION_REPLACED' } })).toBe('replaced')
    expect(classifySessionError({ detail: { error_code: 'SESSION_EXPIRED' } })).toBe('expired')
    expect(classifySessionError({ detail: { error_code: 'ACCOUNT_DISABLED' } })).toBe('disabled')
    expect(classifySessionError({ detail: { error_code: 'OTHER' } })).toBe('other')
  })
})
