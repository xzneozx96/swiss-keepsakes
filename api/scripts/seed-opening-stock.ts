import type { Actor } from '@sk/domain/identity'
import type { Pool } from 'pg'
import type { StockEntry } from '../src/modules/inventory/application/stock-entry.ts'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// The opening-stock step of the curated loader (T-E6.5, gate G-S8-D4, standing order 16). It is the one step that changes a
// row: it sets a stock row that still holds the migration's 0 (on hand 0 and no history row), and nothing else. A quantity
// a person set, even back to 0, is never touched. Each set goes through the inventory set-stock use case, so it leaves one
// `set` history row in the same transaction. The acting user is the store's owner, because `actor_user_id` is a uuid.

export const openingStockReason = 'Opening stock (seed)'

// What the loader reads for one SKU of the store: its row and whether any history row exists for it.
export interface StockState {
  onHand: number
  hasHistory: boolean
}

export interface OpeningStockInput {
  // The data file: quantity per SKU code.
  quantities: Record<string, number>
  // The store's live SKUs by code.
  skuIdByCode: ReadonlyMap<string, string>
  // The stock rows of those SKUs by SKU id. A SKU with no row is left out.
  stock: ReadonlyMap<string, StockState>
  // Codes of keepsakes this run is about to create (a dry-run only). They get a row of 0 and no history when created.
  pendingCodes?: ReadonlySet<string>
  // The user of the earliest accepted owner membership, or null.
  ownerUserId: string | null
  storeId: string
}

export type OpeningStockDecision
  = | { action: 'set', code: string, skuId: string | null, from: 0, to: number }
    | { action: 'skip', code: string, reason: string }

export interface OpeningStockPlan {
  decisions: OpeningStockDecision[]
  // Each fault names a code or the store, never a connection string. Any fault stops the loader before it writes.
  faults: string[]
}

// Decides per SKU code of the data file, in the file's order.
export function planOpeningStock({ quantities, skuIdByCode, stock, pendingCodes, ownerUserId, storeId }: OpeningStockInput): OpeningStockPlan {
  const decisions: OpeningStockDecision[] = []
  const faults: string[] = []
  if (!ownerUserId)
    faults.push(`Store ${storeId} has no accepted owner membership, so there is no user to act as.`)
  for (const [code, quantity] of Object.entries(quantities)) {
    if (pendingCodes?.has(code)) {
      decisions.push(quantity === 0 ? { action: 'skip', code, reason: 'quantity 0 in the data file, left alone' } : { action: 'set', code, skuId: null, from: 0, to: quantity })
      continue
    }
    const skuId = skuIdByCode.get(code)
    if (!skuId) {
      faults.push(`The opening stock names the SKU code ${code}, which no keepsake of the store has.`)
      continue
    }
    const row = stock.get(skuId)
    if (!row) {
      faults.push(`SKU ${code} has no stock row.`)
      continue
    }
    if (quantity === 0)
      decisions.push({ action: 'skip', code, reason: 'quantity 0 in the data file, left alone' })
    else if (row.hasHistory)
      decisions.push({ action: 'skip', code, reason: `${row.onHand} in stock, already set by a person` })
    else if (row.onHand !== 0)
      decisions.push({ action: 'skip', code, reason: `${row.onHand} in stock, not the migration's 0` })
    else
      decisions.push({ action: 'set', code, skuId, from: 0, to: quantity })
  }
  return { decisions, faults }
}

export function describeDecision(decision: OpeningStockDecision): string {
  return decision.action === 'set' ? `${decision.code}: ${decision.from} to ${decision.to}` : `${decision.code}: skipped (${decision.reason})`
}

export function loadOpeningStock(): Record<string, number> {
  return parseOpeningStock(JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'seed-data', 'curated', 'opening-stock.json'), 'utf8')))
}

