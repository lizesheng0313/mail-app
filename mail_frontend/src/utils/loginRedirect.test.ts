import { beforeEach, describe, expect, it } from 'vitest'
import { rememberLoginRedirect, takeLoginRedirect } from './loginRedirect'

beforeEach(() => sessionStorage.clear())

describe('OAuth login return path', () => {
  it('keeps a mailbox path for one successful return', () => {
    rememberLoginRedirect('/user/mailboxes/external?tab=inbox')
    expect(takeLoginRedirect()).toBe('/user/mailboxes/external?tab=inbox')
    expect(takeLoginRedirect()).toBeNull()
  })

  it('drops an old return path when login starts without one', () => {
    rememberLoginRedirect('/user/mailboxes/hosted')
    rememberLoginRedirect(undefined)
    expect(takeLoginRedirect()).toBeNull()
  })

  it('does not follow an external or protocol-relative URL', () => {
    rememberLoginRedirect('//example.com/path')
    expect(takeLoginRedirect()).toBeNull()
    rememberLoginRedirect('https://example.com/path')
    expect(takeLoginRedirect()).toBeNull()
  })
})
