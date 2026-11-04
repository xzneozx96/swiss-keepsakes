import type { PublicKeepsakeDeps, PublicKeepsakeReads, PublicKeepsakeRow } from '../../../src/modules/catalog/application/public-keepsakes.ts'
import type { MediaInfo, StockLevel } from '../../../src/modules/catalog/ports.ts'
import { describe, expect, it, vi } from 'vitest'
import { makeGetAvailability, makeGetKeepsake, makeListKeepsakes } from '../../../src/modules/catalog/application/public-keepsakes.ts'

const store = '0190f0c2-0000-7000-8000-00000000000a'
const otherStore = '0190f0c2-0000-7000-8000-00000000000b'
const size = '0190f0c2-0000-7000-8000-0000000000a1'
const small = '0190f0c2-0000-7000-8000-0000000000b1'
const large = '0190f0c2-0000-7000-8000-0000000000b2'
const skuA = '0190f0c2-0000-7000-8000-0000000000c1'
const skuB = '0190f0c2-0000-7000-8000-0000000000c2'
const skuC = '0190f0c2-0000-7000-8000-0000000000c3'
const photoId = '0190f0c2-0000-7000-8000-0000000000d1'

const doc = (text: string) => ({ type: 'doc' as const, content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })

function photo(id: string, status: MediaInfo['status'] = 'ready'): MediaInfo {
  return { id, kind: 'image', status, name: 'a.jpg', contentType: 'image/jpeg', byteSize: 1, width: 1280, height: 960, publicUrl: `https://cdn.test/${id}.jpg`, variants: [{ width: 320, url: `https://cdn.test/${id}-320.webp` }] }
}

function row(over: Partial<PublicKeepsakeRow> = {}): PublicKeepsakeRow {
  return {
    id: '0190f0c2-0000-7000-8000-0000000000e1',
    storeId: store,
    slug: { en: 'swiss-knife', de: 'taschenmesser' },
    name: { en: 'Swiss knife', de: 'Taschenmesser' },
    text: { en: doc('A red knife'), de: doc('Ein rotes Messer') },
    mediaIds: [photoId],
    options: [{ id: size, name: { en: 'Size', de: 'Grösse' }, values: [{ id: small, label: { en: 'Small', de: 'Klein' } }, { id: large, label: { en: 'Large' } }] }],
    variants: [
      { id: skuA, mediaId: null, priceRappen: 3900, values: { [size]: small } },
      { id: skuB, mediaId: photoId, priceRappen: 4500, values: { [size]: large } },
    ],
    skuIds: [skuA, skuB],
    ...over,
  }
}

// `levels` is [onHand, reserved] by SKU id; a SKU left out has no stock row.
function setup(rows: PublicKeepsakeRow[], levels: Record<string, [number, number]> = {}, files: MediaInfo[] = [photo(photoId)]) {
  const reads: PublicKeepsakeReads<null> = {
    listPublished: async () => rows,
    findPublishedBySlug: async (_tx, slug, language) => {
      const found = rows.filter(r => r.slug.en === slug || r.slug.de === slug)
      return found.find(r => r.slug[language] === slug) ?? found[0]
    },
  }
  const stockLevels = vi.fn(async (_tx: null, _store: string, ids: string[]) => new Map<string, StockLevel>(ids.flatMap(id => (levels[id] ? [[id, { onHand: levels[id]![0], reserved: levels[id]![1] }] as const] : []))))
  const deps: PublicKeepsakeDeps<null> = {
    uow: { run: work => work(null) },
    reads,
    media: { find: async (_tx, _store, ids) => files.filter(f => ids.includes(f.id)) },
    stockLevels: { levels: stockLevels },
  }
  return { deps, stockLevels }
}

