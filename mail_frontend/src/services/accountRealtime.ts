export type AccountResource = 'notifications' | 'announcements' | 'outbox' | 'history' | 'presence'

export const dispatchAccountState = (resource: AccountResource | 'all') => {
  window.dispatchEvent(new CustomEvent('account-state-changed', { detail: { resource } }))
}

/** Refresh on a committed change, reconnect, or foreground entry; never on a timer. */
export const subscribeAccountState = (
  resources: AccountResource[],
  refresh: () => unknown | Promise<unknown>
) => {
  let disposed = false
  let running = false
  let pending = false
  const run = async () => {
    if (disposed || !localStorage.getItem('token')) return
    if (running) { pending = true; return }
    running = true
    try {
      await refresh()
    } catch (error) {
      console.warn('刷新推送状态失败:', error)
    } finally {
      running = false
      if (pending) { pending = false; void run() }
    }
  }
  const onChange = (event: Event) => {
    const resource = (event as CustomEvent)?.detail?.resource
    if (resource === 'all' || resources.includes(resource)) void run()
  }
  const onResume = () => { if (!document.hidden) void run() }
  window.addEventListener('account-state-changed', onChange)
  window.addEventListener('focus', onResume)
  window.addEventListener('online', onResume)
  document.addEventListener('visibilitychange', onResume)
  return () => {
    disposed = true
    pending = false
    window.removeEventListener('account-state-changed', onChange)
    window.removeEventListener('focus', onResume)
    window.removeEventListener('online', onResume)
    document.removeEventListener('visibilitychange', onResume)
  }
}
