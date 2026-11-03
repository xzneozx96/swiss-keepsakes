import { describe, expect, it } from 'vitest'

import { pinLinkHref } from '../src/content/index.ts'

const pin = { published: true, website: null, slug: null }

describe('[E4.3][AC45] AC-3 pinLinkHref', () => {
  it('goes to the website of a published pin', () => {
    expect(pinLinkHref({ ...pin, website: 'https://zyt.example/tower', slug: 'zyt' }, 'en')).toBe('https://zyt.example/tower')
  })

  it('goes to the map when a published pin has no website', () => {
    expect(pinLinkHref({ ...pin, slug: 'musegg' }, 'de')).toBe('/de/map?place=musegg')
  })

  it('is null for an unpublished pin even with a website', () => {
    expect(pinLinkHref({ published: false, website: 'https://zyt.example', slug: 'zyt' }, 'en')).toBeNull()
  })

  it('is null for a published pin with no website and no slug', () => {
    expect(pinLinkHref(pin, 'en')).toBeNull()
  })

  it('skips an unsafe website and uses the slug', () => {
    expect(pinLinkHref({ ...pin, website: 'javascript:alert(1)', slug: 'musegg' }, 'en')).toBe('/en/map?place=musegg')
  })

  it('encodes the slug in the query', () => {
    expect(pinLinkHref({ ...pin, slug: 'old town' }, 'en')).toBe('/en/map?place=old%20town')
  })
})
