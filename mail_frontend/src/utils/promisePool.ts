export async function runPromisePool<TItem, TResult>(
  items: TItem[],
  concurrency: number,
  worker: (item: TItem, index: number) => Promise<TResult>
): Promise<TResult[]> {
  if (!items.length) {
    return []
  }

  const MAX_PROMISE_POOL_WORKERS = 256
  const normalizedConcurrency = Number.isFinite(concurrency) ? concurrency : MAX_PROMISE_POOL_WORKERS
  const limit = Math.max(1, Math.min(normalizedConcurrency, items.length, MAX_PROMISE_POOL_WORKERS))
  const results: TResult[] = new Array(items.length)
  let nextIndex = 0

  const runWorker = async () => {
    while (true) {
      const currentIndex = nextIndex
      nextIndex += 1

      if (currentIndex >= items.length) {
        return
      }

      results[currentIndex] = await worker(items[currentIndex], currentIndex)
    }
  }

  await Promise.all(Array.from({ length: limit }, () => runWorker()))
  return results
}
