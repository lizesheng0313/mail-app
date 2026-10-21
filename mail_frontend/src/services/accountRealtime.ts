import { subscribeRealtime } from './realtimeClient'
import { createRealtimeRefresh } from './realtimeRefresh'

export type AccountResource = 'notifications' | 'announcements' | 'outbox' | 'history' | 'presence'

export const dispatchAccountState = (resource: AccountResource | 'all') => {
  window.dispatchEvent(new CustomEvent('account-state-changed', { detail: { resource } }))
}

export const subscribeAccountState = (resources: AccountResource[], refresh: () => unknown | Promise<unknown>) => {
  const guardedRefresh = () => { if (localStorage.getItem('token')) return refresh() }
  const queue = createRealtimeRefresh(guardedRefresh)
  const matches = (resource: AccountResource | 'all') => resource === 'all' || resources.includes(resource)
  const unsubscribe = subscribeRealtime(['account_state_changed'], () => queue.invalidate(), payload => matches(payload?.resource))
  const onChange = (event: Event) => {
    if (matches((event as CustomEvent)?.detail?.resource)) queue.invalidate()
  }
  window.addEventListener('account-state-changed', onChange)
  return () => {
    unsubscribe()
    queue.dispose()
    window.removeEventListener('account-state-changed', onChange)
  }
}
