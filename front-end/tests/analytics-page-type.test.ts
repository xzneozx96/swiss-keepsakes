import { describe, expect, it } from 'vitest'
import { languageOf, pageTypeOf } from '@/lib/analytics/page-type'

describe('[E8.7][AC37][AC60][AC-4] pageTypeOf (R6)', () => {
  it.each([
    ['/en', 'home'],
    ['/de', 'home'],
    ['/en/', 'home'],
    ['/EN', 'home'],
    ['/en/stories', 'stories'],
    ['/en/stories/lucerne-old-town', 'story'],
    ['/de/stories/x', 'story'],
    ['/en/map', 'map'],
    ['/en/tours', 'tours'],
    ['/en/tours/rigi-sunrise', 'tour'],
    ['/en/gifts', 'keepsakes'],
    ['/en/gifts/music-box', 'keepsake'],
    ['/en/credits', 'other'],
    ['/en/search', 'other'],
    ['/en/stories/x/y', 'other'],
    ['/', 'other'],
    ['/stories', 'other'],
    ['/fr/stories', 'other'],
    ['', 'other'],
  ])('%s is %s', (path, expected) => {
    expect(pageTypeOf(path)).toBe(expected)
  })
})

describe('[E8.7][AC37][AC60][AC-4] languageOf', () => {
  it('reads the language segment of the path', () => {
    expect(languageOf('/en/map')).toBe('en')
    expect(languageOf('/de')).toBe('de')
    expect(languageOf('/DE/stories')).toBe('de')
  })

  it('is undefined on a path without one', () => {
    expect(languageOf('/')).toBeUndefined()
    expect(languageOf('/stories')).toBeUndefined()
    expect(languageOf('/fr')).toBeUndefined()
  })
})
