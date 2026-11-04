import type { Actor } from '@sk/domain/identity'
import type { PickupDeps } from '../../../src/modules/catalog/application/deps.ts'
import type { PickupPlace, PickupPlaceRepository, SalesDirectory } from '../../../src/modules/catalog/ports.ts'
import { PICKUP_MAX_PLACES as CONTRACT_MAX_PLACES } from '@sk/api-contract'
import { describe, expect, it, vi } from 'vitest'
import { makeArchivePickupPlace, makeCreatePickupPlace, makeDeletePickupPlace, makeGetPickupPlace, makeListPickupPlaces, makeReorderPickupPlaces, makeRestorePickupPlace, makeSavePickupPlace } from '../../../src/modules/catalog/application/pickup-places.ts'
import { PICKUP_MAX_PLACES } from '../../../src/modules/catalog/application/pickup-rules.ts'

const storeId = '0190f0c2-0000-7000-8000-00000000000a'
const owner: Actor = { kind: 'staff', userId: 'u1', guestId: 'g-u1', stores: new Map([[storeId, 'owner']]) }
const guest: Actor = { kind: 'guest', userId: 'g1', guestId: 'g-g1' }

function place(id: string, over: Partial<PickupPlace> = {}): PickupPlace {
  return {
    id,
    storeId,
    name: { en: 'Shop' },
    address: { en: 'Hertensteinstrasse 1' },
    mapsLink: 'https://maps.app.goo.gl/AbCdEf123',
    latitude: 47.0507,
    longitude: 8.3068,
    instructions: null,
    position: 1,
    archived: false,
    hours: [{ weekday: 1, opens: '10:00', closes: '18:00' }],
    rowVersion: 3,
    ...over,
  }
}

function setup(rows: PickupPlace[] = [place('a'), place('b', { position: 2 })]) {
  const repo = {
    find: vi.fn(async (_tx: null, _store: string, id: string) => rows.find(row => row.id === id)),
    lockList: vi.fn(async () => {}),
    countActive: vi.fn(async () => rows.filter(row => !row.archived).length),
    list: vi.fn(async (_tx: null, _store: string, archived: boolean) => rows.filter(row => row.archived === archived)),
    insert: vi.fn(async (_tx: null, _store: string, input: { name: object }) => place('new', { ...input })),
    save: vi.fn(async (_tx: null, current: PickupPlace) => current),
    setPositions: vi.fn(async () => {}),
    setArchived: vi.fn(async (_tx: null, current: PickupPlace) => current),
    remove: vi.fn(async () => {}),
  } as unknown as PickupPlaceRepository<null>
  const maps = { positionOf: vi.fn(async (_link: string): Promise<{ latitude: number, longitude: number } | undefined> => ({ latitude: 46.9, longitude: 7.4 })) }
  const deps: PickupDeps<null> = {
    uow: { run: vi.fn(work => work(null)) },
    pickups: repo,
    maps,
    audit: { record: vi.fn(async () => {}) },
    clock: { now: () => new Date('2026-11-03T08:00:00Z') },
  }
  return { repo, deps, maps }
}

const link = 'https://maps.app.goo.gl/NewLink99'
const body = { name: { en: 'Hotel' }, address: { de: 'Strasse 2' }, mapsLink: link, hours: [{ weekday: 1, opens: '10:00', closes: '18:00' }] }