describe('[E6.4][AC53] the public list: sold out is a flag, never a figure', () => {
  it('[E6.4][AC53] AC-3: variant A at 0 and variant B at 4 is not sold out', async () => {
    const { deps } = setup([row()], { [skuA]: [0, 0], [skuB]: [4, 0] })

    const { items } = await makeListKeepsakes(deps)('en')

    expect(items.map(i => i.soldOut)).toEqual([false])
  })

  it('[E6.4][AC53] AC-3: every combination at 0, or with no stock row, or fully reserved, is sold out', async () => {
    const { deps } = setup([row()], { [skuA]: [0, 0], [skuB]: [3, 3] })
    const { deps: noRows } = setup([row()], {})

    expect((await makeListKeepsakes(deps)('en')).items[0]!.soldOut).toBe(true)
    expect((await makeListKeepsakes(noRows)('en')).items[0]!.soldOut).toBe(true)
  })

  it('[E6.4][AC54] AC-1: an item carries no price, amount, currency or stock figure, whatever the stock', async () => {
    const { deps } = setup([row()], { [skuA]: [12, 2], [skuB]: [4, 0] })

    const body = JSON.stringify(await makeListKeepsakes(deps)('en'))

    expect(body).not.toMatch(/price|amount|currency|rappen|onHand|reserved|available"|stock|3900|4500/i)
    expect(JSON.parse(body).items[0]).toMatchObject({ slug: 'swiss-knife', name: 'Swiss knife', soldOut: false, cover: { url: `https://cdn.test/${photoId}.jpg` }, language: 'en', requestedLanguage: 'en', fallback: false, availableLanguages: ['en', 'de'] })
  })

  it('[E6.4][AC64] AC-5: a keepsake with an English version only is listed for German with the fallback notice', async () => {
    const { deps } = setup([row({ slug: { en: 'swiss-knife' }, name: { en: 'Swiss knife' }, text: { en: doc('A red knife') } })], { [skuA]: [1, 0] })

    const { items } = await makeListKeepsakes(deps)('de')

    expect(items[0]).toMatchObject({ slug: 'swiss-knife', name: 'Swiss knife', language: 'en', requestedLanguage: 'de', fallback: true, availableLanguages: ['en'] })
  })

  it('[E6.4][AC53] reads the stock once per store for all listed SKUs, never one call per keepsake', async () => {
    const second = row({ id: '0190f0c2-0000-7000-8000-0000000000e2', storeId: otherStore, slug: { en: 'bag' }, name: { en: 'Bag' }, skuIds: [skuC], variants: [] })
    const third = row({ id: '0190f0c2-0000-7000-8000-0000000000e3', slug: { en: 'cap' }, name: { en: 'Cap' }, skuIds: [] })
    const { deps, stockLevels } = setup([row(), second, third], { [skuC]: [2, 0] })

    const { items } = await makeListKeepsakes(deps)('en')

    expect(stockLevels).toHaveBeenCalledTimes(2)
    expect(items.map(i => i.soldOut)).toEqual([true, false, true])
  })

  it('[E6.4][AC53] looks the covers up once per store for the whole list, never one query per keepsake', async () => {
    const second = '0190f0c2-0000-7000-8000-0000000000d2'
    const third = '0190f0c2-0000-7000-8000-0000000000d3'
    const rows = [
      row({ id: 'k1', slug: { en: 'one' }, name: { en: 'One' }, mediaIds: [photoId] }),
      row({ id: 'k2', slug: { en: 'two' }, name: { en: 'Two' }, mediaIds: [second] }),
      row({ id: 'k3', slug: { en: 'three' }, name: { en: 'Three' }, storeId: otherStore, mediaIds: [third] }),
    ]
    const { deps } = setup(rows, {}, [photo(photoId), photo(second), photo(third)])
    const find = vi.fn(deps.media.find)

    const { items } = await makeListKeepsakes({ ...deps, media: { find } })('en')

    expect(find).toHaveBeenCalledTimes(2)
    expect(find).toHaveBeenCalledWith(null, store, [photoId, second])
    expect(items.map(i => i.cover?.url)).toEqual([`https://cdn.test/${photoId}.jpg`, `https://cdn.test/${second}.jpg`, `https://cdn.test/${third}.jpg`])
  })

  it('[E6.4][AC53] without a stock port every keepsake reads sold out, as the merchant list reads 0', async () => {
    const { deps } = setup([row()], { [skuA]: [9, 0] })
    delete deps.stockLevels

    expect((await makeListKeepsakes(deps)('en')).items[0]!.soldOut).toBe(true)
  })

  it('[E6.4][AC31] a photo that is not ready is no cover', async () => {
    const { deps } = setup([row()], { [skuA]: [1, 0] }, [photo(photoId, 'retired')])

    expect((await makeListKeepsakes(deps)('en')).items[0]!.cover).toBeNull()
  })
})

describe('[E6.4][AC54][AC55][AC64] the public detail', () => {
  it('[E6.4][AC54][AC55] AC-1 AC-6: text, options and sold combinations, with no price, stock or engraving', async () => {
    const { deps } = setup([row()], { [skuA]: [0, 0], [skuB]: [4, 0] })

    const result = await makeGetKeepsake(deps)('swiss-knife', 'en')

    expect(result.ok).toBe(true)
    const body = JSON.stringify(result.ok && result.value)
    expect(body).not.toMatch(/price|amount|currency|rappen|onHand|reserved|stock|engrav|3900|4500/i)
    expect(result.ok && result.value).toMatchObject({
      slug: 'swiss-knife',
      name: 'Swiss knife',
      description: doc('A red knife'),
      photos: [{ url: `https://cdn.test/${photoId}.jpg`, variants: [{ width: 320, url: `https://cdn.test/${photoId}-320.webp` }] }],
      options: [{ id: size, name: 'Size', values: [{ id: small, label: 'Small' }, { id: large, label: 'Large' }] }],
      variants: [{ id: skuA, values: { [size]: small }, photo: null }, { id: skuB, values: { [size]: large }, photo: { url: `https://cdn.test/${photoId}.jpg` } }],
      soldOut: false,
    })
  })

  it('[E6.4][AC64] AC-5: with both languages and different slugs the English read names the German slug', async () => {
    const { deps } = setup([row()], { [skuA]: [1, 0] })

    const result = await makeGetKeepsake(deps)('swiss-knife', 'en')

    expect(result.ok && result.value).toMatchObject({ language: 'en', fallback: false, otherSlug: 'taschenmesser', availableLanguages: ['en', 'de'] })
  })

  it('[E6.4][AC64] AC-5: the German slug asked in German carries German text, names the English slug and a label missing in German falls back to English', async () => {
    const { deps } = setup([row()], { [skuA]: [1, 0] })

    const result = await makeGetKeepsake(deps)('taschenmesser', 'de')

    expect(result.ok && result.value).toMatchObject({ slug: 'taschenmesser', name: 'Taschenmesser', language: 'de', otherSlug: 'swiss-knife', description: doc('Ein rotes Messer') })
    expect(result.ok && result.value.options[0]!.values.map(v => v.label)).toEqual(['Klein', 'Large'])
  })

  it('[E6.4][AC64] AC-5: an English-only keepsake asked for German returns English text, a fallback notice and no German slug', async () => {
    const english = row({ slug: { en: 'swiss-knife' }, name: { en: 'Swiss knife' }, text: { en: doc('A red knife') } })
    const { deps } = setup([english], { [skuA]: [1, 0] })

    const result = await makeGetKeepsake(deps)('swiss-knife', 'de')

    expect(result.ok && result.value).toMatchObject({ slug: 'swiss-knife', language: 'en', requestedLanguage: 'de', fallback: true, availableLanguages: ['en'], otherSlug: null, description: doc('A red knife') })
  })

  it('[E6.4][AC64] a language with a name but no text is not offered', async () => {
    const half = row({ text: { en: doc('A red knife') } })
    const { deps } = setup([half], { [skuA]: [1, 0] })

    const result = await makeGetKeepsake(deps)('swiss-knife', 'en')

    expect(result.ok && result.value).toMatchObject({ availableLanguages: ['en'], otherSlug: null })
  })

  it('[E6.4][AC31] AC-4: a slug nobody published is a not-found failure', async () => {
    const { deps } = setup([row()])

    expect(await makeGetKeepsake(deps)('draft-one', 'en')).toEqual({ ok: false, reason: 'not-found' })
    expect(await makeGetAvailability(deps)('draft-one', 'en')).toEqual({ ok: false, reason: 'not-found' })
  })
})

describe('[E6.4][AC52][AC53] the availability read', () => {
  it('[E6.4][AC52][AC53] AC-2: SKUs of 4, 0 and 7 units show each price and units, the one with 0 shows 0', async () => {
    const three = row({
      variants: [
        { id: skuA, mediaId: null, priceRappen: 3900, values: { [size]: small } },
        { id: skuB, mediaId: null, priceRappen: 4500, values: { [size]: large } },
        { id: skuC, mediaId: null, priceRappen: 5200, values: {} },
      ],
      skuIds: [skuA, skuB, skuC],
    })
    const { deps } = setup([three], { [skuA]: [4, 0], [skuB]: [0, 0], [skuC]: [9, 2] })

    const result = await makeGetAvailability(deps)('swiss-knife', 'en')

    expect(result).toEqual({ ok: true, value: { items: [
      { variantId: skuA, priceRappen: 3900, currency: 'CHF', available: 4 },
      { variantId: skuB, priceRappen: 4500, currency: 'CHF', available: 0 },
      { variantId: skuC, priceRappen: 5200, currency: 'CHF', available: 7 },
    ] } })
  })

  it('[E6.4][AC53] AC-3: A at 0 and B at 4 reads 0 for A only; no stock row, or reserved above on hand, reads 0 and never negative', async () => {
    const { deps } = setup([row()], { [skuA]: [0, 0], [skuB]: [4, 0] })
    const { deps: odd } = setup([row()], { [skuB]: [1, 3] })

    expect((await makeGetAvailability(deps)('swiss-knife', 'en') as { value: { items: { available: number }[] } }).value.items.map(i => i.available)).toEqual([0, 4])
    expect((await makeGetAvailability(odd)('swiss-knife', 'en') as { value: { items: { available: number }[] } }).value.items.map(i => i.available)).toEqual([0, 0])
  })
})
