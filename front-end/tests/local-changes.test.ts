import { describe, expect, it } from 'vitest'

import { commandChanges } from '@/features/data-client/local-changes'
import { queryKeys } from '@/features/data-client/query-keys'

const apply = (change: { key: readonly unknown[], apply: (data: unknown, key: readonly unknown[]) => unknown }, data: unknown, key: readonly unknown[]) => change.apply(data, key as never)

describe('commandChanges', () => {
  it('only lists commands that exist and whose lists commandAffects refreshes (a change is a shortcut for the re-read)', async () => {
    const { commandAffects } = await import('@/features/data-client/commands')
    const starts = (key: readonly unknown[], other: readonly unknown[]) => other.every((part, index) => key[index] === part)

    for (const [feature, commands] of Object.entries(commandChanges)) {
      for (const [command, changes] of Object.entries(commands as Record<string, (i: never, r: never) => Array<{ key: readonly unknown[] }>>)) {
        const affected = (commandAffects as Record<string, Record<string, readonly (readonly unknown[])[]>>)[feature]![command]!
        const edited = changes({ storeId: 's', kind: 'x', id: 'a', memberId: 'a', invitationId: 'a' } as never, { status: 'hidden', rowVersion: 1, updatedAt: '' } as never)

        for (const change of edited)
          expect(affected.some(key => starts(change.key, key)), `${feature}.${command}`).toBe(true)
      }
    }
  })

  it('places.remove drops the pin from the list of its store only', () => {
    const [change] = commandChanges.places!.remove!({ storeId: 's', id: 'b', ifMatch: 1, idempotencyKey: 'k' }, undefined)

    expect(change!.key).toEqual([...queryKeys.places.list, 's'])
    expect(apply(change!, { items: [{ id: 'a' }, { id: 'b' }] }, change!.key)).toEqual({ items: [{ id: 'a' }] })
  })

  it('places.hide keeps the row and takes the status and version from the answer', () => {
    const [change] = commandChanges.places!.hide!({ storeId: 's', id: 'b', ifMatch: 1, idempotencyKey: 'k' }, { status: 'hidden', rowVersion: 2, updatedAt: 'now' } as never)

    expect(apply(change!, { items: [{ id: 'b', status: 'published', rowVersion: 1, title: 't' }] }, change!.key)).toEqual({ items: [{ id: 'b', status: 'hidden', rowVersion: 2, updatedAt: 'now', title: 't' }] })
  })

  it('categories.remove drops the category and counts one sub-category less on its parent', () => {
    const [change] = commandChanges.categories!.remove!({ storeId: 's', kind: 'keepsake' as never, id: 'child', idempotencyKey: 'k' }, undefined)
    const data = { items: [{ id: 'root', parentId: null, childCount: 1 }, { id: 'child', parentId: 'root', childCount: 0 }] }

    expect(apply(change!, data, change!.key)).toEqual({ items: [{ id: 'root', parentId: null, childCount: 0 }] })
  })

  it('media.retire drops the file from the default list and keeps it, retired, only in a list that asks for retired files', () => {
    const [change] = commandChanges.media!.retire!({ storeId: 's', id: 'a', idempotencyKey: 'k' }, { status: 'retired' } as never)
    const data = { items: [{ id: 'a', status: 'ready' }, { id: 'b', status: 'ready' }], total: 2 }
    const all = [...queryKeys.media.list, 's', { kind: 'image' }]
    const ready = [...queryKeys.media.list, 's', { kind: 'image', status: 'ready' }]
    const withRetired = [...queryKeys.media.list, 's', { kind: 'image', status: 'ready,retired' }]

    expect(apply(change!, data, all)).toEqual({ items: [{ id: 'b', status: 'ready' }], total: 1 })
    expect(apply(change!, data, withRetired)).toEqual({ items: [{ id: 'a', status: 'retired' }, { id: 'b', status: 'ready' }], total: 2 })
    expect(apply(change!, data, ready)).toEqual({ items: [{ id: 'b', status: 'ready' }], total: 1 })
  })

  it('removeMember and revokeManagerInvitation edit their own array of the members read', () => {
    const [member] = commandChanges.stores!.removeMember!({ storeId: 's', memberId: 'm', idempotencyKey: 'k' }, undefined)
    const [invitation] = commandChanges.stores!.revokeManagerInvitation!({ storeId: 's', invitationId: 'i', idempotencyKey: 'k' }, undefined as never)
    const data = { members: [{ id: 'm' }, { id: 'o' }], invitations: [{ id: 'i' }] }

    expect(apply(member!, data, member!.key)).toEqual({ members: [{ id: 'o' }], invitations: [{ id: 'i' }] })
    expect(apply(invitation!, data, invitation!.key)).toEqual({ members: [{ id: 'm' }, { id: 'o' }], invitations: [] })
  })

  it('leaves data of another shape alone', () => {
    const [change] = commandChanges.places!.remove!({ storeId: 's', id: 'b', ifMatch: 1, idempotencyKey: 'k' }, undefined)

    expect(apply(change!, { other: 1 }, change!.key)).toEqual({ other: 1 })
  })
})
