import type { StoryBody, StoryBodyNode } from '@sk/domain/content'
import type { PlaceFacts, StepOptions, StorySnapshot } from '../scripts/seed-place-stories.ts'
import { storyDraftSchema } from '@sk/api-contract'
import { interestCodes, storyBodyFacts, storyVersionPublishGaps } from '@sk/domain/content'
import { describe, expect, it } from 'vitest'
import { parseFlags } from '../scripts/seed-curated.ts'
import { legacyStoryGroups, placeStories } from '../scripts/seed-data/place-stories.ts'
import { describePlan, placeStoryBody, placeStoryDraft, planLegacyDeletes, planPlaceStories } from '../scripts/seed-place-stories.ts'

const cover = '11111111-1111-4111-8111-111111111111'
const languages = ['en', 'de'] as const
const none: StepOptions = { replaceLegacy: false, deleteSamplePins: false, refreshBodies: false }

function textsOf(nodes: StoryBodyNode[]): string[] {
  return nodes.flatMap(n => [...(n.type === 'text' ? [n.text ?? ''] : []), ...textsOf(n.content ?? [])])
}

// A store that has every place the data names, each with a ready cover, and every blog category.
function snapshotOf(overrides: Partial<StorySnapshot> = {}, place: (slug: string) => Partial<PlaceFacts> = () => ({})): StorySnapshot {
  const slugs = [...new Set(placeStories.flatMap(story => [...story.places, story.coverFrom, ...story.mainStoryFor]))]
  return {
    slugs: new Set(),
    places: new Map(slugs.map((slug, index) => [slug, { id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`, status: 'published', mainStoryGroupId: null, coverMediaId: cover, coverReady: true, ...place(slug) }])),
    blogCategoryIds: new Map(['history', 'old-town-history', 'legends'].map(slug => [slug, `blog-${slug}`])),
    groups: [],
    samplePins: [],
    versions: [],
    ...overrides,
  }
}

const versions = placeStories.flatMap(story => languages.map(language => ({ key: story.key, kind: story.kind, language, story })))

describe('[seed-place-stories] the data', () => {
  it('has seven stories and one review, with distinct keys and slugs', () => {
    expect(placeStories.filter(s => s.kind === 'story')).toHaveLength(7)
    expect(placeStories.filter(s => s.kind === 'editorial_review')).toHaveLength(1)
    expect(new Set(placeStories.map(s => s.key)).size).toBe(placeStories.length)
    const slugs = placeStories.flatMap(s => [s.slug.en, s.slug.de])
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('does not reuse a slug of the 13 stories that are deleted', () => {
    const old = new Set(legacyStoryGroups.flatMap(g => g.slugs))
    expect(placeStories.flatMap(s => [s.slug.en, s.slug.de]).filter(slug => old.has(slug))).toEqual([])
  })

  it('lists 13 legacy groups', () => {
    expect(legacyStoryGroups).toHaveLength(13)
  })

  it.each(versions)('$key/$language passes the story draft schema, with every publish gap but the cover closed', ({ story, language }) => {
    const draft = placeStoryDraft(story, language, cover)
    const parsed = storyDraftSchema.safeParse(draft)
    expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues)).toBe(true)
    expect(storyVersionPublishGaps({ slug: story.slug[language], title: draft.title, excerpt: draft.excerpt, coverMediaId: draft.coverMediaId, kind: story.kind, subjectPlaceId: story.kind === 'editorial_review' ? 'place' : null, checkedOn: draft.checkedOn })).toEqual([])
  })

  it.each(versions)('$key/$language has a title, an excerpt and a closing line of sources with links', ({ story, language }) => {
    const { title, excerpt } = story.versions[language]
    expect(title.length).toBeGreaterThan(5)
    expect(excerpt.length).toBeGreaterThan(30)
    expect(excerpt.length).toBeLessThanOrEqual(1000)
    const body = placeStoryBody(story, language) as StoryBody
    const last = body.content.at(-1)!
    expect(textsOf([last]).join('')).toContain(language === 'en' ? 'Sources: ' : 'Quellen: ')
    const links = (last.content ?? []).flatMap(node => node.marks ?? []).filter(mark => mark.type === 'link')
    expect(links).toHaveLength(story.sources.length)
    for (const mark of links)
      expect(String(mark.attrs?.href)).toMatch(/^https:\/\//)
  })

  it.each(versions)('$key/$language is 300 to 600 words for a story and 150 to 300 for a review, with at least two sections', ({ story, language, kind }) => {
    const facts = storyBodyFacts(placeStoryBody(story, language))
    const [min, max] = kind === 'story' ? [300, 600] : [150, 300]
    expect(facts.words, `${story.key}/${language}`).toBeGreaterThanOrEqual(min)
    expect(facts.words, `${story.key}/${language}`).toBeLessThanOrEqual(max)
    expect(facts.sections).toBeGreaterThanOrEqual(2)
    expect(facts.mediaWithoutCaption).toBe(0)
  })

  it('writes the German in the Sie form and the English without a Sie', () => {
    for (const story of placeStories) {
      const de = textsOf(placeStoryBody(story, 'de').content).join(' ')
      expect(de, story.key).not.toMatch(/\b(?:du|dein|deine|dir)\b/i)
      expect(de, story.key).toMatch(/\bSie\b|\bIhr/)
    }
  })

  it('uses closed values for interests, stay tags and at most three related stories that exist', () => {
    const keys = new Set(placeStories.map(s => s.key))
    for (const story of placeStories) {
      expect(story.interests.every(i => (interestCodes as readonly string[]).includes(i))).toBe(true)
      expect(['short_stay', 'multi_day', 'both']).toContain(story.stayTag)
      expect(story.related.length).toBeLessThanOrEqual(3)
      expect(story.related.every(k => keys.has(k) && k !== story.key)).toBe(true)
      expect(story.kind === 'editorial_review' ? story.checkedOn : 'x').toMatch(/^\d{4}-\d{2}-\d{2}$|^x$/)
    }
  })
})

describe('[seed-place-stories] the plan', () => {
  it('creates every story, publishes those with a cover, links places and sets main stories on pins that have none', () => {
    const plan = planPlaceStories(placeStories, snapshotOf(), none)
    expect(plan.faults).toEqual([])
    expect(plan.creates).toHaveLength(8)
    expect(plan.skipped).toEqual([])
    expect(plan.deletes).toEqual([])
    const chapel = plan.creates.find(c => c.story.key === 'chapel-bridge')!
    expect(chapel.placeIds).toHaveLength(2)
    expect(chapel.mainStoryPlaceIds).toHaveLength(2)
    expect(plan.creates.every(c => c.categoryIds.length === c.story.blogCategories.length)).toBe(true)
    // Every story and every review is the main story of the place it is about.
    expect(plan.creates.every(c => c.mainStoryPlaceIds.length === c.story.mainStoryFor.length && c.story.mainStoryFor.length > 0)).toBe(true)
  })

  it('leaves a story a draft when the place has no ready cover, and says why', () => {
    const plan = planPlaceStories(placeStories, snapshotOf({}, slug => (slug === 'bachmann-at-bahnhof-luzern-ug' ? { coverMediaId: null, coverReady: false } : {})), none)
    const review = plan.creates.find(c => c.story.kind === 'editorial_review')!
    expect(review.publish).toBe(false)
    expect(review.coverMediaId).toBeNull()
    expect(review.draftReason).toContain('no ready cover')
    expect(review.subjectPlaceId).toBe(review.placeIds[0])
    expect(plan.creates.filter(c => !c.publish)).toHaveLength(1)
  })

  it('does not publish a story whose cover file is not ready', () => {
    const plan = planPlaceStories(placeStories, snapshotOf({}, slug => (slug === 'lion-monument' ? { coverReady: false } : {})), none)
    expect(plan.creates.find(c => c.story.key === 'lion-monument')!.publish).toBe(false)
  })

  it('skips a story when either of its slugs exists, so a second run adds nothing', () => {
    const second = planPlaceStories(placeStories, snapshotOf({ slugs: new Set(placeStories.map(s => s.slug.en)) }), none)
    expect(second.creates).toEqual([])
    expect(second.skipped).toHaveLength(8)
    const german = planPlaceStories(placeStories, snapshotOf({ slugs: new Set([placeStories[0]!.slug.de]) }), none)
    expect(german.skipped.map(s => s.key)).toEqual([placeStories[0]!.key])
    expect(german.creates).toHaveLength(7)
  })

  it('keeps a main story that a person chose', () => {
    const plan = planPlaceStories(placeStories, snapshotOf({}, slug => (slug === 'weinmarkt' ? { mainStoryGroupId: 'chosen' } : {})), none)
    expect(plan.creates.find(c => c.story.key === 'weinmarkt')!.mainStoryPlaceIds).toEqual([])
  })

  it('stops with a fault when a place or a blog category is missing, and names it', () => {
    const missingPlace = snapshotOf()
    const places = new Map(missingPlace.places)
    places.delete('weinmarkt')
    const a = planPlaceStories(placeStories, { ...missingPlace, places }, none)
    expect(a.faults.join('\n')).toContain('weinmarkt')
    const b = planPlaceStories(placeStories, { ...snapshotOf(), blogCategoryIds: new Map() }, none)
    expect(b.faults.join('\n')).toContain('blog category history')
  })

  it('deletes only the legacy groups, and only when asked', () => {
    const [first, second] = legacyStoryGroups
    const groups = [{ id: first!.id, slugs: first!.slugs }, { id: second!.id, slugs: [...second!.slugs, 'something-else'] }, { id: 'not-listed', slugs: ['musegg-morning'] }]
    expect(planLegacyDeletes(groups).map(g => g.id)).toEqual([first!.id])
    expect(planPlaceStories(placeStories, snapshotOf({ groups }), none).deletes).toEqual([])
    expect(planPlaceStories(placeStories, snapshotOf({ groups }), { ...none, replaceLegacy: true }).deletes.map(g => g.id)).toEqual([first!.id])
  })

  it('counts a place whose main story is about to be deleted as free, so the dry run matches the real run', () => {
    const lion = legacyStoryGroups[1]!
    const plan = planPlaceStories(placeStories, snapshotOf({ groups: [lion] }, slug => (slug === 'lion-monument' ? { mainStoryGroupId: lion.id } : {})), { ...none, replaceLegacy: true })
    expect(plan.creates.find(c => c.story.key === 'lion-monument')!.mainStoryPlaceIds).toHaveLength(1)
    const without = planPlaceStories(placeStories, snapshotOf({ groups: [lion] }, slug => (slug === 'lion-monument' ? { mainStoryGroupId: lion.id } : {})), none)
    expect(without.creates.find(c => c.story.key === 'lion-monument')!.mainStoryPlaceIds).toEqual([])
  })

  it('prints a plan with counts and titles', () => {
    const text = describePlan(planPlaceStories(placeStories, snapshotOf(), { ...none, replaceLegacy: true }), true)
    expect(text).toContain('Would delete 0 legacy stories')
    expect(text).toContain('Would create 8 stories and reviews, skipping 0')
    expect(text).toContain('crossing-the-chapel-bridge')
  })
})

describe('[seed-place-stories] the one-time steps and links', () => {
  const chapel = placeStories[0]!
  const stored = (language: 'en' | 'de', status: 'draft' | 'published', body: StoryBody) => ({ groupId: 'g1', language, slug: chapel.slug[language], status, rowVersion: 3, doc: { ...placeStoryDraft(chapel, language, cover), body } })

  it('deletes an unused sample pin only when asked, and stops with a fault when something uses it', () => {
    const pins = [{ id: 'p1', slug: 'baeckerei-weinmarkt', uses: 0 }]
    expect(planPlaceStories(placeStories, snapshotOf({ samplePins: pins }), none).pinDeletes).toEqual([])
    expect(planPlaceStories(placeStories, snapshotOf({ samplePins: pins }), { ...none, deleteSamplePins: true }).pinDeletes).toEqual([{ id: 'p1', slug: 'baeckerei-weinmarkt' }])
    const used = planPlaceStories(placeStories, snapshotOf({ samplePins: [{ ...pins[0]!, uses: 2 }] }), { ...none, deleteSamplePins: true })
    expect(used.pinDeletes).toEqual([])
    expect(used.faults.join('\n')).toContain('baeckerei-weinmarkt')
  })

  it('plans a body rewrite only for a stored version whose body differs, and none once the bodies match', () => {
    const old = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'old' }] }] } as StoryBody
    const differing = planPlaceStories(placeStories, snapshotOf({ slugs: new Set([chapel.slug.en, chapel.slug.de]), versions: [stored('en', 'published', old), stored('de', 'draft', placeStoryBody(chapel, 'de'))] }), { ...none, refreshBodies: true })
    expect(differing.refreshes.map(r => `${r.key}/${r.version.language}/${r.version.status}`)).toEqual(['chapel-bridge/en/published'])
    expect(planPlaceStories(placeStories, snapshotOf({ slugs: new Set([chapel.slug.en]), versions: [stored('en', 'published', old)] }), none).refreshes).toEqual([])
  })

  it('links an existing story to a place that has no main story, and leaves a main story a person chose', () => {
    const slugs = new Set(placeStories.flatMap(s => [s.slug.en, s.slug.de]))
    const versions = placeStories.map(s => ({ ...stored('en', 'published', placeStoryBody(s, 'en')), groupId: `group-${s.key}`, slug: s.slug.en }))
    const free = planPlaceStories(placeStories, snapshotOf({ slugs, versions }), none)
    expect(free.creates).toEqual([])
    expect(free.links).toHaveLength(placeStories.reduce((n, s) => n + s.mainStoryFor.length, 0))
    const chosen = planPlaceStories(placeStories, snapshotOf({ slugs, versions }, slug => (slug === 'manor-luzern' ? { mainStoryGroupId: 'mine' } : {})), none)
    expect(chosen.links.some(l => l.key === 'manor-review')).toBe(false)
  })

  it('makes the Bachmann review the main story of its place, as subject and link', () => {
    const review = placeStories.find(s => s.kind === 'editorial_review')!
    expect(review.places).toEqual(['bachmann-at-bahnhof-luzern-ug'])
    expect(review.mainStoryFor).toEqual(review.places)
  })
})

describe('[seed-place-stories] the flags', () => {
  it('--stories-only and --replace-legacy-stories are known flags; stories run by default', () => {
    expect(parseFlags([])).toMatchObject({ storiesOnly: false, replaceLegacyStories: false, unknown: [] })
    expect(parseFlags(['--stories-only', '--dry-run'])).toMatchObject({ dry: true, storiesOnly: true, unknown: [] })
    expect(parseFlags(['--stories-only', '--replace-legacy-stories'])).toMatchObject({ storiesOnly: true, replaceLegacyStories: true, unknown: [] })
    expect(parseFlags(['--stories-only', '--delete-sample-pins', '--refresh-story-bodies'])).toMatchObject({ deleteSamplePins: true, refreshStoryBodies: true, unknown: [] })
  })
})
