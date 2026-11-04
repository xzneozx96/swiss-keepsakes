import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { captureEntry, getVisit, hideCard, resetVisitForTests } from '@/features/onboarding/lib/visit'

const SITE = 'swisskeepsakes.ch'
function capture(over: Partial<Parameters<typeof captureEntry>[0]> = {}) {
  return captureEntry({ pathname: '/en', search: '', referrer: '', siteHost: SITE, ...over })
}

beforeEach(() => {
  window.sessionStorage.clear()
  resetVisitForTests()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('[E4.5][AC91] the entry of a visit', () => {
  it.each([
    ['the home, direct', '/en', '', '', 'home'],
    ['the German home with a slash', '/de/', '', '', 'home'],
    ['the home from the site itself', '/en', '', `https://${SITE}/en/stories`, 'home'],
    ['the home from a social link', '/en', '', 'https://instagram.com/x', 'home'],
    ['the home from a search result', '/en', '', 'https://www.google.com/', 'other'],
    ['the home with a partner tag', '/en', '?utm_medium=partner', '', 'other'],
    ['the home with a partner source tag', '/de', '?utm_source=partner', '', 'other'],
    ['a story', '/en/stories/lucerne', '', '', 'other'],
    ['a keepsake', '/en/gifts/mug', '', '', 'other'],
    ['the map', '/en/map', '', '', 'other'],
    ['a path with no language', '/', '', '', 'other'],
  ])('%s gives %s', (_name, pathname, search, referrer, entry) => {
    capture({ pathname, search, referrer })

    expect(getVisit()).toEqual({ entry, cardHidden: false })
  })

  it('captures once per tab: a later call does not change the entry', () => {
    capture({ pathname: '/en/stories/lucerne' })
    capture({ pathname: '/en' })

    expect(getVisit()?.entry).toBe('other')
  })

  it('survives a reload of the module, as sessionStorage does for the tab', () => {
    capture({ pathname: '/en/stories/lucerne' })
    resetVisitForTests()
    capture({ pathname: '/en' })

    expect(getVisit()?.entry).toBe('other')
    expect(window.sessionStorage.getItem('sk.visit')).toContain('other')
  })

  it('has no visit before the first capture', () => {
    expect(getVisit()).toBeNull()
  })
})

describe('[E4.5][AC36] hideCard', () => {
  it('hides the card for this visit and keeps the entry', () => {
    capture({ pathname: '/en/stories/lucerne' })
    hideCard()

    expect(getVisit()).toEqual({ entry: 'other', cardHidden: true })
    expect(JSON.parse(window.sessionStorage.getItem('sk.visit') ?? '{}')).toEqual({ entry: 'other', cardHidden: true })
  })

  it('does nothing before a capture', () => {
    hideCard()

    expect(getVisit()).toBeNull()
  })
})

describe('[E4.5][AC37] blocked sessionStorage', () => {
  it('keeps the visit in memory, once per tab, without throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    expect(() => capture({ pathname: '/en/map' })).not.toThrow()
    capture({ pathname: '/en' })
    hideCard()

    expect(getVisit()).toEqual({ entry: 'other', cardHidden: true })
  })

  it('ignores a malformed stored value and captures again', () => {
    window.sessionStorage.setItem('sk.visit', '{nope')
    capture({ pathname: '/en' })

    expect(getVisit()).toEqual({ entry: 'home', cardHidden: false })
  })
})
