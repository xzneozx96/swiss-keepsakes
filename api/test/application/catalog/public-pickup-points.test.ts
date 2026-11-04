import type { PublicKeepsakeReads, PublicKeepsakeRow } from '../../../src/modules/catalog/application/public-keepsakes.ts'
import type { PickupPlace } from '../../../src/modules/catalog/ports.ts'
import { describe, expect, it, vi } from 'vitest'
import { makeGetPickupPoints } from '../../../src/modules/catalog/application/public-keepsakes.ts'

const store = '0190f0c2-0000-7000-8000-00000000000a'
const doc = (text: string) => ({ type: 'doc' as const, content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })

function keepsake(over: Partial<PublicKeepsakeRow> = {}): PublicKeepsakeRow {
  return {
    id: '0190f0c2-0000-7000-8000-0000000000e1',
    storeId: store,
    slug: { en: 'swiss-knife', de: 'taschenmesser' },
    name: { en: 'Swiss knife', de: 'Taschenmesser' },
    text: { en: doc('A red knife'), de: doc('Ein rotes Messer') },
    mediaIds: [],
    options: [],
    variants: [],
    skuIds: [],
    ...over,
  }
}

function place(n: number, over: Partial<PickupPlace> = {}): PickupPlace {
  return {
    id: `0190f0c2-0000-7000-8000-0000000000f${n}`,
    storeId: store,
    name: { en: `Shop ${n}`, de: `Laden ${n}` },
    address: { en: `Street ${n}`, de: `Strasse ${n}` },
    mapsLink: `https://www.google.com/maps/place/Shop${n}/@47.05,8.30,17z`,
    latitude: 47.05,
    longitude: 8.3,
    instructions: null,
    position: n,
    archived: false,
    hours: [{ weekday: 1, opens: '09:00', closes: '17:00' }],
    rowVersion: 3,
    ...over,
  }
}

function setup(rows: PublicKeepsakeRow[], places: PickupPlace[]) {
  const reads: PublicKeepsakeReads<null> = {
    listPublished: async () => rows,
    findPublishedBySlug: async (_tx, slug) => rows.find(r => r.slug.en === slug || r.slug.de === slug),
  }
  const list = vi.fn(async (_tx: null, storeId: string, archived: boolean) => places.filter(p => p.storeId === storeId && p.archived === archived))
  const getPickupPoints = makeGetPickupPoints({ uow: { run: work => work(null) }, reads, media: { find: async () => [] }, pickups: { list } })
  return { getPickupPoints, list }
}

describe('[E6.4][AC26] the public pickup points', () => {
  it('[E6.4][AC26] AC-1: asks for the active points of the keepsake\'s store and answers only the guest fields', async () => {
    const { getPickupPoints, list } = setup([keepsake()], [place(1), place(2, { instructions: { en: 'Ring the bell' } }), place(3)])

    const result = await getPickupPoints('swiss-knife', 'en')

    expect(list).toHaveBeenCalledWith(null, store, false)
    expect(result).toEqual({
      ok: true,
      value: {
        items: [
          { id: place(1).id, name: 'Shop 1', address: 'Street 1', instructions: null, mapsUrl: place(1).mapsLink, hours: [{ weekday: 1, opens: '09:00', closes: '17:00' }] },
          { id: place(2).id, name: 'Shop 2', address: 'Street 2', instructions: 'Ring the bell', mapsUrl: place(2).mapsLink, hours: [{ weekday: 1, opens: '09:00', closes: '17:00' }] },
          { id: place(3).id, name: 'Shop 3', address: 'Street 3', instructions: null, mapsUrl: place(3).mapsLink, hours: [{ weekday: 1, opens: '09:00', closes: '17:00' }] },
        ],
      },
    })
    const text = JSON.stringify(result)
    expect(text).not.toContain(store)
    expect(text).not.toMatch(/latitude|longitude|position|archived|rowVersion/)
  })

  it('[E6.4][AC64] AC-2: a German guest gets the German text, and the English one for a point with no German', async () => {
    const { getPickupPoints } = setup([keepsake()], [place(1), place(2, { name: { en: 'English only' }, address: { en: 'Only street' }, instructions: { en: 'Only note' } })])

    const result = await getPickupPoints('taschenmesser', 'de')

    expect(result).toMatchObject({ ok: true, value: { items: [{ name: 'Laden 1', address: 'Strasse 1' }, { name: 'English only', address: 'Only street', instructions: 'Only note' }] } })
  })

  it('[E6.4][AC64] AC-2: an unknown slug, or a keepsake with no readable language, is not found, and no point is read', async () => {
    const unreadable = keepsake({ slug: { en: 'draft-ish' }, name: {}, text: {} })
    const { getPickupPoints, list } = setup([unreadable], [place(1)])

    expect(await getPickupPoints('nothing', 'en')).toEqual({ ok: false, reason: 'not-found' })
    expect(await getPickupPoints('draft-ish', 'en')).toEqual({ ok: false, reason: 'not-found' })
    expect(list).not.toHaveBeenCalled()
  })

  it('[E6.4][AC26] a store with no active point answers an empty list, not a 404', async () => {
    const { getPickupPoints } = setup([keepsake()], [])

    expect(await getPickupPoints('swiss-knife', 'en')).toEqual({ ok: true, value: { items: [] } })
  })
})
