import { descriptionLength, interestCodes } from '@sk/domain/content'
import { describe, expect, it } from 'vitest'
import { buildPlan, categorySpecs, loadData, placeChanges, productInput } from '../scripts/seed-curated.ts'

const data = loadData()
const empty = { categories: [], placeTitles: new Set<string>(), keepsakeNames: new Set<string>(), hashes: new Set<string>() }

describe('[seed-curated] the curated data maps to writes', () => {
  it('has the 33 places and 5 keepsakes of the review', () => {
    expect(data.places).toHaveLength(33)
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

  it('stores a closing time after midnight as 24:00, which the pin model allows', () => {
    const { record } = data.places.find(p => p.record.title.en.includes('Bar Capitol'))!
    const hours = placeChanges(record, [], []).weeklyHours
    expect(hours[0]).toEqual({ day: 1, opens: '12:00', closes: '24:00' })
    expect(hours.every(span => span.opens < span.closes)).toBe(true)
  })

  it('maps a place without photos to no cover', () => {
    const { record } = data.places.find(p => p.record.photos.length === 0)!
    expect(placeChanges(record, [], [])).toMatchObject({ coverMediaId: null, coverAlt: {}, photos: [] })
  })

  it('maps a keepsake to one variant, no options, a price in Rappen and a Tiptap document per language', () => {
    for (const record of data.keepsakes) {
      const input = productInput(record, ['m1'])
      expect(input.options).toEqual([])
      expect(input.variants).toEqual([{ skuCode: record.skuCode, priceRappen: Math.round(record.priceChf * 100), status: 'published', values: {} }])
      expect(input.text.en.type).toBe('doc')
      expect(descriptionLength(input.text.en)).toBeLessThanOrEqual(1200)
      expect(descriptionLength(input.text.de)).toBeLessThanOrEqual(1200)
    }
    expect(productInput(data.keepsakes[0]!, []).variants[0]!.priceRappen).toBe(18900)
  })

  it('plans everything on an empty store and nothing again once it exists', () => {
    const first = buildPlan(data, empty)
    expect(first.placesToCreate).toHaveLength(33)
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
