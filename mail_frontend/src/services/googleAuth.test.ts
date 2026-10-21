import { webcrypto } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getGoogleLoginUrl: vi.fn() }))
vi.mock('@/api/auth', () => ({ default: mocks }))
import { beginGoogleAuth, clearGoogleAuth, googleAuthProof } from './googleAuth'

beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto)
  sessionStorage.clear()
  mocks.getGoogleLoginUrl.mockResolvedValue({ code: 0, data: { state: 's'.repeat(43), auth_url: 'https://accounts.google.com/auth' } })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('Google authorization client proof', () => {
  it('sends only a digest and keeps the verifier in the initiating client until completion', async () => {
    await beginGoogleAuth({ is_desktop: true })
    const proof = googleAuthProof('t'.repeat(43), 's'.repeat(43))
    expect(proof.client_verifier).toMatch(/^[A-Za-z0-9_-]{43}$/)
    const params = mocks.getGoogleLoginUrl.mock.calls[0][0]
    const hash = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(proof.client_verifier))
    expect(params).toEqual({ is_desktop: true, client_challenge: Buffer.from(hash).toString('base64url') })
    expect(JSON.stringify(params)).not.toContain(proof.client_verifier)
    clearGoogleAuth('s'.repeat(43))
    expect(() => googleAuthProof('t'.repeat(43), 's'.repeat(43))).toThrow()
  })

  it('rejects callbacks from another client, expired flows, and legacy identity URLs', () => {
    expect(() => googleAuthProof('t'.repeat(43), 's'.repeat(43))).toThrow()
    sessionStorage.setItem('google-oauth:' + 's'.repeat(43), JSON.stringify({ verifier: 'v'.repeat(43), createdAt: Date.now() - 601_000 }))
    expect(() => googleAuthProof('t'.repeat(43), 's'.repeat(43))).toThrow()
    expect(() => googleAuthProof(undefined, undefined)).toThrow()
    expect(() => googleAuthProof(['t'.repeat(43)], 's'.repeat(43))).toThrow()
  })
})
