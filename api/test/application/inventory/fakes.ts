import type { Actor } from '@sk/domain/identity'
import type { InventoryDeps } from '../../../src/modules/inventory/application/deps.ts'
import type { LiveSku, MediaInfo, Reservation, StockLevel, StockRepository } from '../../../src/modules/inventory/ports.ts'
import { vi } from 'vitest'

export const storeId = '0190f0c2-0000-7000-8000-00000000000a'
export const owner: Actor = { kind: 'staff', userId: 'u1', guestId: 'g-u1', stores: new Map([[storeId, 'owner']]) }
export const outsider: Actor = { kind: 'staff', userId: 'u2', guestId: 'g-u2', stores: new Map() }
export const guest: Actor = { kind: 'guest', userId: 'g1', guestId: 'g-g1' }

export const id = (n: number) => `0190f0c2-0000-7000-8000-${String(n).padStart(12, '0')}`

export function sku(n: number, over: Partial<LiveSku> = {}): LiveSku {
  return { skuId: id(n), productId: id(900 + n), code: `VX-${n}`, keepsakeName: { en: 'Victorinox' }, variantTitle: { en: `Size ${n}` }, mediaId: null, keepsakePhotoId: null, ...over }
}

export const file = (fileId: string): MediaInfo => ({ id: fileId, kind: 'image', status: 'ready', name: 'f.jpg', contentType: 'image/jpeg', byteSize: 1, width: 1, height: 1, publicUrl: `https://cdn/${fileId}`, variants: [] })

// An in-memory stock table. `sets` records each write, so a test can say that nothing was written.
export function setup(skus: LiveSku[], stock: Record<string, [onHand: number, reserved: number]> = {}, holds: Record<string, Reservation[]> = {}, files: string[] = []) {
  const rows = new Map<string, StockLevel>(Object.entries(stock).map(([skuId, [onHand, reserved]]) => [skuId, { skuId, onHand, reserved }]))
  const sets: { skuId: string, before: number, after: number, actorUserId: string, at: Date, reason?: string }[] = []
  const locked: string[][] = []
  const seeded: { storeId: string, items: { skuId: string, quantity: number }[], actorUserId: string }[] = []
  const repo: StockRepository<null> = {
    levels: async (_tx, _store, ids) => [...rows.values()].filter(row => !ids || ids.includes(row.skuId)),
    lock: async (_tx, _store, ids) => {
      locked.push(ids)
      for (const skuId of ids) {
        if (!rows.has(skuId))
          rows.set(skuId, { skuId, onHand: 0, reserved: 0 })
      }
      return ids.map(skuId => ({ ...rows.get(skuId)! }))
    },
    seed: async (_tx, store, items, actorUserId) => {
      seeded.push({ storeId: store, items, actorUserId })
      for (const { skuId, quantity } of items) {
        if (rows.has(skuId))
          throw new Error('duplicate stock row')
        rows.set(skuId, { skuId, onHand: quantity, reserved: 0 })
      }
    },
    openHolds: async (_tx, _store, skuId) => holds[skuId] ?? [],
    set: async (_tx, change) => {
      sets.push({ skuId: change.skuId, before: change.before, after: change.after, actorUserId: change.actorUserId, at: change.at, reason: change.reason })
      rows.get(change.skuId)!.onHand = change.after
    },
  }
  const audit = { record: vi.fn(async () => {}) }
  const deps: InventoryDeps<null> = {
    uow: { run: work => work(null) },
    stock: repo,
    skus: { liveSkus: async (_tx, _store, ids) => skus.filter(s => !ids || ids.includes(s.skuId)) },
    media: { find: async (_tx, _store, ids) => files.filter(f => ids.includes(f)).map(file) },
    audit,
    clock: { now: () => new Date('2026-11-03T08:00:00Z') },
  }
  return { deps, rows, sets, locked, seeded, audit }
}
