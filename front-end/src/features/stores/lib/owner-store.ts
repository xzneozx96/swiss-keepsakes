import { readStored, writeStored } from '@/lib/storage'

const KEY = 'sk.ownerStore'

/**
 * The store an accepted invitation opened. The API has no read that says which stores a user belongs to, so
 * a reload of A02 finds its store here. The API still checks the membership on every call, so a stale id
 * only earns a refusal. This module is the only one that reads or writes the key, so a store list from the API
 * can replace it here and nowhere else.
 */
export function rememberedStore(): string | undefined {
  const value = readStored<unknown>(KEY, undefined)

  return typeof value === 'string' ? value : undefined
}

export function rememberStore(storeId: string) {
  writeStored(KEY, storeId)
}

export function forgetStore() {
  try {
    window.localStorage.removeItem(KEY)
  }
  catch {
    // Nothing to forget when storage is blocked.
  }
}
