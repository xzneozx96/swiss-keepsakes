import { emptyStoryBody } from '@sk/domain/content'
import { describe, expect, it } from 'vitest'

import { checkText } from '@/features/stories/lib/check-text'
import { linkPath, normalizeSlug, slugSuggestion } from '@/features/stories/lib/link'
import { publishChecks } from '@/features/stories/lib/publish-checks'
import { en } from '@/i18n/en'

type Input = Parameters<typeof publishChecks>[0]
type Body = Input['fields']['body']

const t = ((key: string, params: Record<string, string | number> = {}) =>
  Object.entries(params).reduce((line, [name, value]) => line.split(`{${name}}`).join(String(value)), (en as Record<string, string>)[key] ?? key)) as Parameters<typeof checkText>[0]

const emptyBody = emptyStoryBody as Body
const text = (value: string) => ({ type: 'paragraph', content: [{ type: 'text', text: value }] })
const image = (attrs: Record<string, unknown> = {}) => ({ type: 'image', attrs: { mediaId: 'm', ...attrs } })
const body = (...content: object[]) => ({ type: 'doc', content }) as Body

const group = { kind: 'story', subjectPlaceId: null, categoryIds: ['c'], relatedGroupIds: [], keepsakeProductIds: [] } as Input['group']
const filled = { title: 'T', excerpt: 'E', coverMediaId: 'cover', body: body(text('Hello')) }

function checks(over: Partial<Input> = {}) {
  return publishChecks({ group, language: 'en', slug: 'musegg', fields: filled, otherExists: true, ...over })
}
const codes = (list: { code: string }[]) => list.map(check => check.code)

