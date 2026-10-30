import { describe, expect, it } from 'vitest'
import { languagesToSlug, pinSlug, pinSlugFor } from '../../../src/modules/content/application/pin-slug.ts'
import { createFakePins } from '../../support/fake-pins.ts'

const none = { en: new Set<string>(), de: new Set<string>() }
const base = { stored: null, previousTitle: {}, hasBeenPublished: false, taken: none }

describe('the slug of a pin', () => {
  it('folds umlauts and sharp s and puts dashes between words, per language', () => {
    expect(pinSlug({ ...base, title: { en: 'Chapel Bridge', de: 'Kapellbrücke & Wasserturm' } })).toEqual({ en: 'chapel-bridge', de: 'kapellbruecke-wasserturm' })
    expect(pinSlug({ ...base, title: { de: 'Löwendenkmal Straße Äpfel' } })).toEqual({ de: 'loewendenkmal-strasse-aepfel' })
  })

  it('is at most 60 characters, with no trailing dash', () => {
    const slug = pinSlug({ ...base, title: { en: `${'a'.repeat(59)} bridge` } })
    expect(slug?.en).toHaveLength(59)
  })

  it('still makes a slug for a title that is only symbols', () => {
    expect(pinSlug({ ...base, title: { en: '★★★' } })).toEqual({ en: 'place' })
  })

  it('takes the next free one when another pin holds it, counting -2, -3', () => {
    const taken = { en: new Set(['lion', 'lion-2']), de: new Set(['loewe']) }
    expect(pinSlug({ ...base, taken, title: { en: 'Lion', de: 'Löwe' } })).toEqual({ en: 'lion-3', de: 'loewe-2' })
  })

  it('is null when no language has a title', () => {
    expect(pinSlug({ ...base, title: {} })).toBeNull()
    expect(pinSlug({ ...base, title: { en: '   ' } })).toBeNull()
  })

  it('before the first publish follows a title that changed and keeps one that did not', () => {
    const input = { ...base, stored: { en: 'old-name', de: 'alter-name' }, previousTitle: { en: 'Old Name', de: 'Alter Name' } }
    expect(pinSlug({ ...input, title: { en: 'New Name', de: 'Alter Name' } })).toEqual({ en: 'new-name', de: 'alter-name' })
  })

  it('before the first publish drops the slug of a language that lost its title', () => {
    expect(pinSlug({ ...base, stored: { en: 'a', de: 'b' }, previousTitle: { en: 'A', de: 'B' }, title: { en: 'A' } })).toEqual({ en: 'a' })
  })

  it('after the first publish never changes a slug, whatever the title says', () => {
    const input = { ...base, hasBeenPublished: true, stored: { en: 'old-name' }, previousTitle: { en: 'Old Name' } }
    expect(pinSlug({ ...input, title: { en: 'Something Else' } })).toEqual({ en: 'old-name' })
  })

  it('after the first publish still makes the slug of a language that has none, and drops one that lost its title', () => {
    const input = { ...base, hasBeenPublished: true, stored: { en: 'name', de: 'alt' }, previousTitle: { en: 'Name', de: 'Alt' } }
    expect(pinSlug({ ...input, title: { en: 'Name' } })).toEqual({ en: 'name' })
    expect(pinSlug({ ...input, stored: { en: 'name' }, title: { en: 'Name', de: 'Name' } })).toEqual({ en: 'name', de: 'name' })
  })

  it('names the languages that need a slug made', () => {
    expect(languagesToSlug({ stored: { en: 'a' }, title: { en: 'A', de: 'B' }, previousTitle: { en: 'A' }, hasBeenPublished: false })).toEqual(['de'])
    expect(languagesToSlug({ stored: { en: 'a' }, title: { en: 'A2' }, previousTitle: { en: 'A' }, hasBeenPublished: false })).toEqual(['en'])
    expect(languagesToSlug({ stored: { en: 'a' }, title: { en: 'A2' }, previousTitle: { en: 'A' }, hasBeenPublished: true })).toEqual([])
  })
})

describe('pinSlugFor', () => {
  it('reads the slugs of the other pins, never its own', async () => {
    const pins = createFakePins()
    const other = await pins.insert(null, 'store-2', { slug: { en: 'bridge' } }, new Date())
    const own = await pins.insert(null, 'store-1', { slug: { en: 'bridge-2' } }, new Date())
    expect(other.slug).toEqual({ en: 'bridge' })
    expect(await pinSlugFor(pins, null, { pinId: own.id, stored: own.slug, title: { en: 'Bridge' }, previousTitle: { en: 'Old' }, hasBeenPublished: false })).toEqual({ en: 'bridge-2' })
  })

  it('takes the platform lock only when it makes a slug', async () => {
    const pins = createFakePins()
    let locks = 0
    pins.lockSlugs = async () => {
      locks++
    }
    await pinSlugFor(pins, null, { stored: { en: 'a' }, title: { en: 'A' }, previousTitle: { en: 'A' }, hasBeenPublished: false })
    expect(locks).toBe(0)
    await pinSlugFor(pins, null, { stored: null, title: { en: 'A' }, previousTitle: {}, hasBeenPublished: false })
    expect(locks).toBe(1)
  })
})
