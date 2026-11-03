import type { CaptureResult } from 'posthog-js'
import { describe, expect, it } from 'vitest'
import { allowListBeforeSend } from '@/lib/analytics/allow-list'

const ID = '3f1c2b8e-5a47-4d0e-9b6a-1c2d3e4f5a6b'
const OTHER_ID = '7a9d0c11-2b3e-4f56-8a77-0b1c2d3e4f5a'
const TRANSPORT = { token: 'phc_test', distinct_id: 'anon-1' }

function capture(event: string, properties: Record<string, unknown>): CaptureResult {
  return { uuid: '0192b1a0-0000-7000-8000-000000000001', event, properties: { ...TRANSPORT, ...properties }, timestamp: new Date('2026-11-03T10:00:00Z') }
}

function passes(event: string, properties: Record<string, unknown>) {
  const result = allowListBeforeSend(capture(event, properties))

  expect(result).not.toBeNull()
  expect(result?.event).toBe(event)

  return result as CaptureResult
}

describe('[E8.7][AC37][AC60][AC-1] allowListBeforeSend: events that pass', () => {
  const passing: Array<[string, string, Record<string, unknown>]> = [
    ['page_view home, language en, referrer class search', 'page_view', { page_type: 'home', language: 'en', referrer_class: 'search' }],
    ['page_view with every optional closed property', 'page_view', { page_type: 'stories', language: 'de', referrer_class: 'social', device_class: 'phone', segment: 'short_stay', interests: ['food-drink'] }],
    ['page_view on a page that names a content (place)', 'page_view', { page_type: 'place', content_id: ID }],
    ['pin_open on page type place with a pin id, language de', 'pin_open', { page_type: 'place', content_id: ID, language: 'de' }],
    ['pin_to_story_click with a pin id', 'pin_to_story_click', { page_type: 'place', content_id: ID }],
    ['story_view with segment multi_day and two interests', 'story_view', { page_type: 'story', content_id: ID, segment: 'multi_day', interests: ['history-culture', 'lake-mountains'] }],
    ['product_view on a keepsake page with a keepsake id', 'product_view', { page_type: 'keepsake', content_id: OTHER_ID }],
    ['outbound_click on page type place with a pin id', 'outbound_click', { page_type: 'place', content_id: ID }],
  ]

  it.each(passing)('%s passes with its closed properties unchanged', (_label, event, properties) => {
    const result = passes(event, properties)

    expect(result.properties).toEqual({ ...properties, ...TRANSPORT, $process_person_profile: false })
  })

  it('returns a new result with uuid, event and timestamp, and no $set, $set_once or $unset', () => {
    const input = { ...capture('page_view', { page_type: 'home' }), $set: { email: 'a@b.ch' }, $set_once: { x: 1 }, $unset: ['y'] }
    const result = allowListBeforeSend(input) as CaptureResult

    expect(result).not.toBe(input)
    expect(result.uuid).toBe(input.uuid)
    expect(result.timestamp).toBe(input.timestamp)
    expect(Object.keys(result).sort()).toEqual(['event', 'properties', 'timestamp', 'uuid'])
  })

  it('does not invent a timestamp the input did not have', () => {
    const input = capture('page_view', { page_type: 'home' })

    delete input.timestamp

    expect(Object.keys(allowListBeforeSend(input) as CaptureResult)).not.toContain('timestamp')
  })
})

