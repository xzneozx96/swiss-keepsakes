import { categoryIcons, descriptionLength, interestCodes } from '@sk/domain/content'
import { describe, expect, it } from 'vitest'
import { buildPlan, categorySpecs, groupPlan, iconPlan, loadData, parseFlags, placeChanges, productInput } from '../scripts/seed-curated.ts'

const data = loadData()
const empty = { categories: [], placeTitles: new Set<string>(), keepsakeNames: new Set<string>(), hashes: new Set<string>() }

describe('[seed-curated] the curated data maps to writes', () => {
  it('has the 33 places of the review, the 11 events, 13 food places and 25 service places of 05.11.2026 and 5 keepsakes', () => {
    expect(data.places).toHaveLength(82)
    expect(data.places.filter(place => place.group === 'events')).toHaveLength(11)
    expect(data.places.filter(place => place.group === 'food')).toHaveLength(13)
    expect(data.places.filter(place => place.group === 'services')).toHaveLength(25)
    expect(data.keepsakes).toHaveLength(5)
  })

  it('names only categories of the spec table, plus the Photo spots the store already has', () => {
    const known = new Set([...categorySpecs.map(c => c.slug), 'photo-spots'])
    expect(data.places.flatMap(p => p.record.categories).filter(slug => !known.has(slug))).toEqual([])
  })

  it('keeps the place fields inside the pin limits', () => {
    for (const { record } of data.places) {
      expect(record.title.en.length).toBeLessThanOrEqual(60)
      expect(record.title.de.length).toBeLessThanOrEqual(60)
      expect(record.localTip.en.length).toBeLessThanOrEqual(160)
      expect(record.tip.en.length).toBeLessThanOrEqual(450)
      expect(record.interests.every(i => (interestCodes as readonly string[]).includes(i))).toBe(true)
    }
  })

  it('maps a place: first photo is the cover, the rest are extra photos, null hours become none', () => {
    const { record } = data.places.find(p => p.record.key === 'chapel-bridge')!
    const body = placeChanges(record, ['c1'], ['m1', 'm2', 'm3'])
    expect(body.coverMediaId).toBe('m1')
    expect(body.photos.map(p => p.mediaId)).toEqual(['m2', 'm3'])
    expect(body.categoryIds).toEqual(['c1'])
    const unknownHours = data.places.find(p => p.record.weeklyHours === null)!
    expect(placeChanges(unknownHours.record, [], []).weeklyHours).toEqual([])
  })

  it('keeps a closing time after midnight as it is, which the pin model allows', () => {
    const { record } = data.places.find(p => p.record.title.en.includes('Bar Capitol'))!
    const hours = placeChanges(record, [], []).weeklyHours
    const stored = record.weeklyHours!
    expect(hours).toEqual(stored)
    expect(hours.some(span => span.closes < span.opens)).toBe(true)
  })

  it('maps a place without photos to no cover', () => {
    const { record } = data.places.find(p => p.record.photos.length === 0)!
    expect(placeChanges(record, [], [])).toMatchObject({ coverMediaId: null, coverAlt: {}, photos: [] })
  })

  it('maps a keepsake to one variant, no options, a price in Rappen and a Tiptap document per language', () => {
    for (const record of data.keepsakes) {
      const input = productInput(record, ['m1'])
      expect(input.options).toEqual([])
      expect(input.variants).toEqual([{ skuCode: record.skuCode, mediaId: null, priceRappen: Math.round(record.priceChf * 100), status: 'published', values: {} }])
      expect(input.text.en.type).toBe('doc')
      expect(descriptionLength(input.text.en)).toBeLessThanOrEqual(1200)
      expect(descriptionLength(input.text.de)).toBeLessThanOrEqual(1200)
    }
    expect(productInput(data.keepsakes[0]!, []).variants[0]!.priceRappen).toBe(18900)
  })

  it('plans everything on an empty store and nothing again once it exists', () => {
    const first = buildPlan(data, empty)
    expect(first.placesToCreate).toHaveLength(82)
    expect(first.keepsakesToCreate).toHaveLength(5)
    const again = buildPlan(data, {
      categories: categorySpecs.map((c, i) => ({ id: String(i), slug: c.slug, nameEn: c.name.en })),
      placeTitles: new Set(data.places.map(p => p.record.title.en)),
      keepsakeNames: new Set(data.keepsakes.map(k => k.name.en)),
      hashes: new Set(),
    })
    expect(again.categoriesToCreate).toEqual([])
    expect(again.placesToCreate).toEqual([])
    expect(again.keepsakesToCreate).toEqual([])
  })

  it('reuses a category by its English name when the slug differs', () => {
    const plan = buildPlan(data, { ...empty, categories: [{ id: 'x', slug: 'public-holidays', nameEn: 'Public holidays' }] })
    expect(plan.categoriesToCreate.map(c => c.slug)).not.toContain('holidays')
  })
})

