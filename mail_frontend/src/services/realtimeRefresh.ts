/** One refresh at a time; a failed refresh stays dirty until it succeeds. */
export function createRealtimeRefresh(refresh: () => unknown | Promise<unknown>) {
  let disposed = false
  let running = false
  let dirty = false
  let failures = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  const run = async () => {
    if (disposed || running || !dirty) return
    if (timer) clearTimeout(timer)
    timer = undefined
    running = true
    dirty = false
    try {
      if (await refresh() === false) throw new Error('Realtime snapshot failed')
      failures = 0
    } catch {
      dirty = true
      failures++
    } finally {
      running = false
      if (!disposed && dirty) {
        if (!failures) { void run(); return }
        const delay = failures ? Math.min(30000, 1000 * 2 ** Math.min(failures - 1, 5)) + Math.random() * 250 : 0
        timer = setTimeout(() => { timer = undefined; void run() }, delay)
      }
    }
  }
  return {
    invalidate() { dirty = true; if (!timer) void run() },
    dispose() { disposed = true; dirty = false; if (timer) clearTimeout(timer) },
  }
}