describe('[E8.7][AC37][AC60][AC-1] allowListBeforeSend: events that are dropped', () => {
  const dropped: Array<[string, string, Record<string, unknown>]> = [
    ['$pageview', '$pageview', { page_type: 'home' }],
    ['$autocapture', '$autocapture', { page_type: 'home' }],
    ['$identify', '$identify', { page_type: 'home' }],
    ['order_submit', 'order_submit', { page_type: 'other' }],
    ['an unknown event name', 'cart_add', { page_type: 'keepsake', content_id: ID }],
    ['an empty event name', '', { page_type: 'home' }],
    ['pin_open without a pin id', 'pin_open', { page_type: 'place' }],
    ['pin_open on page type home', 'pin_open', { page_type: 'home', content_id: ID }],
    ['pin_to_story_click without a pin id', 'pin_to_story_click', { page_type: 'place' }],
    ['outbound_click without a pin id', 'outbound_click', { page_type: 'place' }],
    ['story_view on a keepsake page', 'story_view', { page_type: 'keepsake', content_id: ID }],
    ['story_view without a story id', 'story_view', { page_type: 'story' }],
    ['product_view on a story page', 'product_view', { page_type: 'story', content_id: ID }],
    ['product_view without a keepsake id', 'product_view', { page_type: 'keepsake' }],
    ['page_view without a page type', 'page_view', { language: 'en' }],
    ['page_view with an unknown page type', 'page_view', { page_type: 'checkout' }],
    ['page_view on home with a content id', 'page_view', { page_type: 'home', content_id: ID }],
    ['page_view with referrer class facebook', 'page_view', { page_type: 'home', referrer_class: 'facebook' }],
    ['page_view with a field userId', 'page_view', { page_type: 'home', userId: 'u1' }],
    ['page_view with a field email', 'page_view', { page_type: 'home', email: 'a@b.ch' }],
    ['page_view with a field orderId', 'page_view', { page_type: 'home', orderId: 'o1' }],
    ['page_view with a field outside the list (url)', 'page_view', { page_type: 'home', url: 'https://x.ch/' }],
    ['page_view with language fr', 'page_view', { page_type: 'home', language: 'fr' }],
    ['page_view with device class watch', 'page_view', { page_type: 'home', device_class: 'watch' }],
    ['page_view with segment both', 'page_view', { page_type: 'home', segment: 'both' }],
    ['page_view with a null value', 'page_view', { page_type: 'home', language: null }],
    ['a content id that is not a uuid', 'pin_open', { page_type: 'place', content_id: 'dom-kapelle-luzern' }],
    ['a content id that is a number', 'pin_open', { page_type: 'place', content_id: 42 }],
    ['interests with a value outside the closed list', 'story_view', { page_type: 'story', content_id: ID, interests: ['food-drink', 'nightlife'] }],
    ['interests that is not an array', 'story_view', { page_type: 'story', content_id: ID, interests: 'food-drink' }],
    ['interests with a duplicate', 'story_view', { page_type: 'story', content_id: ID, interests: ['food-drink', 'food-drink'] }],
    ['interests that is empty', 'story_view', { page_type: 'story', content_id: ID, interests: [] }],
    ['a token that is not a string', 'page_view', { page_type: 'home', token: 5 }],
  ]

  it.each(dropped)('%s is dropped, never repaired', (_label, event, properties) => {
    expect(allowListBeforeSend(capture(event, properties))).toBeNull()
  })
})

describe('[E8.7][AC37][AC60][AC-1] allowListBeforeSend: $ properties and person fields', () => {
  it('strips $current_url, $pathname, $referrer, $user_agent and every other $ property from a passing event', () => {
    const result = passes('pin_open', {
      page_type: 'place',
      content_id: ID,
      language: 'en',
      $current_url: 'https://guest.example/en/map?place=slug',
      $pathname: '/en/map',
      $referrer: 'https://www.google.com/',
      $referring_domain: 'www.google.com',
      $user_agent: 'Mozilla/5.0',
      $browser: 'Chrome',
      $os: 'Linux',
      $screen_width: 1280,
      $lib: 'web',
      $session_id: 's1',
      $device_id: 'd1',
      $time: 1,
      $process_person_profile: true,
    })

    expect(result.properties).toEqual({ page_type: 'place', content_id: ID, language: 'en', ...TRANSPORT, $process_person_profile: false })
    expect(Object.keys(result.properties).filter(key => key.startsWith('$'))).toEqual(['$process_person_profile'])
  })

  it('forces $process_person_profile to false even when the input omits it or sets it true', () => {
    expect(passes('page_view', { page_type: 'home' }).properties.$process_person_profile).toBe(false)
    expect(passes('page_view', { page_type: 'home', $process_person_profile: true }).properties.$process_person_profile).toBe(false)
  })

  it('removes $set and $set_once that a caller attached', () => {
    const input = { ...capture('page_view', { page_type: 'home' }), $set: { email: 'a@b.ch' }, $set_once: { name: 'x' } }
    const result = allowListBeforeSend(input) as CaptureResult

    expect(result).not.toHaveProperty('$set')
    expect(result).not.toHaveProperty('$set_once')
  })

  it('does not mutate the input, passing or dropped', () => {
    const passing = capture('pin_open', { page_type: 'place', content_id: ID, $current_url: 'https://x.ch/', interests: ['food-drink'] })
    const dropping = capture('page_view', { page_type: 'home', email: 'a@b.ch', $current_url: 'https://x.ch/' })
    const passingBefore = structuredClone(passing)
    const droppingBefore = structuredClone(dropping)

    allowListBeforeSend(passing)
    allowListBeforeSend(dropping)

    expect(passing).toEqual(passingBefore)
    expect(dropping).toEqual(droppingBefore)
  })

  it('returns an interests array that is a copy, not the input array', () => {
    const interests = ['food-drink', 'history-culture']
    const result = passes('story_view', { page_type: 'story', content_id: ID, interests })

    expect(result.properties.interests).toEqual(interests)
    expect(result.properties.interests).not.toBe(interests)
  })
})
