import type { Actor } from '@sk/domain/identity'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadData, openingStock, stockOnly } from '../../scripts/seed-curated.ts'
import { loadOpeningStock } from '../../scripts/seed-opening-stock.ts'
import { createSkuDirectory } from '../../src/modules/catalog/adapters/sku-directory.ts'
import { createStockRepository } from '../../src/modules/inventory/adapters/stock-repository.ts'
import { makeSetStock } from '../../src/modules/inventory/index.ts'
import { createAuditLog } from '../../src/platform/audit.ts'
import { systemClock } from '../../src/platform/clock.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { createCatalogHttp } from './catalog-http.ts'
import { openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 })

const testDatabase = openTestDatabase()
const { pool, db } = testDatabase
const env = createCatalogHttp(testDatabase)

// The loader's printed lines are not under test here: the step's results are read from the database.
const out = { stdout: '', stderr: '' }
beforeEach(() => {
  out.stdout = ''
  out.stderr = ''
  vi.spyOn(process.stdout, 'write').mockImplementation((text) => {
    out.stdout += String(text)
    return true
  })
  vi.spyOn(process.stderr, 'write').mockImplementation((text) => {
    out.stderr += String(text)
    return true
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

afterAll(async () => {
  await pool.end()
})

const reason = 'Opening stock (seed)'
const quantities = loadOpeningStock()
const knifeCodes = loadData().keepsakes.map(record => record.skuCode)

interface Variant { id: string, status: string, values: Record<string, string>, onHand: number, reserved: number, available: number }
interface Product { id: string, variants: Variant[] }

// A scratch store (never the dev store's rows) with an owner and a manager signed in, and the keepsakes made through the
// catalog routes as the loader does: one variant each, no options, no quantity, so the stock row is the migration's 0.
async function scratchStore(codes: string[]) {
  const store = await env.storeWithStaff()
  const photo = await env.readyPhoto(store.storeId)
  const create = async (skuCode: string, extra: object = {}) => {
    const response = await env.call(store.products, { method: 'POST', headers: store.owner.headers, body: { name: { en: `Knife ${skuCode}` }, photoIds: [photo], options: [], variants: [{ skuCode, priceRappen: 3900, values: {}, ...extra }] } })
    expect(response.status).toBe(201)
    return (await response.json() as Product).variants[0]!.id
  }
  const skuIds = new Map<string, string>()
  for (const code of codes)
    skuIds.set(code, await create(code))
  const count = async (table: string) => Number((await pool.query(`select count(*) from ${table} where store_id = $1`, [store.storeId])).rows[0].count)
  const stock = async (skuId: string) => (await pool.query<{ on_hand: number }>('select on_hand from inventory.stock_items where sku_id = $1', [skuId])).rows.map(row => row.on_hand)
  const history = async (skuId: string) => (await pool.query<{ kind: string, on_hand_before: number, on_hand_after: number, actor_user_id: string, reason: string | null }>('select kind, on_hand_before, on_hand_after, actor_user_id, reason from inventory.stock_adjustments where sku_id = $1 order by at, id', [skuId])).rows
  const counts = async () => ({ products: await count('catalog.products'), skus: await count('catalog.skus'), stock: await count('inventory.stock_items'), history: await count('inventory.stock_adjustments') })
  // A person sets the stock through the inventory use case, as the PUT route does.
  const person: Actor = { kind: 'staff', userId: store.owner.userId, guestId: store.owner.userId, stores: new Map([[store.storeId, 'owner' as const]]) }
  const setByPerson = makeSetStock({ uow: createUnitOfWork(db), stock: createStockRepository(), skus: createSkuDirectory(), media: { find: async () => [] }, audit: createAuditLog(systemClock), clock: systemClock })
  const personSets = async (code: string, onHand: number) => {
    const result = await setByPerson(person, store.storeId, skuIds.get(code)!, onHand, null)
    expect(result.ok).toBe(true)
  }
  const list = async () => await (await env.call(store.products, { headers: store.owner.headers })).json() as { items: { soldOutCount: number, variantCount: number }[] }

  return { ...store, photo, skuIds, count, counts, stock, history, personSets, list }
}

describe('[E6.5][AC52][AC53] the opening stock of the seeded knives', () => {
  it('[E6.5][AC52][AC53][AC-1] each of the five knives gets 100 with one set row naming the owner; counts do not change; none is sold out', async () => {
    const s = await scratchStore(knifeCodes)
    const before = await s.counts()
    const code = await openingStock(pool, s.storeId, quantities)
    const after = await s.counts()

    expect(code).toBe(0)
    for (const skuId of s.skuIds.values()) {
      expect(await s.stock(skuId)).toEqual([100])
      expect(await s.history(skuId)).toEqual([{ kind: 'set', on_hand_before: 0, on_hand_after: 100, actor_user_id: s.owner.userId, reason }])
    }
    expect(after).toEqual({ ...before, history: before.history + 5 })
    expect((await s.list()).items.map(item => item.soldOutCount)).toEqual([0, 0, 0, 0, 0])
  })

  it('[E6.5][AC52][AC53][AC-1] the acting user is the earliest accepted owner, not a later owner or the manager', async () => {
    const s = await scratchStore(['K-1'])
    const later = (await env.signIn()).userId
    await pool.query(`insert into identity.store_memberships (user_id, store_id, role, accepted_at) values ($1, $2, 'owner', now() + interval '1 day')`, [later, s.storeId])
    await openingStock(pool, s.storeId, { 'K-1': 100 })

    expect((await s.history(s.skuIds.get('K-1')!))[0]!.actor_user_id).toBe(s.owner.userId)
  })

  it('[E6.5][AC52][AC53][AC-2] a row of 0 is set; a person\'s 7 and a person\'s 4-to-0 are skipped; a second run changes nothing', async () => {
    const s = await scratchStore(['A', 'B', 'C'])
    await s.personSets('B', 7)
    await s.personSets('C', 4)
    await s.personSets('C', 0)
    const beforeHistory = { B: await s.history(s.skuIds.get('B')!), C: await s.history(s.skuIds.get('C')!) }
    const before = await s.counts()
    await openingStock(pool, s.storeId, { A: 100, B: 100, C: 100 })

    expect(await s.stock(s.skuIds.get('A')!)).toEqual([100])
    expect(await s.history(s.skuIds.get('A')!)).toHaveLength(1)
    expect(await s.stock(s.skuIds.get('B')!)).toEqual([7])
    expect(await s.stock(s.skuIds.get('C')!)).toEqual([0])
    expect({ B: await s.history(s.skuIds.get('B')!), C: await s.history(s.skuIds.get('C')!) }).toEqual(beforeHistory)
    expect(out.stdout).toContain('1 set, 2 skipped')
    const afterFirst = await s.counts()
    expect(afterFirst).toEqual({ ...before, history: before.history + 1 })

    out.stdout = ''
    expect(await openingStock(pool, s.storeId, { A: 100, B: 100, C: 100 })).toBe(0)
    expect(await s.counts()).toEqual(afterFirst)
    expect(await s.stock(s.skuIds.get('A')!)).toEqual([100])
    expect(out.stdout).toContain('Nothing was changed')
  })

  it('[E6.5][AC52][AC53][AC-3] a quantity of 0 stays sold out with no history while the others read available', async () => {
    const s = await scratchStore(['A', 'B'])
    await openingStock(pool, s.storeId, { A: 0, B: 100 })

    expect(await s.stock(s.skuIds.get('A')!)).toEqual([0])
    expect(await s.history(s.skuIds.get('A')!)).toEqual([])
    const items = (await s.list()).items
    expect(items.map(item => item.soldOutCount).sort()).toEqual([0, 1])
  })

  it.each([
    ['a code that no keepsake has', 'GHOST', async () => {}],
    ['a SKU with no stock row', 'B', async (s: Awaited<ReturnType<typeof scratchStore>>) => {
      await pool.query('delete from inventory.stock_items where sku_id = $1', [s.skuIds.get('B')])
    }],
  ])('[E6.5][AC52][AC53][AC-4] %s stops before any write and names the code', async (_name, named, break_) => {
    const s = await scratchStore(['A', 'B'])
    await break_(s)
    const before = await s.counts()
    const code = await openingStock(pool, s.storeId, { A: 100, B: 100, GHOST: 5 })

    expect(code).toBe(1)
    expect(out.stderr).toContain(named === 'GHOST' ? 'GHOST' : 'SKU B has no stock row')
    expect(await s.counts()).toEqual(before)
    expect(await s.stock(s.skuIds.get('A')!)).toEqual([0])
    expect(out.stderr).not.toMatch(/postgres/)
  })

  it('[E6.5][AC52][AC53][AC-4] a store with no owner membership stops before any write and names the store', async () => {
    const s = await scratchStore(['A'])
    await pool.query('delete from identity.store_memberships where store_id = $1', [s.storeId])
    const before = await s.counts()
    const code = await openingStock(pool, s.storeId, { A: 100 })

    expect(code).toBe(1)
    expect(out.stderr).toContain(s.storeId)
    expect(await s.counts()).toEqual(before)
    expect(await s.stock(s.skuIds.get('A')!)).toEqual([0])
  })
})

describe('[E6.5][AC52][AC53][AC-2] the dry run of the stock step', () => {
  it('[E6.5][AC52][AC53][AC-2] lists the sets and the skipped row, names the owner, and writes nothing', async () => {
    const s = await scratchStore(knifeCodes)
    await s.personSets(knifeCodes[0]!, 7)
    const before = await s.counts()
    const code = await stockOnly(pool, s.storeId, true)

    expect(code).toBe(0)
    expect(out.stdout).toContain(`acting as owner ${s.owner.userId}`)
    expect(out.stdout).toContain(`${knifeCodes[0]}: skipped`)
    expect(out.stdout).toContain(`${knifeCodes[1]}: 0 to 100`)
    expect(out.stdout).not.toContain('Opening stock:')
    expect(await s.counts()).toEqual(before)
    for (const code of knifeCodes.slice(1))
      expect(await s.stock(s.skuIds.get(code)!)).toEqual([0])
  })

  it('[E6.5][AC52][AC53][AC-4] a fault in the dry run exits 1 and writes nothing', async () => {
    const s = await scratchStore(knifeCodes.slice(1))
    const before = await s.counts()

    expect(await stockOnly(pool, s.storeId, true)).toBe(1)
    expect(out.stderr).toContain('Nothing was written')
    expect(await s.counts()).toEqual(before)
  })
})

describe('[E6.5][AC52][AC53] a combination at 0 reads as sold out (fixture, not the seed)', () => {
  it('[E6.5][AC52][AC53][AC-5] one Size x Colour combination at 0 is sold out and the others are available; the list counts it', async () => {
    const store = await env.storeWithStaff()
    const photo = await env.readyPhoto(store.storeId)
    const size = { ref: 'size', name: { en: 'Size' }, values: [{ ref: 's', label: { en: 'Small' } }, { ref: 'l', label: { en: 'Large' } }] }
    const colour = { ref: 'colour', name: { en: 'Colour' }, values: [{ ref: 'r', label: { en: 'Red' } }, { ref: 'b', label: { en: 'Blue' } }] }
    const combos = [['s', 'r', 0], ['s', 'b', 5], ['l', 'r', 5], ['l', 'b', 5]] as const
    const response = await env.call(store.products, {
      method: 'POST',
      headers: store.owner.headers,
      body: { name: { en: 'Fixture knife' }, photoIds: [photo], options: [size, colour], variants: combos.map(([s, c, quantity], index) => ({ skuCode: `FX-${index}`, priceRappen: 3900, values: { size: s, colour: c }, quantity })) },
    })
    const created = await response.json() as Product
    const detail = await (await env.call(`${store.products}/${created.id}`, { headers: store.owner.headers })).json() as { options: { id: string, values: { id: string, label: { en: string } }[] }[], variants: Variant[] }
    const label = (variant: Variant) => detail.options.map(option => option.values.find(value => Object.values(variant.values).includes(value.id))!.label.en).join(' / ')
    const soldOut = detail.variants.filter(variant => variant.available === 0)
    const list = await (await env.call(store.products, { headers: store.owner.headers })).json() as { items: { id: string, soldOutCount: number, variantCount: number }[] }

    expect(response.status).toBe(201)
    expect(soldOut.map(label)).toEqual(['Small / Red'])
    expect(detail.variants.filter(variant => variant.available > 0)).toHaveLength(3)
    expect(list.items.find(item => item.id === created.id)).toMatchObject({ soldOutCount: 1, variantCount: 4 })
  })
})
