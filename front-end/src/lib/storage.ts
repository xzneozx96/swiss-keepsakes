/**
 * localStorage that never throws. Storage can be missing or blocked
 * (private windows, previews, sandboxed hosting); callers then get the fallback.
 */
export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)

    return raw === null ? fallback : (JSON.parse(raw) as T)
  }
  catch {
    return fallback
  }
}

export type WriteResult = 'kept' | 'full' | 'unavailable'

/** "full" is a quota failure worth telling the user about. "unavailable" (blocked or missing storage) stays silent: the prototype keeps working for this session only. */
export function writeStored(key: string, value: unknown): WriteResult {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))

    return 'kept'
  }
  catch (error) {
    return error instanceof DOMException && error.name === 'QuotaExceededError'
      ? 'full'
      : 'unavailable'
  }
}
