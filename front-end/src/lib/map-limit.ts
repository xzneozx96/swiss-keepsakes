/**
 * Runs `task` on every item, at most `limit` at a time, and settles them all like `Promise.allSettled`
 * (one failure does not stop the rest). The results keep the order of `items`. For a batch of
 * independent writes with no batch endpoint (code-style.md: cap the concurrency of unbounded work).
 */
export async function mapLimit<T, R>(items: readonly T[], limit: number, task: (item: T) => Promise<R>): Promise<Array<PromiseSettledResult<R>>> {
  const results: Array<PromiseSettledResult<R>> = Array.from({ length: items.length })
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++

      try {
        results[index] = { status: 'fulfilled', value: await task(items[index]!) }
      }
      catch (reason) {
        results[index] = { status: 'rejected', reason }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))

  return results
}
