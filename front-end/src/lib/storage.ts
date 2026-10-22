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

/** sessionStorage that never throws: it lives as long as the tab, and a blocked one gives the fallback. */
export function readSessionStored(key: string): string | undefined {
  try {
    return window.sessionStorage.getItem(key) ?? undefined
  }
  catch {
    return undefined
  }
}

export function writeSessionStored(key: string, value: string): boolean {
  try {
    window.sessionStorage.setItem(key, value)

    return true
  }
  catch {
    return false
  }
}

export function removeSessionStored(key: string) {
  try {
    window.sessionStorage.removeItem(key)
  }
  catch {
    // Nothing to remove when storage is blocked.
  }
}