describe('[E6.6][AC26] pickup point use cases', () => {
  it('[E6.6][AC26] a guest is forbidden on every use case and the repository is not touched', async () => {
    const { repo, deps } = setup()
    const results = [
      await makeListPickupPlaces(deps)(guest, storeId, false),
      await makeGetPickupPlace(deps)(guest, storeId, 'a'),
      await makeCreatePickupPlace(deps)(guest, storeId, body, null),
      await makeSavePickupPlace(deps)(guest, storeId, 'a', 3, { name: { en: 'X' } }, null),
      await makeReorderPickupPlaces(deps)(guest, storeId, ['a', 'b'], null),
      await makeArchivePickupPlace(deps)(guest, storeId, 'a', 3, null),
      await makeRestorePickupPlace(deps)(guest, storeId, 'a', 3, null),
      await makeDeletePickupPlace(deps)(guest, storeId, 'a', 3, null),
    ]

    for (const result of results)
      expect(result).toMatchObject({ ok: false, reason: 'forbidden' })
    for (const call of Object.values(repo))
      expect(call).not.toHaveBeenCalled()
    expect(deps.audit.record).not.toHaveBeenCalled()
  })

  it('[E6.6][AC26] the use case limit equals the cap on the order body', () => {
    expect(PICKUP_MAX_PLACES).toBe(CONTRACT_MAX_PLACES)
  })

  it('[E6.6][AC26] create at the limit of 100 active points is too-many and writes nothing; one below it passes', async () => {
    const { repo, deps } = setup()
    vi.mocked(repo.countActive).mockResolvedValue(PICKUP_MAX_PLACES)

    expect(await makeCreatePickupPlace(deps)(owner, storeId, body, null)).toMatchObject({ ok: false, reason: 'too-many' })
    expect(repo.insert).not.toHaveBeenCalled()
    expect(deps.audit.record).not.toHaveBeenCalled()
    vi.mocked(repo.countActive).mockResolvedValue(PICKUP_MAX_PLACES - 1)
    expect(await makeCreatePickupPlace(deps)(owner, storeId, body, null)).toMatchObject({ ok: true })
  })

  it('[E6.6][AC26] restore with 100 active points is too-many and writes nothing; with 99 it restores', async () => {
    const { repo, deps } = setup([place('a', { archived: true }), place('b')])
    vi.mocked(repo.countActive).mockResolvedValue(PICKUP_MAX_PLACES)

    expect(await makeRestorePickupPlace(deps)(owner, storeId, 'a', 3, null)).toMatchObject({ ok: false, reason: 'too-many' })
    expect(repo.setArchived).not.toHaveBeenCalled()
    expect(deps.audit.record).not.toHaveBeenCalled()
    vi.mocked(repo.countActive).mockResolvedValue(PICKUP_MAX_PLACES - 1)
    expect(await makeRestorePickupPlace(deps)(owner, storeId, 'a', 3, null)).toMatchObject({ ok: true })
    expect(repo.setArchived).toHaveBeenCalledTimes(1)
  })

  it('[E6.6][AC26] archive and restore take the same store list lock as create and reorder, before the row', async () => {
    const { repo, deps } = setup([place('a', { archived: true }), place('b')])

    await makeRestorePickupPlace(deps)(owner, storeId, 'a', 3, null)
    await makeArchivePickupPlace(deps)(owner, storeId, 'b', 3, null)
    expect(repo.lockList).toHaveBeenCalledTimes(2)
    expect(vi.mocked(repo.lockList).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(repo.find).mock.invocationCallOrder[0]!)
  })

  it('[E6.6][AC26] create answers invalid with every wrong path and writes nothing', async () => {
    const { repo, deps } = setup()
    const result = await makeCreatePickupPlace(deps)(owner, storeId, { name: {}, address: { en: ' ' }, mapsLink: link, hours: [{ weekday: 8, opens: '10:00', closes: '10:00' }] }, null)

    expect(result).toMatchObject({ ok: false, reason: 'invalid' })
    expect(result.ok === false && result.reason === 'invalid' && result.errors.map(error => error.path)).toEqual(['name', 'address', 'hours.0.weekday', 'hours.0.closes'])
    expect(repo.insert).not.toHaveBeenCalled()
  })

  it('[E6.6][AC26] create trims the text and writes once', async () => {
    const { repo, deps } = setup()
    const result = await makeCreatePickupPlace(deps)(owner, storeId, { ...body, name: { en: ' Hotel ', de: '' } }, null)

    expect(result.ok).toBe(true)
    expect(repo.insert).toHaveBeenCalledWith(null, storeId, expect.objectContaining({ name: { en: 'Hotel' }, instructions: null }), expect.any(Date))
  })

  it('[E6.6][AC26] an old version is stale and nothing is written', async () => {
    const { repo, deps } = setup()

    expect(await makeSavePickupPlace(deps)(owner, storeId, 'a', 2, { name: { en: 'X' } }, null)).toMatchObject({ reason: 'stale' })
    expect(await makeArchivePickupPlace(deps)(owner, storeId, 'a', 2, null)).toMatchObject({ reason: 'stale' })
    expect(repo.save).not.toHaveBeenCalled()
    expect(repo.setArchived).not.toHaveBeenCalled()
  })

  it('[E6.6][AC26] a save with wrong hours is invalid and an unknown point is not found', async () => {
    const { repo, deps } = setup()

    expect(await makeSavePickupPlace(deps)(owner, storeId, 'a', 3, { hours: [{ weekday: 1, opens: '9:5', closes: '12:00' }] }, null)).toMatchObject({ reason: 'invalid', errors: [{ path: 'hours.0.opens' }] })
    expect(await makeSavePickupPlace(deps)(owner, storeId, 'zz', 3, { name: { en: 'X' } }, null)).toMatchObject({ reason: 'not-found' })
    expect(repo.save).not.toHaveBeenCalled()
  })

  it('[E6.6][AC26] a save that blanks the only name language is invalid', async () => {
    const { deps } = setup()

    expect(await makeSavePickupPlace(deps)(owner, storeId, 'a', 3, { name: { en: ' ' } }, null)).toMatchObject({ reason: 'invalid', errors: [{ path: 'name' }] })
  })

  it('[E6.6][AC26] a reorder with a missing, extra or repeated id is refused and changes nothing', async () => {
    const { repo, deps } = setup()
    const reorder = makeReorderPickupPlaces(deps)

    expect(await reorder(owner, storeId, ['a'], null)).toMatchObject({ reason: 'order-mismatch' })
    expect(await reorder(owner, storeId, ['a', 'b', 'c'], null)).toMatchObject({ reason: 'order-mismatch' })
    expect(await reorder(owner, storeId, ['a', 'a'], null)).toMatchObject({ reason: 'order-mismatch' })
    // An archived point is not part of the order: naming it is a mismatch.
    const withArchived = setup([place('a'), place('b', { position: 2 }), place('z', { archived: true, position: 3 })])
    expect(await makeReorderPickupPlaces(withArchived.deps)(owner, storeId, ['a', 'b', 'z'], null)).toMatchObject({ reason: 'order-mismatch' })
    expect(repo.setPositions).not.toHaveBeenCalled()
    expect(await reorder(owner, storeId, ['b', 'a'], null)).toMatchObject({ ok: true })
    expect(repo.setPositions).toHaveBeenCalledWith(null, storeId, ['b', 'a'], expect.any(Date))
  })

  it('[E6.6][AC26] archiving an archived point, or restoring an active one, returns it without a write', async () => {
    const { repo, deps } = setup([place('a', { archived: true }), place('b')])

    expect(await makeArchivePickupPlace(deps)(owner, storeId, 'a', 3, null)).toMatchObject({ ok: true, value: { id: 'a', archived: true } })
    expect(await makeRestorePickupPlace(deps)(owner, storeId, 'b', 3, null)).toMatchObject({ ok: true, value: { id: 'b', archived: false } })
    expect(repo.setArchived).not.toHaveBeenCalled()
    expect(await makeRestorePickupPlace(deps)(owner, storeId, 'a', 3, null)).toMatchObject({ ok: true })
    expect(repo.setArchived).toHaveBeenCalledWith(null, expect.objectContaining({ id: 'a' }), false, expect.any(Date))
  })

  it('[E6.6][AC26] each write records one audit entry with the entity, the action and the point id', async () => {
    const { deps } = setup([place('a'), place('b', { position: 2 }), place('c', { archived: true, position: 3 })])
    const record = vi.mocked(deps.audit.record)
    const last = () => record.mock.lastCall![1]

    await makeCreatePickupPlace(deps)(owner, storeId, body, 'req-1')
    expect(last()).toMatchObject({ storeId, entity: 'pickup_place', entityId: 'new', action: 'created', requestId: 'req-1' })
    await makeSavePickupPlace(deps)(owner, storeId, 'a', 3, { name: { en: 'X' } }, 'req-2')
    expect(last()).toMatchObject({ entity: 'pickup_place', entityId: 'a', action: 'updated', requestId: 'req-2' })
    await makeReorderPickupPlaces(deps)(owner, storeId, ['b', 'a'], 'req-3')
    expect(last()).toMatchObject({ entity: 'pickup_place', entityId: storeId, action: 'reordered', before: { ids: ['a', 'b'] }, after: { ids: ['b', 'a'] } })
    await makeArchivePickupPlace(deps)(owner, storeId, 'a', 3, 'req-4')
    expect(last()).toMatchObject({ entity: 'pickup_place', entityId: 'a', action: 'archived' })
    await makeRestorePickupPlace(deps)(owner, storeId, 'c', 3, 'req-5')
    expect(last()).toMatchObject({ entity: 'pickup_place', entityId: 'c', action: 'restored' })
    expect(record).toHaveBeenCalledTimes(5)
  })

  it('[S8-PICKUP-MAPS] create reads the pin from the link before the transaction and stores the link and the pin', async () => {
    const { repo, deps, maps } = setup()
    const result = await makeCreatePickupPlace(deps)(owner, storeId, body, null)

    expect(result).toMatchObject({ ok: true })
    expect(maps.positionOf).toHaveBeenCalledWith(link)
    expect(vi.mocked(maps.positionOf).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(deps.uow.run).mock.invocationCallOrder[0]!)
    expect(repo.insert).toHaveBeenCalledWith(null, storeId, expect.objectContaining({ mapsLink: link, latitude: 46.9, longitude: 7.4 }), expect.any(Date))
  })

  it('[S8-PICKUP-MAPS] create with a link that holds no position is maps-link-unreadable and opens no transaction', async () => {
    const { repo, deps, maps } = setup()
    vi.mocked(maps.positionOf).mockResolvedValue(undefined)

    expect(await makeCreatePickupPlace(deps)(owner, storeId, body, null)).toEqual({ ok: false, reason: 'maps-link-unreadable' })
    expect(deps.uow.run).not.toHaveBeenCalled()
    expect(repo.insert).not.toHaveBeenCalled()
  })

  it('[S8-PICKUP-MAPS] create with wrong text is invalid without reading the link', async () => {
    const { deps, maps } = setup()

    expect(await makeCreatePickupPlace(deps)(owner, storeId, { ...body, name: {} }, null)).toMatchObject({ ok: false, reason: 'invalid' })
    expect(maps.positionOf).not.toHaveBeenCalled()
  })

  it('[S8-PICKUP-MAPS] a save with a new link moves the pin; a save without one keeps link and pin and reads nothing', async () => {
    const { repo, deps, maps } = setup()

    await makeSavePickupPlace(deps)(owner, storeId, 'a', 3, { mapsLink: link }, null)
    expect(maps.positionOf).toHaveBeenCalledWith(link)
    expect(repo.save).toHaveBeenLastCalledWith(null, expect.objectContaining({ id: 'a' }), expect.objectContaining({ map: { mapsLink: link, latitude: 46.9, longitude: 7.4 } }), expect.any(Date))

    vi.mocked(maps.positionOf).mockClear()
    await makeSavePickupPlace(deps)(owner, storeId, 'a', 3, { name: { en: 'X' } }, null)
    expect(maps.positionOf).not.toHaveBeenCalled()
    expect(vi.mocked(repo.save).mock.lastCall![2]).not.toHaveProperty('map')
  })

  it('[S8-PICKUP-MAPS] a save with an unreadable link is refused and writes nothing; a guest never reaches the link', async () => {
    const { repo, deps, maps } = setup()
    vi.mocked(maps.positionOf).mockResolvedValue(undefined)

    expect(await makeSavePickupPlace(deps)(owner, storeId, 'a', 3, { mapsLink: link }, null)).toEqual({ ok: false, reason: 'maps-link-unreadable' })
    expect(repo.save).not.toHaveBeenCalled()
    vi.mocked(maps.positionOf).mockClear()
    expect(await makeSavePickupPlace(deps)(guest, storeId, 'a', 3, { mapsLink: link }, null)).toMatchObject({ reason: 'forbidden' })
    expect(await makeCreatePickupPlace(deps)(guest, storeId, body, null)).toMatchObject({ reason: 'forbidden' })
    expect(maps.positionOf).not.toHaveBeenCalled()
  })

  it('[S8-PICKUP-MAPS] the audit entry holds the link and the pin', async () => {
    const { deps } = setup()
    await makeCreatePickupPlace(deps)(owner, storeId, body, null)

    expect(vi.mocked(deps.audit.record).mock.lastCall![1].after).toMatchObject({ mapsLink: expect.any(String), latitude: expect.any(Number), longitude: expect.any(Number) })
  })

  describe('[S8-PICKUP-DELETE] delete', () => {
    const usedBy = (...ids: string[]): SalesDirectory<null> => ({ soldProductIds: async () => new Set<string>(), soldSkuIds: async () => new Set<string>(), usedPickupPlaceIds: vi.fn(async (_tx: null, _store: string, asked: string[]) => new Set(asked.filter(id => ids.includes(id)))) })

    it('deletes an active or an archived point that nothing names, records one audit entry, and keeps the others', async () => {
      const { repo, deps } = setup([place('a'), place('b', { position: 2, archived: true })])

      expect(await makeDeletePickupPlace(deps)(owner, storeId, 'a', 3, 'req-1')).toEqual({ ok: true, value: { id: 'a' } })
      expect(await makeDeletePickupPlace(deps)(owner, storeId, 'b', 3, 'req-2')).toEqual({ ok: true, value: { id: 'b' } })
      expect(repo.remove).toHaveBeenCalledTimes(2)
      expect(repo.remove).toHaveBeenNthCalledWith(1, null, expect.objectContaining({ id: 'a' }))
      expect(deps.audit.record).toHaveBeenNthCalledWith(1, null, expect.objectContaining({ storeId, entity: 'pickup_place', entityId: 'a', action: 'deleted', requestId: 'req-1', before: expect.objectContaining({ name: { en: 'Shop' }, archived: false }) }))
      expect(vi.mocked(deps.audit.record).mock.calls[0]![1]).not.toHaveProperty('after')
    })

    it('deletes when the point is not among the used ones of the sales port', async () => {
      const { repo, deps } = setup()
      const sales = usedBy('b')

      expect(await makeDeletePickupPlace({ ...deps, sales })(owner, storeId, 'a', 3, null)).toMatchObject({ ok: true })
      expect(sales.usedPickupPlaceIds).toHaveBeenCalledWith(null, storeId, ['a'])
      expect(repo.remove).toHaveBeenCalledTimes(1)
    })

    it('refuses a point that an order or a handover names: in-use, nothing removed, nothing audited', async () => {
      const { repo, deps } = setup()

      expect(await makeDeletePickupPlace({ ...deps, sales: usedBy('a') })(owner, storeId, 'a', 3, null)).toMatchObject({ ok: false, reason: 'in-use' })
      expect(repo.remove).not.toHaveBeenCalled()
      expect(deps.audit.record).not.toHaveBeenCalled()
    })

    it('refuses a stale If-Match with stale, and an unknown or other-store point with not-found', async () => {
      const { repo, deps } = setup()

      expect(await makeDeletePickupPlace(deps)(owner, storeId, 'a', 2, null)).toMatchObject({ ok: false, reason: 'stale' })
      expect(await makeDeletePickupPlace(deps)(owner, storeId, 'zzz', 3, null)).toMatchObject({ ok: false, reason: 'not-found' })
      expect(repo.remove).not.toHaveBeenCalled()
      expect(deps.audit.record).not.toHaveBeenCalled()
    })

    it('a staff member of another store is forbidden and the repository is not touched', async () => {
      const { repo, deps } = setup()
      const other: Actor = { kind: 'staff', userId: 'u2', guestId: 'g-u2', stores: new Map([['0190f0c2-0000-7000-8000-00000000000b', 'owner']]) }

      expect(await makeDeletePickupPlace(deps)(other, storeId, 'a', 3, null)).toMatchObject({ ok: false, reason: 'forbidden' })
      expect(repo.find).not.toHaveBeenCalled()
    })

    it('takes the list lock before the row, like archive, so a reorder never reads a point that is leaving', async () => {
      const { repo, deps } = setup()
      await makeDeletePickupPlace(deps)(owner, storeId, 'a', 3, null)

      const lock = vi.mocked(repo.lockList).mock.invocationCallOrder[0]!
      const row = vi.mocked(repo.find).mock.invocationCallOrder[0]!
      expect(lock).toBeLessThan(row)
      expect(repo.find).toHaveBeenCalledWith(null, storeId, 'a', true)
    })
  })
})
