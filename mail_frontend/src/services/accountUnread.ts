import { computed, reactive } from 'vue'
import api from './api'
import { subscribeAccountState } from './accountRealtime'
import { createRealtimeRefresh } from './realtimeRefresh'

type Resource = 'announcements' | 'notifications'
const counts = reactive({ announcements: 0, notifications: 0 })
const loaded = new Set<Resource>()
const pending = new Map<Resource, Promise<boolean>>()
const queues = new Map<Resource, ReturnType<typeof createRealtimeRefresh>>()
let identity = ''
let generation = 0
let users = 0
let stops: Array<() => void> = []
const revisions = { announcements: 0, notifications: 0 }

const ensureIdentity = () => {
  const next = localStorage.getItem('token') || ''
  if (next !== identity) {
    identity = next
    generation++
    queues.forEach(queue => queue.dispose()); queues.clear()
    loaded.clear(); pending.clear()
    counts.announcements = counts.notifications = 0
  }
  return next
}

export const accountUnreadCount = computed(() => counts.announcements + counts.notifications)

/** The command response updates the badge; it needs no socket echo or count GET. */
export async function withUnreadMutation(resource: Resource, request: Promise<any>) {
  const token = ensureIdentity()
  const result = await request
  if (result?.code !== 0 || !token || token !== localStorage.getItem('token')) return result
  const count = result.data?.unread_count
  if (typeof count === 'number' && Number.isFinite(count) && count >= 0) {
    revisions[resource]++
    counts[resource] = count
    loaded.add(resource)
  } else {
    // Compatibility with a backend that has not received the response change.
    await refreshUnreadCounts([resource])
  }
  return result
}

export function refreshUnreadCounts(resources: Resource[] = ['announcements', 'notifications'], cached = false): Promise<boolean> {
  const token = ensureIdentity()
  if (!token) return Promise.resolve(true)
  return Promise.all(resources.map(resource => {
    if (cached && pending.has(resource)) return pending.get(resource)!
    if (cached && loaded.has(resource)) return Promise.resolve(true)
    if (!queues.has(resource)) {
      const version = generation
      queues.set(resource, createRealtimeRefresh(async () => {
        const revision = revisions[resource]
        const path = resource === 'announcements' ? '/announcements/unread/count' : '/notifications/unread-count'
        const result: any = await api.get(path, { timeout: 15000 })
        if (version !== generation || token !== (localStorage.getItem('token') || '') || token !== identity) return true
        if (revision !== revisions[resource]) return true
        if (result.code !== 0) return false
        counts[resource] = Number(result.data?.count || 0)
        loaded.add(resource)
        return true
      }))
    }
    const request = queues.get(resource)!.request()
    pending.set(resource, request)
    void request.finally(() => { if (pending.get(resource) === request) pending.delete(resource) })
    return request
  })).then(results => results.every(Boolean))
}

/** One subscription per resource, however many headers are mounted. */
export function retainAccountUnread() {
  ensureIdentity()
  if (users++ === 0) {
    stops = (['announcements', 'notifications'] as Resource[]).map(resource =>
      subscribeAccountState([resource], () => refreshUnreadCounts([resource])))
  }
  return () => {
    if (--users === 0) {
      generation++
      stops.splice(0).forEach(stop => stop())
      queues.forEach(queue => queue.dispose()); queues.clear()
      pending.clear()
      loaded.clear()
    }
  }
}
