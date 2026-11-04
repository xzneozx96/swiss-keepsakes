import type { StoryBody, StoryBodyNode } from '@sk/domain/content'
import type { PlaceFacts, StorySnapshot } from '../scripts/seed-place-stories.ts'
import type { PlaceStory } from '../scripts/seed-data/place-stories.ts'
import type { StoryPhoto } from '../scripts/seed-data/story-photos.ts'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { storyDraftSchema } from '@sk/api-contract'
import { interestCodes, storyBodyFacts, storyBodyMediaRefs, storyVersionPublishGaps } from '@sk/domain/content'
import { describe, expect, it } from 'vitest'
import { parseFlags } from '../scripts/seed-curated.ts'
import { placeCovers, placeStories } from '../scripts/seed-data/place-stories.ts'
import { storyPhotos } from '../scripts/seed-data/story-photos.ts'
import { describePlan, photoRefs, placeStoryBody, placeStoryDraft, planPlaceStories, storyPhotoKeys } from '../scripts/seed-place-stories.ts'

const languages = ['en', 'de'] as const
const photoRoot = join(import.meta.dirname, '..', 'scripts', 'seed-data', 'story-photos')

function textsOf(nodes: StoryBodyNode[]): string[] {
  return nodes.flatMap(n => [...(n.type === 'text' ? [n.text ?? ''] : []), ...textsOf(n.content ?? [])])
}

// A stand-in id for every photo, as the library would give.
const ids = new Map(storyPhotos.map((photo, index) => [photo.key, `00000000-0000-4000-9000-${String(index).padStart(12, '0')}`]))
const refs = photoRefs(ids)

