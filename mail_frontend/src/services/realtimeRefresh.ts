/** One refresh at a time; a failed refresh stays dirty until it succeeds. */
export function createRealtimeRefresh(refresh: () => unknown | Promise<unknown>, options: { delay?: number } = {}) {
  let disposed = false
  let running = false
  let dirty = false
  let failures = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let waiters: Array<(ok: boolean) => void> = []
  const schedule = () => {
    if (disposed || running || timer || !dirty) return
    if (options.delay) timer = setTimeout(() => { timer = undefined; void run() }, options.delay)
    else void run()
  }
  const run = async () => {
    if (disposed || running || !dirty) return
    if (timer) clearTimeout(timer)
    timer = undefined
    running = true
    dirty = false
    const currentWaiters = waiters.splice(0)
    let ok = false
    try {
      if (await refresh() === false) throw new Error('Realtime snapshot failed')
      failures = 0
      ok = true
    } catch {
      dirty = true
      failures++
    } finally {
      currentWaiters.forEach(resolve => resolve(ok && !disposed))
      running = false
      if (!disposed && dirty) {
        if (!failures) { schedule(); return }
        const delay = failures ? Math.min(30000, 1000 * 2 ** Math.min(failures - 1, 5)) + Math.random() * 250 : 0
        timer = setTimeout(() => { timer = undefined; void run() }, delay)
      }
    }
  }
  return {
    invalidate() { dirty = true; schedule() },
    request(): Promise<boolean> {
      if (disposed) return Promise.resolve(false)
      return new Promise(resolve => { waiters.push(resolve); dirty = true; schedule() })
    },
    dispose() {
      disposed = true; dirty = false
      if (timer) clearTimeout(timer)
      waiters.splice(0).forEach(resolve => resolve(false))
    },
  }
}