describe('[E4.3][AC30] publish checks', () => {
  it('[E4.3][AC30] AC-2 a new story is blocked by cover, title, excerpt and link, in that order', () => {
    const result = checks({ slug: null, fields: { title: '', excerpt: '', coverMediaId: null, body: emptyBody } })

    expect(codes(result.blocking)).toEqual(['cover', 'title', 'excerpt', 'link'])
    expect(result.blocking.map(check => checkText(t, check))).toEqual(['Add a cover photo.', 'Add a title.', 'Add a short summary.', 'Set the story’s link.'])
    expect(result.blocking.map(check => `${check.step}:${check.target}`)).toEqual(['write:cover', 'write:title', 'write:excerpt', 'details:link'])
  })

  it('[E4.3][AC30] AC-2 an editorial review with no place and no check date adds both review checks', () => {
    const review = checks({ group: { ...group, kind: 'editorial_review' } })

    expect(codes(review.blocking)).toEqual(['review-place', 'review-date'])
    expect(review.blocking.map(check => checkText(t, check))).toEqual(['Choose the place this review is about.', 'Add the day the facts were checked.'])
    expect(codes(checks().blocking)).toEqual([])
  })

  it('[E4.3][AC30] AC-1 one language is enough: the other language only warns', () => {
    const result = checks({ otherExists: false })

    expect(result.blocking).toEqual([])
    expect(codes(result.warnings)).toEqual(['other-language'])
    expect(checkText(t, result.warnings[0]!)).toBe('No Deutsch version yet: those readers see this one with a language notice.')
  })

  it('[E4.3][AC30] AC-3 an empty body, a photo with no description and no category are warnings, never blocking', () => {
    const photo = checks({ group: { ...group, categoryIds: [] }, fields: { ...filled, body: body(image()) } })

    expect(photo.blocking).toEqual([])
    expect(codes(photo.warnings)).toEqual(['no-alt', 'no-caption', 'no-category'])

    const empty = checks({ group: { ...group, categoryIds: [] }, fields: { ...filled, body: emptyBody } })

    expect(empty.blocking).toEqual([])
    expect(codes(empty.warnings)).toEqual(['no-text', 'no-category'])
  })

  it('[E4.3] the warnings count photos without alt and media without caption, and blank text is no text (the domain facts)', () => {
    const warned = (content: Body) => checks({ fields: { ...filled, body: content } }).warnings.map(warning => [warning.code, warning.count])

    expect(warned(body(text('   ')))).toContainEqual(['no-text', undefined])
    expect(warned(body(text('Hi'), image({ alt: 'a', caption: 'c' }), image({ alt: ' ' }), { type: 'video', attrs: { mediaId: 'v' } }, { type: 'audio', attrs: { mediaId: 'a', caption: 'x' } })))
      .toEqual(expect.arrayContaining([['no-alt', 1], ['no-caption', 2]]))
  })

  it('[E4.3] pin, related and keepsake warnings come from the facts, and an id missing from the facts adds nothing', () => {
    const linked = body({ type: 'paragraph', content: [
      { type: 'text', text: 'a', marks: [{ type: 'pinLink', attrs: { pinId: 'p1' } }] },
      { type: 'text', text: 'b', marks: [{ type: 'pinLink', attrs: { pinId: 'p-unknown' } }] },
    ] })
    const result = checks({
      group: { ...group, relatedGroupIds: ['g1', 'g2', 'g-unknown'], keepsakeProductIds: ['k1', 'k2'] },
      fields: { ...filled, body: linked },
      facts: {
        pins: [{ id: 'p1', name: 'Museggmauer', status: 'draft' }],
        related: [{ groupId: 'g1', name: 'Kapellbrücke', published: false }, { groupId: 'g2', name: 'Pilatus', published: true }],
        keepsakes: [{ id: 'k1', name: 'Knife', published: false }, { id: 'k2', name: 'Bell', published: true }],
      },
    })

    expect(codes(result.warnings)).toEqual(['pin-unpublished', 'related-language', 'keepsake-unpublished'])
    expect(result.warnings.map(check => checkText(t, check))).toEqual([
      'The pin Museggmauer is not published, so its link shows as plain text.',
      '“Kapellbrücke” has no published English version, so readers of this version will not see it.',
      'Knife is not published and stays hidden on the story.',
    ])
    expect(codes(checks({ group: { ...group, relatedGroupIds: ['g1'] }, fields: { ...filled, body: linked } }).warnings)).toEqual([])
  })

  it('[E4.3][AC30] AC-4 refused gaps join the blocking list once', () => {
    expect(codes(checks({ refused: ['coverMediaId'] }).blocking)).toEqual(['cover'])
    expect(checkText(t, checks({ refused: ['coverMediaId'] }).blocking[0]!)).toBe('Add a cover photo.')

    const both = checks({ fields: { ...filled, coverMediaId: null }, refused: ['coverMediaId', 'slug', 'slug'] })

    expect(codes(both.blocking)).toEqual(['cover', 'link'])
  })

  it('[E4.3] plural texts: one and other for no-alt, no-caption', () => {
    const one = { code: 'no-alt', step: 'write', target: 'body', count: 1 } as const
    const many = { code: 'no-caption', step: 'write', target: 'body', count: 3 } as const

    expect(checkText(t, one)).toBe('One photo has no description for screen readers.')
    expect(checkText(t, { ...one, count: 2 })).toBe('2 photos have no description for screen readers.')
    expect(checkText(t, { ...many, count: 1 })).toBe('One photo, video or recording has no caption.')
    expect(checkText(t, many)).toBe('3 photos, videos or recordings have no caption.')
  })

  it('[E4.3][AC30] AC-6 slugSuggestion prefers the other language, falls back to the title, and is null when empty or equal', () => {
    expect(slugSuggestion({ otherSlug: 'musegg-wall', title: 'Andere', current: null })).toBe('musegg-wall')
    expect(slugSuggestion({ otherSlug: null, title: 'Neue Wege', current: null })).toBe('neue-wege')
    expect(slugSuggestion({ otherSlug: '', title: '', current: null })).toBeNull()
    expect(slugSuggestion({ otherSlug: 'musegg-wall', title: '', current: 'musegg-wall' })).toBeNull()
    expect(normalizeSlug('musegg-wall')).toBe('musegg-wall')
    expect(normalizeSlug(' Musegg Wall! ')).toBe('musegg-wall')
    expect(normalizeSlug('')).toBe('')
    expect(linkPath('de', 'a')).toBe('/de/stories/a')
    expect(linkPath('en', null)).toBe('/en/stories/…')
  })
})
