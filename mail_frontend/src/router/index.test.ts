import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  isAuthenticated: false,
  user: null as { id: number } | null,
  checkAuth: vi.fn()
}))

vi.mock('@/stores/user', () => ({ useUserStore: () => auth }))

import router from './index'

beforeEach(async () => {
  auth.isAuthenticated = false
  auth.user = null
  auth.checkAuth.mockClear()
  await router.replace('/')
})

describe('mailbox entry routes', () => {
  it('keeps the temporary mailbox public for guests', async () => {
    expect(router.currentRoute.value.path).toBe('/')
    expect(router.currentRoute.value.meta.mailboxType).toBe('system')
    expect(router.currentRoute.value.meta.requiresAuth).not.toBe(true)

    await router.push('/user/mailboxes/system')
    expect(router.currentRoute.value.path).toBe('/')

    await router.push('/?mailbox=system')
    expect(router.currentRoute.value.fullPath).toBe('/')
  })

  it.each(['hosted', 'external'])('asks guests to log in for %s, then returns to that mailbox', async (type) => {
    await router.push(`/user/mailboxes/${type}`)
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe(`/user/mailboxes/${type}`)

    auth.isAuthenticated = true
    auth.user = { id: 1 }
    await router.push(String(router.currentRoute.value.query.redirect))
    expect(router.currentRoute.value.path).toBe(`/user/mailboxes/${type}`)
  })

  it.each(['hosted', 'external'])('preserves old %s mailbox links through login', async (type) => {
    await router.push(`/?mailbox=${type}`)
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe(`/user/mailboxes/${type}`)
  })
})
