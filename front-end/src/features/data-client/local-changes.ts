import type { QueryKey } from '@tanstack/react-query'
import type { CommandName, Feature } from './commands'
import type { Command } from './use-command'

import { queryKeys } from './query-keys'

/**
 * One edit of cached data that the server's answer already proves. `key` is a prefix: the edit runs
 * on every query under it, and `apply` gets that query's own key, so it can read the filter in it.
 */
export interface LocalChange {
  key: QueryKey
  apply: (data: unknown, queryKey: QueryKey) => unknown
}

interface Item { id: string }
type ItemsOf = (items: Item[], queryKey: QueryKey) => Item[]

/** Edits `data[field]`, an array of items, and leaves any other shape alone. The one cast of the file: a cache holds `unknown`. */
function editItems(field: string, edit: ItemsOf): LocalChange['apply'] {
  return (data, queryKey) => {
    const items = (data as Record<string, unknown> | undefined)?.[field]

    return Array.isArray(items) ? { ...(data as object), [field]: edit(items as Item[], queryKey) } : data
  }
}

/** The list without the item `id`. */
export function without(field: string, id: string): LocalChange['apply'] {
  return editItems(field, items => items.filter(item => item.id !== id))
}

/** The list with the item `id` merged with `changes`, in its place. */
export function patching(field: string, id: string, changes: object): LocalChange['apply'] {
  return editItems(field, items => items.map(item => (item.id === id ? { ...item, ...changes } : item)))
}

/** Like {@link without}, and the list's `total` goes down by one when the item was in it. */
export function withoutCounted(field: string, id: string): LocalChange['apply'] {
  return (data, queryKey) => {
    const dropped = without(field, id)(data, queryKey)
    const before = (data as Record<string, unknown> | undefined)?.[field]
    const after = (dropped as Record<string, unknown> | undefined)?.[field]
    const total = (data as { total?: unknown } | undefined)?.total

    return Array.isArray(before) && Array.isArray(after) && after.length < before.length && typeof total === 'number'
      ? { ...(dropped as object), total: total - 1 }
      : dropped
  }
}

type Changes = {
  [F in Feature]?: { [C in CommandName<F>]?: (input: Command<F, C>['input'], result: Command<F, C>['result']) => readonly LocalChange[] }
}

/** The status filter of a media list query: retired files are listed only when the filter asks for them (the server's default list leaves them out). */
function showsRetired(queryKey: QueryKey): boolean {
  const query = queryKey.at(-1) as { status?: string } | undefined
  const status = (query?.status ?? '').split(',').filter(Boolean)

  return status.includes('retired')
}

/**
 * The commands whose answer settles what a list shows, so the list is edited at once and the read
 * of everything in `commandAffects` runs in the background (`useCommand`). Use it for a delete, hide,
 * archive, retire or remove: the dialog waits for the server, then the row is gone (or changed)
 * with no wait for the re-read. A command not listed here keeps the awaited re-read. What
 * the edit leaves wrong, such as a count, the background re-read puts right.
 */
export const commandChanges: Changes = {
  categories: {
    // The parent's sub-category count follows, so the screen does not call a now empty parent "has sub-categories".
    remove: input => [{
      key: [...queryKeys.categories.list, input.storeId, input.kind],
      apply: (data, queryKey) => {
        const removed = ((data as { items?: Array<Item & { parentId: string | null }> }).items ?? []).find(item => item.id === input.id)
        const dropped = without('items', input.id)(data, queryKey)

        return removed?.parentId
          ? patchCount(dropped, removed.parentId)
          : dropped
      },
    }],
  },
  media: {
    // A retired file leaves the default list at once; it stays, retired, only in a list that filters for retired files.
    retire: (input, retired) => [{
      key: [...queryKeys.media.list, input.storeId],
      apply: (data, queryKey) => showsRetired(queryKey) ? patching('items', input.id, retired)(data, queryKey) : withoutCounted('items', input.id)(data, queryKey),
    }],
  },
  places: {
    hide: (input, hidden) => [{
      key: [...queryKeys.places.list, input.storeId],
      apply: patching('items', input.id, { status: hidden.status, rowVersion: hidden.rowVersion, updatedAt: hidden.updatedAt }),
    }],
    remove: input => [{ key: [...queryKeys.places.list, input.storeId], apply: without('items', input.id) }],
  },
  stores: {
    removeMember: input => [{ key: [...queryKeys.stores.members, input.storeId], apply: without('members', input.memberId) }],
    revokeManagerInvitation: input => [{ key: [...queryKeys.stores.members, input.storeId], apply: without('invitations', input.invitationId) }],
  },
}

function patchCount(data: unknown, parentId: string): unknown {
  return editItems('items', items => items.map(item => (item.id === parentId && 'childCount' in item && typeof item.childCount === 'number' ? { ...item, childCount: Math.max(0, item.childCount - 1) } : item)))(data, [])
}
