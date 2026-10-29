import type { Actor } from '@sk/domain/identity'
import type { AuditEntry } from '../../../src/modules/content/ports.ts'
import { describe, expect, it } from 'vitest'
import { guardUseCases } from '../../../src/modules/content/adapters/database-errors.ts'
import { failureProblem } from '../../../src/modules/content/adapters/problems.ts'
import { makeCreateCategory } from '../../../src/modules/content/application/create-category.ts'
import { makeDeleteCategory } from '../../../src/modules/content/application/delete-category.ts'
import { makeListMerchantCategories } from '../../../src/modules/content/application/list-categories-merchant.ts'
import { makeReorderCategories } from '../../../src/modules/content/application/reorder-categories.ts'
import { makeSaveCategory } from '../../../src/modules/content/application/save-category.ts'
import { createFakeCategories } from '../../support/fake-categories.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const store = 'store-1'
const manager: Actor = { kind: 'staff', userId: 'u1', guestId: 'g1', stores: new Map([[store, 'manager']]) }
const outsider: Actor = { kind: 'staff', userId: 'u2', guestId: 'g2', stores: new Map([['store-2', 'owner']]) }
const nobody: Actor = { kind: 'staff', userId: 'u4', guestId: 'g4', stores: new Map() }
const missing = '00000000-0000-4000-8000-000000000000'

function setup() {
  const categories = createFakeCategories()
  const audit: AuditEntry[] = []
  const deps = {
    uow: { run: <R>(work: (tx: null) => Promise<R>) => work(null) },
    categories,
    audit: { record: async (_tx: null, entry: AuditEntry) => void audit.push(entry) },
    clock: createManualClock(new Date('2026-10-28T10:00:00Z')),
  }
  return {
    categories,
    audit,
    list: makeListMerchantCategories(deps),
    create: makeCreateCategory(deps),
    save: makeSaveCategory(deps),
    reorder: makeReorderCategories(deps),
    remove: guardUseCases({ remove: makeDeleteCategory(deps) }).remove,
  }
}
type S = ReturnType<typeof setup>

async function made(s: S, name: { en?: string, de?: string }, parentId?: string, kind: 'map' | 'blog' = 'map') {
  const result = await s.create(manager, store, kind, { name, parentId }, null)
  if (!result.ok)
    throw new Error(`create failed: ${result.reason}`)
  return result.value
}
async function ids(s: S, kind: 'map' | 'blog' = 'map') {
  const result = await s.list(manager, store, kind)
  if (!result.ok)
    throw new Error('list failed')
  return result.value.map(r => `${r.name.en ?? r.name.de}${r.parentId ? '^' : ''}:${r.position}`)
}