// True once migration 0021 has made the inventory tables, so a dry run on an older database says so instead of failing.
export async function openingStockReady(pool: Pool): Promise<boolean> {
  const { rows } = await pool.query<{ ready: boolean }>(`select to_regclass('inventory.stock_items') is not null and to_regclass('inventory.stock_adjustments') is not null as ready`)
  return rows[0]?.ready === true
}

// A data file of a SKU code to a whole quantity of 0 or more.
export function parseOpeningStock(raw: unknown): Record<string, number> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
    throw new Error('The opening-stock file must be an object of SKU code to quantity.')
  for (const [code, quantity] of Object.entries(raw)) {
    if (!Number.isInteger(quantity) || (quantity as number) < 0)
      throw new Error(`The opening stock of ${code} must be a whole number of 0 or more.`)
  }
  return { ...raw } as Record<string, number>
}

// The earliest accepted owner of the store (ties by user id). identity.store_memberships has no uuid problem: user_id is one.
export async function findOwnerUserId(pool: Pool, storeId: string): Promise<string | null> {
  const { rows } = await pool.query<{ user_id: string }>(`select user_id from identity.store_memberships where store_id = $1 and role = 'owner' and accepted_at is not null order by accepted_at, user_id limit 1`, [storeId])
  return rows[0]?.user_id ?? null
}

// The live SKUs by code, their stock rows and whether each has history. Plain reads, so a dry run writes nothing.
export async function readOpeningStockState(pool: Pool, storeId: string, codes: string[]): Promise<Pick<OpeningStockInput, 'skuIdByCode' | 'stock'>> {
  const skus = await pool.query<{ id: string, sku_code: string }>(`select id, sku_code from catalog.skus where store_id = $1 and status <> 'archived' and sku_code = any($2::text[])`, [storeId, codes])
  const ids = skus.rows.map(row => row.id)
  const rows = await pool.query<{ sku_id: string, on_hand: number, has_history: boolean }>(
    `select i.sku_id, i.on_hand, exists (select 1 from inventory.stock_adjustments a where a.sku_id = i.sku_id) as has_history
       from inventory.stock_items i where i.store_id = $1 and i.sku_id = any($2::uuid[])`,
    [storeId, ids],
  )
  return {
    skuIdByCode: new Map(skus.rows.map(row => [row.sku_code, row.id])),
    stock: new Map(rows.rows.map(row => [row.sku_id, { onHand: row.on_hand, hasHistory: row.has_history }])),
  }
}

export type SetStock = (actor: Actor, storeId: string, skuId: string, onHand: number, requestId: string | null, reason?: string) => Promise<{ ok: true, value: StockEntry } | { ok: false, reason: string }>

// Plans from the database as it is now. `pendingCodes` is for a dry run before the keepsakes exist.
export async function planFromDatabase(pool: Pool, storeId: string, quantities: Record<string, number>, pendingCodes?: ReadonlySet<string>): Promise<OpeningStockPlan & { ownerUserId: string | null }> {
  const [ownerUserId, state] = await Promise.all([findOwnerUserId(pool, storeId), readOpeningStockState(pool, storeId, Object.keys(quantities))])
  return { ...planOpeningStock({ quantities, ...state, pendingCodes, ownerUserId, storeId }), ownerUserId }
}

// Applies the sets of a plan with no fault, one use-case call each (each in its own transaction with its history row).
export async function applyOpeningStock(setStock: SetStock, storeId: string, ownerUserId: string, decisions: OpeningStockDecision[]): Promise<number> {
  const actor: Actor = { kind: 'staff', userId: ownerUserId, guestId: ownerUserId, stores: new Map([[storeId, 'owner' as const]]) }
  let changed = 0
  for (const decision of decisions) {
    if (decision.action !== 'set')
      continue
    if (!decision.skuId)
      throw new Error(`The SKU ${decision.code} was not found after the keepsakes were created.`)
    const result = await setStock(actor, storeId, decision.skuId, decision.to, null, openingStockReason)
    if (!result.ok)
      throw new Error(`The opening stock of ${decision.code} was refused: ${result.reason}`)
    changed += 1
  }
  return changed
}
