import type { OnboardingRecord } from '@/features/onboarding/lib/record'
import type { Visit } from '@/features/onboarding/lib/visit'
import { describe, expect, it } from 'vitest'
import { EMPTY_RECORD } from '@/features/onboarding/lib/record'
import { canShowOnboarding, flowTrigger } from '@/features/onboarding/lib/rules'

type Audience = 'guest' | 'staff' | 'unknown'

const answered: OnboardingRecord = { ...EMPTY_RECORD, segment: 'short_stay', answeredAt: '2026-11-04T10:00:00.000Z' }
const skipped: OnboardingRecord = { ...EMPTY_RECORD, dismissedAt: '2026-11-04T10:00:00.000Z' }
const home: Visit = { entry: 'home', cardHidden: false }
const other: Visit = { entry: 'other', cardHidden: false }

function trigger(over: Partial<{ record: OnboardingRecord, visit: Visit | null, audience: Audience, pathname: string, isExplore: boolean }> = {}) {
  return flowTrigger({ record: EMPTY_RECORD, visit: home, audience: 'guest', pathname: '/en', isExplore: false, ...over })
}

describe('[E4.5][AC92] canShowOnboarding: who may see it', () => {
  it.each([
    ['guest', '/en', true],
    ['guest', '/de/stories', true],
    ['guest', '/en/map', true],
    ['staff', '/en', false],
    ['unknown', '/en', false],
    ['guest', '/store/orders', false],
    ['guest', '/partner/report', false],
    ['guest', '/admin', false],
    ['guest', '/sign-in', false],
    ['guest', '/invitation/abc', false],
    ['guest', '/account', false],
    ['guest', '/en/plan', false],
    ['guest', '/r/abc', false],
    ['staff', '/store/orders', false],
  ] as const)('%s on %s gives %s', (audience, pathname, allowed) => {
    expect(canShowOnboarding({ pathname, audience })).toBe(allowed)
  })
})

describe('[E4.5][AC91] flowTrigger: when the flow opens by itself', () => {
  it('opens for an unanswered guest whose visit began at the home, on the home', () => {
    expect(trigger()).toBe('open')
  })

  it('waits for an unanswered guest whose visit began at the home while they are on another page', () => {
    expect(trigger({ pathname: '/en/stories' })).toBe('wait')
  })

  it('waits for a visit that began elsewhere until the guest opens Explore from inside the app', () => {
    expect(trigger({ visit: other, pathname: '/en' })).toBe('wait')
    expect(trigger({ visit: other, pathname: '/en/stories/lucerne' })).toBe('wait')
    expect(trigger({ visit: other, pathname: '/en', isExplore: true })).toBe('open')
  })

  it('does not open Explore on a page that is not the home', () => {
    expect(trigger({ visit: other, pathname: '/en/map', isExplore: true })).toBe('wait')
  })

  it('waits before the visit is captured', () => {
    expect(trigger({ visit: null })).toBe('wait')
  })

  it('never opens for an answered guest or one who skipped', () => {
    expect(trigger({ record: answered })).toBe('wait')
    expect(trigger({ record: skipped })).toBe('wait')
    expect(trigger({ record: skipped, visit: other, isExplore: true })).toBe('wait')
  })

  it('never opens for staff, an unknown audience or a private path', () => {
    expect(trigger({ audience: 'staff' })).toBe('wait')
    expect(trigger({ audience: 'unknown' })).toBe('wait')
    expect(trigger({ visit: other, isExplore: true, pathname: '/account' })).toBe('wait')
  })

  it('hiding the card does not stop the flow at the next Explore opening', () => {
    expect(trigger({ visit: { entry: 'other', cardHidden: true }, isExplore: true })).toBe('open')
  })
})