describe('[E4.13][AC7] the seed icon step plans additions only', () => {
  it('[E4.13][AC7] every icon of the spec table is a key of the domain list', () => {
    const icons = categorySpecs.flatMap(spec => spec.icon ?? [])
    expect(icons.length).toBeGreaterThan(10)
    expect(icons.every(icon => (categoryIcons as readonly string[]).includes(icon))).toBe(true)
  })

  it('[E4.13][AC7] gives an icon to the seeded categories that have none, never to one that has it, found by slug or English name', () => {
    const rows = [
      { id: 'a', slug: 'toilets', nameEn: 'Toilets', icon: null },
      { id: 'b', slug: 'water', nameEn: 'Drinking water', icon: 'lake' },
      { id: 'c', slug: 'my-own-slug', nameEn: 'Churches', icon: null },
      { id: 'd', slug: 'sights', nameEn: 'Sights', icon: null },
      { id: 'e', slug: 'not-in-the-seed', nameEn: 'Something else', icon: null },
    ] as const
    const additions = iconPlan(categorySpecs, rows)
    expect(additions).toEqual([{ id: 'a', icon: 'toilet' }, { id: 'c', icon: 'church' }])
  })

  it('[E4.13][AC7] plans nothing when every seeded category has its icon', () => {
    const rows = categorySpecs.map((spec, i) => ({ id: String(i), slug: spec.slug, nameEn: spec.name.en, icon: spec.icon ?? 'info' }))
    expect(iconPlan(categorySpecs, rows)).toEqual([])
  })
})

describe('[seed-curated] the flags pick the steps', () => {
  it('runs every step by default and with --dry-run alone', () => {
    expect(parseFlags([])).toEqual({ dry: false, stockOnly: false, storiesOnly: false, group: null, unknown: [] })
    expect(parseFlags(['--dry-run'])).toEqual({ dry: true, stockOnly: false, storiesOnly: false, group: null, unknown: [] })
  })

  it('--stock-only keeps only the opening stock step, with or without --dry-run', () => {
    expect(parseFlags(['--stock-only'])).toEqual({ dry: false, stockOnly: true, storiesOnly: false, group: null, unknown: [] })
    expect(parseFlags(['--stock-only', '--dry-run'])).toEqual({ dry: true, stockOnly: true, storiesOnly: false, group: null, unknown: [] })
  })

  it('reports a flag it does not know, so a typo cannot start the full seed', () => {
    expect(parseFlags(['--stock-onyl']).unknown).toEqual(['--stock-onyl'])
  })
})

describe('[seed-curated] --group', () => {
  it('plans only the events and the events category, whatever else the store lacks', () => {
    const { data: events, plan } = groupPlan(data, empty, 'events')
    expect(events.keepsakes).toEqual([])
    expect(plan.placesToCreate.map(p => p.group)).toEqual(Array.from({ length: 11 }).fill('events'))
    expect(plan.categoriesToCreate.map(spec => spec.slug)).toEqual(['events'])
    expect(plan.keepsakesToCreate).toEqual([])
  })

  it('links every place to an https address, as place_links_url_check requires', () => {
    expect(data.places.map(p => p.record.outboundUrl).filter(url => url !== null && !url.startsWith('https://'))).toEqual([])
  })

  it('puts times only on single-day dates, as place_dates_times_check requires', () => {
    const timedRanges = data.places.flatMap(p => p.record.dates).filter(d => (d.startTime !== null || d.endTime !== null) && d.firstDay !== d.lastDay)
    expect(timedRanges).toEqual([])
  })

  it('is a known flag', () => {
    expect(parseFlags(['--events-only', '--dry-run'])).toMatchObject({ group: 'events', dry: true, unknown: [] })
    expect(parseFlags(['--group=food'])).toMatchObject({ group: 'food', unknown: [] })
  })
})

describe('[seed-curated] --group=food', () => {
  it('plans the 13 food places and only the food categories they need', () => {
    const { plan } = groupPlan(data, empty, 'food')
    expect(plan.placesToCreate).toHaveLength(13)
    expect(plan.categoriesToCreate.map(spec => spec.slug).sort()).toEqual(['bars', 'cafes', 'chocolate', 'food-and-drink', 'markets', 'restaurants'])
    expect(data.places.filter(p => p.group === 'food').every(p => p.record.photos.length > 0)).toBe(true)
  })
})

describe('[seed-curated] --group=services', () => {
  it('plans the 25 service places with a photo each, and the four new home tiles switched on', () => {
    const { plan } = groupPlan(data, empty, 'services')
    expect(plan.placesToCreate).toHaveLength(25)
    expect(plan.placesToCreate.every(p => p.record.photos.length > 0)).toBe(true)
    const tiles = categorySpecs.filter(spec => ['sim-wifi', 'transport', 'luggage-lockers', 'cash'].includes(spec.slug))
    expect(tiles.map(spec => [spec.slug, spec.showOnHome, spec.parent])).toEqual([['sim-wifi', true, 'useful-info'], ['transport', true, 'useful-info'], ['luggage-lockers', true, 'useful-info'], ['cash', true, 'useful-info']])
  })
})