// Phrases the owner does not want (an AI tell, or a platitude) and the dash characters.
const banned = [/—/, /–/, /\bnestled\b/i, /\biconic\b/i, /testament to/i, /rich tapestry/i, /whether you(?:'|’)re/i, /hidden gem/i, /\bdelve\b/i, /\bvibrant\b/i, /\bbustling\b/i, /\bnicht nur\b.*\bsondern auch\b/i, /\bunvergesslich/i, /\bwahres Juwel/i, /Eintauchen in/i]

function everyText(story: PlaceStory): string[] {
  const own = languages.flatMap(language => [story.versions[language].title, story.versions[language].excerpt, ...textsOf(placeStoryBody(story, language, refs).content)])
  const photos = storyPhotoKeys(story).flatMap((key) => {
    const photo = storyPhotos.find(entry => entry.key === key)
    return photo ? [...Object.values(photo.alt), ...Object.values(photo.caption)] : []
  })
  return [...own, ...photos]
}

// Floors below the brief's 900 and 300 words. The reviewers cut claims no source backs (coordinator ruling 7: never pad to reach a
// floor), and these texts stay shorter: the pharmacy and the Weinmarkt have few verifiable facts, the Coop and Migros reviews rest on
// one chain page each, and Coop's own page could not be read, so its review sends guests to coop.ch.
const wordFloor: Record<string, number> = { 'chapel-bridge': 850, 'spreuer-bridge': 850, 'lion-monument': 850, 'fritschi': 750, 'old-pharmacy': 580, 'weinmarkt': 580, 'coop-review': 150, 'migros-review': 190, 'manor-review': 250 }
// Photo blocks: a story needs 4, unless its place has few photos that show it (the pharmacy has one, Fritschi two). The Manor review has
// none: no photo of the store exists under a licence that needs no credit.
const photoBlockFloor: Record<string, number> = { 'old-pharmacy': 1, 'fritschi': 1, 'manor-review': 0 }
const libraryKeys = new Set(['wm-fountain', 'wm-houses', 'wm-basin', 'fr-house', 'ph-house'])
const cover = '11111111-1111-4111-8111-111111111111'
const stories = placeStories.flatMap(story => languages.map(language => ({ key: story.key, kind: story.kind, language, story })))

describe('[seed-place-stories] the data', () => {
  it('has seven stories and four reviews, with distinct keys and slugs', () => {
    expect(placeStories.filter(s => s.kind === 'story')).toHaveLength(7)
    expect(placeStories.filter(s => s.kind === 'editorial_review')).toHaveLength(4)
    expect(new Set(placeStories.map(s => s.key)).size).toBe(placeStories.length)
    const slugs = placeStories.flatMap(s => [s.slug.en, s.slug.de])
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it.each(stories)('$key/$language validates against the story draft schema, with every publish gap closed', ({ story, language }) => {
    const draft = placeStoryDraft(story, language, cover, refs)
    const parsed = storyDraftSchema.safeParse(draft)
    expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues)).toBe(true)
    expect(storyVersionPublishGaps({ slug: story.slug[language], title: draft.title, excerpt: draft.excerpt, coverMediaId: draft.coverMediaId, kind: story.kind, subjectPlaceId: story.kind === 'editorial_review' ? 'place' : null, checkedOn: draft.checkedOn })).toEqual([])
  })

  it.each(stories)('$key/$language is long enough, has sections and keeps the sources out of the body', ({ story, language, kind }) => {
    const body = placeStoryBody(story, language, refs) as StoryBody
    const facts = storyBodyFacts(body)
    // German runs about 10 percent shorter in words than the English for the same text, so its floor is 85 percent of the English one.
    expect(facts.words, `${story.key}/${language}`).toBeGreaterThanOrEqual((wordFloor[story.key] ?? (kind === 'story' ? 900 : 300)) * (language === 'en' ? 1 : 0.85))
    expect(facts.sections).toBeGreaterThanOrEqual(kind === 'story' ? 5 : 2)
    expect(facts.mediaWithoutCaption).toBe(0)
    expect(facts.photosWithoutAlt).toBe(0)
    expect(textsOf(body.content).join(' ')).not.toMatch(/Sources:|Quellen:/)
    expect(story.sources.length).toBeGreaterThan(0)
    for (const source of story.sources)
      expect(source.url).toMatch(/^https:\/\//)
    expect(story.versions[language].excerpt.length).toBeLessThanOrEqual(1000)
  })

  it.each(placeStories.map(story => ({ key: story.key, story })))('$key has no dash, banned phrase or question mark', ({ story }) => {
    for (const value of everyText(story)) {
      for (const pattern of banned)
        expect(value, `${story.key}: ${pattern}`).not.toMatch(pattern)
      expect(value, story.key).not.toContain('?')
    }
  })

  it.each(placeStories.map(story => ({ key: story.key, story })))('$key has photo blocks that point at listed photos, in both languages, and a cover', ({ story }) => {
    const keys = storyPhotoKeys(story)
    const blocks = ['en', 'de'].map(l => story.versions[l as 'en' | 'de'].blocks.filter(b => typeof b !== 'string' && 'photo' in b).map(b => (b as { photo: string }).photo))
    expect(blocks[0], 'the German has the same photos in the same order').toEqual(blocks[1])
    expect(blocks[0]!.length).toBeGreaterThanOrEqual(photoBlockFloor[story.key] ?? (story.kind === 'story' ? 4 : 2))
    for (const key of keys)
      expect(storyPhotos.some(photo => photo.key === key), key).toBe(true)
    const body = placeStoryBody(story, 'en', refs) as StoryBody
    expect(storyBodyMediaRefs(body).map(ref => ref.id).every(id => [...ids.values()].includes(id))).toBe(true)
    expect(story.cover ?? story.coverFrom).toBeTruthy()
    // Only the Manor review has no cover photo, and it stays a draft.
    expect(story.cover === undefined).toBe(story.key === 'manor-review')
  })

  it('lists photos with alt text and a caption in both languages, a source, a licence that needs no credit, and a file on disk', () => {
    expect(new Set(storyPhotos.map(p => p.key)).size).toBe(storyPhotos.length)
    for (const photo of storyPhotos as StoryPhoto[]) {
      for (const language of languages) {
        expect(photo.alt[language].length, `${photo.key} alt ${language}`).toBeGreaterThan(10)
        expect(photo.alt[language].length).toBeLessThanOrEqual(300)
        expect(photo.caption[language].length, `${photo.key} caption ${language}`).toBeGreaterThan(10)
        expect(photo.caption[language].length).toBeLessThanOrEqual(300)
      }
      expect(photo.sourceUrl, photo.key).toMatch(/^https:\/\//)
      expect(photo.author.length).toBeGreaterThan(0)
      // New photos are public domain or CC0. Five photos come from the library of the curated places (owner decision of sprint 7: no credits), under a CC BY-SA licence.
      expect(photo.licence, photo.key).toMatch(libraryKeys.has(photo.key) ? /^CC BY-SA/ : /^(?:CC0|Public domain)/)
      expect(photo.description.length).toBeGreaterThan(10)
      expect(existsSync(join(photoRoot, photo.file)), photo.file).toBe(true)
    }
  })

  it('uses every listed photo, and names real photos for the place covers', () => {
    const used = new Set([...placeStories.flatMap(storyPhotoKeys), ...placeCovers.map(entry => entry.photo)])
    expect(storyPhotos.filter(photo => !used.has(photo.key)).map(photo => photo.key)).toEqual([])
    expect(placeCovers.every(entry => storyPhotos.some(photo => photo.key === entry.photo))).toBe(true)
  })

  it('writes the German in the Sie form and the English without a Sie', () => {
    for (const story of placeStories) {
      const de = textsOf(placeStoryBody(story, 'de', refs).content).join(' ')
      expect(de, story.key).not.toMatch(/\b(?:du|dein|deine|dir)\b/i)
      expect(de, story.key).toMatch(/\bSie\b|\bIhr/)
    }
  })

  it('links every story to its places, makes it the main story only of places it is linked to, and uses closed values', () => {
    const keys = new Set(placeStories.map(s => s.key))
    for (const story of placeStories) {
      expect(story.places.length).toBeGreaterThan(0)
      expect(story.mainStoryFor.length).toBeGreaterThan(0)
      expect(story.mainStoryFor.every(slug => story.places.includes(slug))).toBe(true)
      expect(story.interests.every(i => (interestCodes as readonly string[]).includes(i))).toBe(true)
      expect(['short_stay', 'multi_day', 'both']).toContain(story.stayTag)
      expect(story.related.length).toBeLessThanOrEqual(3)
      expect(story.related.every(k => keys.has(k) && k !== story.key)).toBe(true)
      expect(story.kind === 'editorial_review' ? story.checkedOn : '2026-11-04').toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
    const reviews = placeStories.filter(s => s.kind === 'editorial_review')
    expect(reviews.map(s => s.places[0]).sort()).toEqual(['bachmann-at-bahnhof-luzern-ug', 'coop-bahnhof-luzern', 'manor-luzern', 'migros-bahnhof-luzern'])
    expect(reviews.every(s => s.mainStoryFor.length === 1 && s.mainStoryFor[0] === s.places[0])).toBe(true)
  })
})

// Small fixtures: the plan does not depend on the real texts.
const photo = (key: string): StoryPhoto => ({ key, file: `${key}.jpg`, sourceUrl: 'https://example.org', author: 'a', licence: 'CC0', description: 'a photo', alt: { en: `alt ${key}`, de: `alt de ${key}` }, caption: { en: `cap ${key}`, de: `cap de ${key}` } })
const photos = [photo('cover'), photo('inline')]
const fixture: PlaceStory = {
  key: 'one',
  kind: 'story',
  slug: { en: 'one-en', de: 'one-de' },
  places: ['pin-a'],
  mainStoryFor: ['pin-a'],
  cover: 'cover',
  coverFrom: 'pin-a',
  blogCategories: ['history'],
  interests: ['history-culture'],
  stayTag: 'both',
  related: [],
  sources: [{ name: 's', url: 'https://example.org' }],
  versions: {
    en: { title: 'One', excerpt: 'Short summary of one.', blocks: [{ h: 'Heading' }, 'Text.', { photo: 'inline' }] },
    de: { title: 'Eins', excerpt: 'Kurzfassung von eins.', blocks: [{ h: 'Titel' }, 'Text.', { photo: 'inline' }] },
  },
}
const ready = new Map([['cover', 'media-cover'], ['inline', 'media-inline']])
function snapshotOf(overrides: Partial<StorySnapshot> = {}, place: Partial<PlaceFacts> = {}): StorySnapshot {
  return {
    slugs: new Set(),
    places: new Map([['pin-a', { id: 'place-a', status: 'published', mainStoryGroupId: null, coverMediaId: null, coverReady: false, ...place }]]),
    blogCategoryIds: new Map([['history', 'blog-history']]),
    versions: [],
    photoMedia: ready,
    ...overrides,
  }
}
const plan = (snapshot: StorySnapshot, covers: typeof placeCovers = []) => planPlaceStories([fixture], snapshot, photos, covers)
const storedFor = (language: 'en' | 'de', changes: Record<string, unknown> = {}, status: 'draft' | 'published' = 'published') => {
  const draft = placeStoryDraft(fixture, language, 'media-cover', photoRefs(ready, photos))
  return { groupId: 'g1', language, slug: fixture.slug[language], status, rowVersion: 4, doc: { ...draft, ...changes } as never, pendingDraft: false }
}
const existing = (...versions: ReturnType<typeof storedFor>[]) => snapshotOf({ slugs: new Set([fixture.slug.en, fixture.slug.de]), versions })

describe('[seed-place-stories] the plan', () => {
  it('creates a story that is missing, with the cover photo and the place links', () => {
    const result = plan(snapshotOf())
    expect(result.faults).toEqual([])
    expect(result.creates).toHaveLength(1)
    expect(result.creates[0]!.coverMediaId).toBe('media-cover')
    expect(result.creates[0]!.publish).toBe(true)
    expect(result.creates[0]!.mainStoryPlaceIds).toEqual(['place-a'])
    expect(result.refreshes).toEqual([])
  })

  it('plans no write for stored versions that are the data and published, so a second run changes nothing', () => {
    const result = plan(existing(storedFor('en'), storedFor('de')))
    expect(result.refreshes).toEqual([])
    expect(result.creates).toEqual([])
    expect(result.uploads).toEqual([])
    expect(result.skipped).toHaveLength(1)
  })

  it.each([
    ['the title', { title: 'Old' }],
    ['the short summary', { excerpt: 'Old summary.' }],
    ['the cover', { coverMediaId: 'media-old' }],
    ['the body', { body: { type: 'doc', content: [{ type: 'paragraph' }] } }],
  ])('rewrites a version when %s differs', (_name, changes) => {
    const result = plan(existing(storedFor('en', changes), storedFor('de')))
    expect(result.refreshes.map(r => `${r.key}/${r.version.language}`)).toEqual(['one/en'])
    expect(result.refreshes[0]!.draft.coverMediaId).toBe('media-cover')
    expect(result.refreshes[0]!.draft.title).toBe('One')
  })

  it('publishes a stored draft even when its text is the data', () => {
    const result = plan(existing(storedFor('en', {}, 'draft'), storedFor('de')))
    expect(result.refreshes.map(r => `${r.version.language}/${r.version.status}`)).toEqual(['en/draft'])
  })

  it('compares the check date of a review only when the data has one', () => {
    const review = { ...fixture, kind: 'editorial_review' as const, checkedOn: '2026-11-04' }
    const draft = (checkedOn: string) => ({ groupId: 'g1', language: 'en' as const, slug: 'one-en', status: 'published' as const, rowVersion: 1, doc: { ...placeStoryDraft(review, 'en', 'media-cover', photoRefs(ready, photos)), checkedOn } })
    const base = existing()
    expect(planPlaceStories([review], { ...base, versions: [draft('2026-11-03')] }, photos, []).refreshes).toHaveLength(1)
    expect(planPlaceStories([review], { ...base, versions: [draft('2026-11-04')] }, photos, []).refreshes).toHaveLength(0)
  })

  it('lists the photos the store does not hold yet, and gives them a placeholder id until they are uploaded', () => {
    const result = plan(snapshotOf({ photoMedia: new Map([['cover', 'media-cover']]) }))
    expect(result.uploads.map(p => p.key)).toEqual(['inline'])
    const body = placeStoryBody(fixture, 'en', result.refs) as StoryBody
    expect(storyBodyMediaRefs(body).map(r => r.id)).toEqual(['pending:inline'])
  })

  it('writes the photo block with its alt text and caption in the language of the version', () => {
    const image = (placeStoryBody(fixture, 'de', photoRefs(ready, photos)).content.at(-1))!
    expect(image).toEqual({ type: 'image', attrs: { mediaId: 'media-inline', alt: 'alt de inline', caption: 'cap de inline' } })
  })

  it('falls back to the cover of the place when the story has no cover photo, and stops with a fault when there is none', () => {
    const noCover = { ...fixture, cover: undefined }
    const withPlace = planPlaceStories([noCover], snapshotOf({}, { coverMediaId: 'media-place', coverReady: true }), photos, [])
    expect(withPlace.creates[0]!.coverMediaId).toBe('media-place')
    const none = planPlaceStories([noCover], existing(storedFor('en'), storedFor('de')), photos, [])
    expect(none.faults.join('\n')).toContain('has no cover')
  })

  it('brings a stored draft with no cover to the text and keeps it a draft', () => {
    const noCover = { ...fixture, cover: undefined }
    const stored = (language: 'en' | 'de', title: string) => ({ ...storedFor(language, { title, coverMediaId: null }, 'draft') })
    const old = planPlaceStories([noCover], existing(stored('en', 'Old'), stored('de', 'Alt')), photos, [])
    expect(old.faults).toEqual([])
    expect(old.refreshes.map(r => `${r.version.language}/${r.publish}`)).toEqual(['en/false', 'de/false'])
    const same = planPlaceStories([noCover], existing(stored('en', 'One'), stored('de', 'Eins')), photos, [])
    expect(same.refreshes).toEqual([])
  })

  it('gives a place without a cover its photo, and leaves a place that has one', () => {
    const covers = [{ place: 'pin-a', photo: 'cover' }]
    expect(plan(snapshotOf(), covers).placeCovers.map(c => c.slug)).toEqual(['pin-a'])
    expect(plan(snapshotOf({}, { coverMediaId: 'media-place', coverReady: true }), covers).placeCovers).toEqual([])
  })

  it('leaves a pin with unpublished changes of a person alone, and refuses to overwrite a draft beside a published version', () => {
    const covers = [{ place: 'pin-a', photo: 'cover' }]
    const skipped = plan(snapshotOf({}, { hasDraft: true }), covers)
    expect(skipped.placeCovers).toEqual([])
    expect(skipped.coversSkipped).toEqual(['pin-a'])
    expect(describePlan(skipped, true)).toContain('skipping pin-a')
    const pending = plan(existing({ ...storedFor('en', { title: 'Old' }), pendingDraft: true }, storedFor('de')))
    expect(pending.faults.join('\n')).toContain('unpublished draft')
    expect(pending.refreshes).toEqual([])
  })

  it('stops with a fault when a place, a blog category or a photo is missing, and names it', () => {
    expect(plan({ ...snapshotOf(), places: new Map() }).faults.join('\n')).toContain('pin-a')
    expect(plan({ ...snapshotOf(), blogCategoryIds: new Map() }).faults.join('\n')).toContain('blog category history')
    expect(planPlaceStories([fixture], snapshotOf(), [photo('cover')], []).faults.join('\n')).toContain('inline')
  })

  it('keeps a main story that a person chose, and links one for an existing story to a place that has none', () => {
    expect(plan(snapshotOf({}, { mainStoryGroupId: 'chosen' })).creates[0]!.mainStoryPlaceIds).toEqual([])
    expect(plan(existing(storedFor('en'), storedFor('de'))).links).toEqual([{ key: 'one', groupId: 'g1', placeId: 'place-a' }])
    expect(plan({ ...existing(storedFor('en'), storedFor('de')), places: new Map([['pin-a', { id: 'place-a', status: 'published', mainStoryGroupId: 'mine', coverMediaId: null, coverReady: false }]]) }).links).toEqual([])
  })

  it('prints a plan with counts', () => {
    const text = describePlan(plan(snapshotOf({ photoMedia: new Map() }), [{ place: 'pin-a', photo: 'cover' }]), true)
    expect(text).toContain('Would upload 2 photos: cover, inline')
    expect(text).toContain('Would set the cover of 1 places: pin-a')
    expect(text).toContain('Would create 1 stories and reviews, skipping 0')
  })
})

describe('[seed-place-stories] the flags', () => {
  it('knows --stories-only and --dry-run, and no longer the one-time flags', () => {
    expect(parseFlags([])).toMatchObject({ storiesOnly: false, unknown: [] })
    expect(parseFlags(['--stories-only', '--dry-run'])).toMatchObject({ dry: true, storiesOnly: true, unknown: [] })
    for (const gone of ['--replace-legacy-stories', '--delete-sample-pins', '--refresh-story-bodies'])
      expect(parseFlags(['--stories-only', gone]).unknown).toEqual([gone])
  })
})