describe('category use cases', () => {
  it('[E4.18][AC87] AC-1 create, rename, move above and nest, each seen in the list', async () => {
    const s = setup()
    const walks = await made(s, { en: 'Walks' })
    const food = await made(s, { en: 'Food' })
    expect(await ids(s)).toEqual(['Walks:1', 'Food:2'])
    expect(await s.save(manager, store, 'map', walks.id, { name: { en: 'Hikes', de: 'Wanderungen' } }, 'r')).toMatchObject({ ok: true, value: { name: { en: 'Hikes', de: 'Wanderungen' } } })
    expect(await s.reorder(manager, store, 'map', { parentId: null, ids: [food.id, walks.id] }, null)).toMatchObject({ ok: true })
    expect(await ids(s)).toEqual(['Food:1', 'Hikes:2'])
    expect(await s.save(manager, store, 'map', walks.id, { parentId: food.id }, null)).toMatchObject({ ok: true, value: { parentId: food.id, position: 1 } })
    expect(await ids(s)).toEqual(['Food:1', 'Hikes^:1'])
  })

  it('[E4.18][AC87] the two lists are separate', async () => {
    const s = setup()
    await made(s, { en: 'Walks' }, undefined, 'map')
    await made(s, { en: 'Travel tips' }, undefined, 'blog')
    expect(await ids(s, 'map')).toEqual(['Walks:1'])
    expect(await ids(s, 'blog')).toEqual(['Travel tips:1'])
    expect(s.audit.map(a => a.entity)).toEqual(['map_category', 'blog_category'])
  })

  it.each([
    ['English only', { en: ' Walks ' }, { en: 'Walks' }],
    ['German only', { de: 'Wanderungen' }, { de: 'Wanderungen' }],
    ['both', { en: 'Walks', de: 'Wanderungen' }, { en: 'Walks', de: 'Wanderungen' }],
    ['blank English', { en: '   ', de: 'Wanderungen' }, { de: 'Wanderungen' }],
  ])('[E4.18][AC87] AC-3 a name with %s is stored without a blank key', async (_label, input, stored) => {
    const s = setup()
    const row = await made(s, input)
    expect(row.name).toEqual(stored)
    expect(s.categories.rows.get(row.id)!.name).toEqual(stored)
  })

  it('[E4.18][AC87] AC-3 a name with no language left is name-missing and nothing is saved', async () => {
    const s = setup()
    const walks = await made(s, { en: 'Walks' })
    expect(await s.create(manager, store, 'map', { name: { en: ' ', de: '' } }, null)).toEqual({ ok: false, reason: 'name-missing' })
    expect(await s.save(manager, store, 'map', walks.id, { name: {} }, null)).toEqual({ ok: false, reason: 'name-missing' })
    expect(await ids(s)).toEqual(['Walks:1'])
    expect(s.audit).toHaveLength(1)
  })

  it('[E4.18][AC87] the slug comes from the EN name, else DE, gets a number when taken and stays on rename', async () => {
    const s = setup()
    const first = await made(s, { en: 'Café & Spa' })
    const second = await made(s, { en: 'Café & Spa' })
    const german = await made(s, { de: 'Küche' })
    expect([first.slug, second.slug, german.slug]).toEqual(['cafe-spa', 'cafe-spa-2', 'kueche'])
    const renamed = await s.save(manager, store, 'map', first.id, { name: { en: 'Something else' } }, null)
    expect(renamed).toMatchObject({ ok: true, value: { slug: 'cafe-spa' } })
  })

  it.each([
    ['a top-level parent', 'ok'],
    ['a sub-category as parent', 'category-too-deep'],
    ['an unknown parent', 'not-found'],
  ])('[E4.18][AC87] create under %s -> %s', async (label, expected) => {
    const s = setup()
    const root = await made(s, { en: 'Root' })
    const sub = await made(s, { en: 'Sub' }, root.id)
    const parentId = label.startsWith('a top') ? root.id : label.startsWith('a sub') ? sub.id : missing
    const result = await s.create(manager, store, 'map', { name: { en: 'New' }, parentId }, null)
    expect(result.ok ? 'ok' : result.reason).toBe(expected)
  })

  it('[E4.18][AC87] a parent of another list or of another store is not found', async () => {
    const s = setup()
    const blogRoot = await made(s, { en: 'Blog root' }, undefined, 'blog')
    expect(await s.create(manager, store, 'map', { name: { en: 'New' }, parentId: blogRoot.id }, null)).toEqual({ ok: false, reason: 'not-found' })
    const otherStoreRoot = await s.create({ ...manager, stores: new Map([['store-2', 'owner']]) }, 'store-2', 'map', { name: { en: 'Elsewhere' } }, null)
    if (!otherStoreRoot.ok)
      throw new Error('setup failed')
    expect(await s.create(manager, store, 'map', { name: { en: 'New' }, parentId: otherStoreRoot.value.id }, null)).toEqual({ ok: false, reason: 'not-found' })
  })

  it('[E4.18][AC87] moves: a sub cannot take children, a parent with children cannot become a sub, a category is not its own parent', async () => {
    const s = setup()
    const a = await made(s, { en: 'A' })
    const b = await made(s, { en: 'B' })
    const sub = await made(s, { en: 'Sub' }, a.id)
    const results = [
      await s.save(manager, store, 'map', b.id, { parentId: sub.id }, null),
      await s.save(manager, store, 'map', a.id, { parentId: b.id }, null),
      await s.save(manager, store, 'map', b.id, { parentId: b.id }, null),
      await s.save(manager, store, 'map', b.id, { parentId: missing }, null),
    ]
    expect(results.map(r => (r.ok ? 'ok' : r.reason))).toEqual(['category-too-deep', 'category-parent-has-children', 'category-too-deep', 'not-found'])
    expect(await ids(s)).toEqual(['A:1', 'B:2', 'Sub^:1'])
  })

  it('[E4.18][AC87] moving to the top level appends last, and moving a sub closes the gap in the old group', async () => {
    const s = setup()
    const a = await made(s, { en: 'A' })
    const s1 = await made(s, { en: 'S1' }, a.id)
    await made(s, { en: 'S2' }, a.id)
    await made(s, { en: 'S3' }, a.id)
    expect(await s.save(manager, store, 'map', s1.id, { parentId: null }, null)).toMatchObject({ ok: true, value: { parentId: null, position: 2 } })
    expect(await ids(s)).toEqual(['A:1', 'S1:2', 'S2^:1', 'S3^:2'])
  })

  it('[E4.18][AC87] a save with the same parent changes only the name', async () => {
    const s = setup()
    const a = await made(s, { en: 'A' })
    await made(s, { en: 'B' })
    expect(await s.save(manager, store, 'map', a.id, { name: { en: 'A2' }, parentId: null }, null)).toMatchObject({ ok: true, value: { position: 1, name: { en: 'A2' } } })
  })

  it('[E4.18][AC87] save of an unknown id is not found', async () => {
    const s = setup()
    expect(await s.save(manager, store, 'map', missing, { name: { en: 'X' } }, null)).toEqual({ ok: false, reason: 'not-found' })
  })

  it('[E4.18][AC87] reorder: an id list that is not exactly the siblings is order-mismatch and nothing changes', async () => {
    const s = setup()
    const a = await made(s, { en: 'A' })
    const b = await made(s, { en: 'B' })
    const sub = await made(s, { en: 'Sub' }, a.id)
    const wrong = [[a.id], [a.id, a.id], [a.id, b.id, b.id], [a.id, sub.id], [b.id, a.id, sub.id], [a.id, missing]]
    for (const list of wrong)
      expect(await s.reorder(manager, store, 'map', { parentId: null, ids: list }, null), JSON.stringify(list)).toEqual({ ok: false, reason: 'order-mismatch' })
    expect(await ids(s)).toEqual(['A:1', 'B:2', 'Sub^:1'])
    expect(await s.reorder(manager, store, 'map', { parentId: missing, ids: [] }, null)).toEqual({ ok: false, reason: 'not-found' })
  })

  it('[E4.18][AC87] reorder within a parent returns the new list with positions 1..n', async () => {
    const s = setup()
    const a = await made(s, { en: 'A' })
    const x = await made(s, { en: 'X' }, a.id)
    const y = await made(s, { en: 'Y' }, a.id)
    const result = await s.reorder(manager, store, 'map', { parentId: a.id, ids: [y.id, x.id] }, 'req')
    expect(result.ok && result.value.map(r => `${r.name.en}:${r.position}`)).toEqual(['A:1', 'Y:1', 'X:2'])
  })

  it.each([
    ['no children, no use', 0, 0, 'ok'],
    ['a sub-category', 1, 0, 'category-has-children'],
    ['a tagged pin or story group', 0, 1, 'category-in-use'],
    ['both', 1, 1, 'category-has-children'],
  ])('[E4.18][AC87] AC-4 delete with %s -> %s', async (_label, subs, tagged, expected) => {
    const s = setup()
    const target = await made(s, { en: 'Target' })
    for (let i = 0; i < subs; i++)
      await made(s, { en: `Sub${i}` }, target.id)
    s.categories.uses.set(target.id, tagged)
    const result = await s.remove(manager, store, 'map', target.id, 'req')
    expect(result.ok ? 'ok' : result.reason).toBe(expected)
    expect(s.categories.rows.has(target.id)).toBe(expected !== 'ok')
  })

  it('[E4.18][AC87] AC-4 a delete closes the gap among the siblings and writes an audit row', async () => {
    const s = setup()
    const a = await made(s, { en: 'A' })
    await made(s, { en: 'B' })
    await made(s, { en: 'C' })
    expect(await s.remove(manager, store, 'map', a.id, 'req-9')).toEqual({ ok: true, value: { id: a.id } })
    expect(await ids(s)).toEqual(['B:1', 'C:2'])
    expect(s.audit.at(-1)).toMatchObject({ storeId: store, actor: 'staff:u1', entity: 'map_category', entityId: a.id, action: 'deleted', requestId: 'req-9' })
    expect(await s.remove(manager, store, 'map', a.id, null)).toEqual({ ok: false, reason: 'not-found' })
  })

  it('[E4.18][AC87] AC-4 a link added after the count makes the database refuse; the guarded answer is in-use (the route words it category-in-use), not an error', async () => {
    const s = setup()
    const target = await made(s, { en: 'Target' })
    s.categories.removeRefused.add(target.id)
    const result = await s.remove(manager, store, 'map', target.id, null)
    expect(result).toEqual({ ok: false, reason: 'in-use' })
    expect(s.categories.rows.has(target.id)).toBe(true)
  })

  it('[E4.18][AC87] AC-5 three rows: a sub keeps its parent and counts come through the list', async () => {
    const s = setup()
    const a = await made(s, { en: 'A' })
    await made(s, { en: 'B' })
    await made(s, { en: 'Sub' }, a.id)
    s.categories.uses.set(a.id, 2)
    const list = await s.list(manager, store, 'map')
    expect(list.ok && list.value.map(r => [r.name.en, r.childCount, r.useCount])).toEqual([['A', 1, 2], ['B', 0, 0], ['Sub', 0, 0]])
  })

  it.each([
    ['staff of another store', outsider],
    ['a staff member with no membership', nobody],
    ['a guest', { kind: 'guest', guestId: 'g9' } as Actor],
  ])('[E4.18][AC87] AC-6 %s is forbidden on every use case and nothing changes', async (_label, actor) => {
    const s = setup()
    const a = await made(s, { en: 'A' })
    const results = [
      await s.list(actor, store, 'map'),
      await s.create(actor, store, 'map', { name: { en: 'X' } }, null),
      await s.save(actor, store, 'map', a.id, { name: { en: 'X' } }, null),
      await s.reorder(actor, store, 'map', { parentId: null, ids: [a.id] }, null),
      await s.remove(actor, store, 'map', a.id, null),
    ]
    expect(results).toEqual(Array.from({ length: 5 }).fill({ ok: false, reason: 'forbidden' }))
    expect(await ids(s)).toEqual(['A:1'])
  })

  it('[E4.18][AC87] AC-6 a Manager may write, the list is locked before every write and each write is audited', async () => {
    const s = setup()
    const a = await made(s, { en: 'A' })
    await s.save(manager, store, 'map', a.id, { name: { en: 'A2' } }, null)
    await s.reorder(manager, store, 'map', { parentId: null, ids: [a.id] }, null)
    await s.remove(manager, store, 'map', a.id, null)
    expect(s.categories.locks).toEqual(Array.from({ length: 4 }).fill(`${store}:map`))
    expect(s.audit.map(e => e.action)).toEqual(['created', 'updated', 'reordered', 'deleted'])
  })

  it.each([
    ['name-missing', 422, 'validation-failed', 'name'],
    ['order-mismatch', 422, 'validation-failed', 'ids'],
  ] as const)('[E4.18][AC87] %s maps to a 422 naming the field', (reason, status, type, path) => {
    expect(failureProblem({ reason })).toMatchObject({ status, type, errors: [{ in: 'body', path }] })
  })

  it.each(['category-has-children', 'category-in-use', 'category-too-deep', 'category-parent-has-children'] as const)('[E4.18][AC87] %s maps to a 409 of the same type with a readable title', (reason) => {
    const problem = failureProblem({ reason })
    expect(problem).toMatchObject({ status: 409, type: reason })
    expect(problem.title).toMatch(/^[A-Z].*\.$/)
  })
})
