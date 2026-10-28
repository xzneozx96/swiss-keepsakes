import type { Clock } from '../ports.ts'

interface Entry<V> {
  loadedAt: number
  value: Promise<V>
}

// Keeps the in-flight promise, so parallel misses load once; a rejected load is dropped.
export function createTtlCache<V>(clock: Clock, ttlMs: number): { get: (key: string, load: () => Promise<V>) => Promise<V> } {
  const entries = new Map<string, Entry<V>>()

  return {
    get(key, load) {
      const now = clock.now().getTime()
      const hit = entries.get(key)

      if (hit && now - hit.loadedAt < ttlMs)
        return hit.value

      const entry: Entry<V> = { loadedAt: now, value: load() }

      entries.set(key, entry)
      entry.value.catch(() => {
        if (entries.get(key) === entry)
          entries.delete(key)
      })

      return entry.value
    },
  }
}
