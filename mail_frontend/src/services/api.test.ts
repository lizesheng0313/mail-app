import { describe, expect, it } from 'vitest'
import { shouldSuppressErrorMessage } from './api'

describe('API error message suppression', () => {
  it('treats boolean suppressErrorMessage as silent', () => {
    expect(shouldSuppressErrorMessage({ suppressErrorMessage: true })).toBe(true)
  })
})
