import { describe, expect, it } from 'vitest'
import { kindFilter, toResult } from '@/features/search/lib/search'
import { keepsakeCard, mapItem, tourCard } from './support/search-fixtures'
import { storyCard } from './support/story-cards'

describe('[ADR-033][slice 6] a hit becomes the row the screen draws', () => {
  it('a place opens the map with its card, the others their own pages, each in the language the card carries', () => {
    expect(toResult({ kind: 'place', card: mapItem({ title: 'Löwendenkmal', slug: 'lion-monument', language: 'de' }) })).toMatchObject({ kind: 'place', title: 'Löwendenkmal', link: { to: '/$lang/map', params: { lang: 'de' }, search: { place: 'lion-monument' } } })
    expect(toResult({ kind: 'story', card: storyCard({ title: 'A', slug: 'a' }) })?.link).toEqual({ to: '/$lang/stories/$slug', params: { lang: 'en', slug: 'a' } })
    expect(toResult({ kind: 'tour', card: tourCard({ title: 'B', slug: 'b' }) })?.link).toEqual({ to: '/$lang/tours/$slug', params: { lang: 'en', slug: 'b' } })
    expect(toResult({ kind: 'keepsake', card: keepsakeCard({ name: 'C', slug: 'c' }) })).toMatchObject({ title: 'C', link: { to: '/$lang/gifts/$slug', params: { lang: 'en', slug: 'c' } } })
  })

  it('a place with no slug has no row, and the photo comes from the cover variant, else the original, else the media key', () => {
    expect(toResult({ kind: 'place', card: mapItem({ title: 'No page', slug: null }) })).toBeNull()
    const cover = { url: 'https://m/original.jpg', variants: [{ width: 320, url: 'https://m/320.webp' }] }

    expect(toResult({ kind: 'story', card: storyCard({ title: 'A', cover }) })).toMatchObject({ photoUrl: 'https://m/320.webp', photoKey: null })
    expect(toResult({ kind: 'story', card: storyCard({ title: 'A', cover: { url: 'https://m/original.jpg', variants: [] } }) })).toMatchObject({ photoUrl: 'https://m/original.jpg' })
    expect(toResult({ kind: 'tour', card: tourCard({ title: 'B', coverKey: 'k/1' }) })).toMatchObject({ photoUrl: null, photoKey: 'k/1' })
  })
})

describe('[ADR-033][slice 6] the kind filter shows the server counts', () => {
  it('all plus each kind with hits, in the fixed order, with the sum for All', () => {
    expect(kindFilter({ story: 2, place: 1, tour: 0, keepsake: 3 })).toEqual([
      { kind: 'all', count: 6 },
      { kind: 'place', count: 1 },
      { kind: 'story', count: 2 },
      { kind: 'keepsake', count: 3 },
    ])
  })

  it('hits of one kind only, or none, show no filter', () => {
    expect(kindFilter({ story: 4, place: 0, tour: 0, keepsake: 0 })).toBeNull()
    expect(kindFilter({ story: 0, place: 0, tour: 0, keepsake: 0 })).toBeNull()
  })
})
