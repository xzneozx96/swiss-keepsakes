import { describe, expect, it } from 'vitest'

import { pilatus } from '@/features/tours/lucerne/pilatus'
import { rigi } from '@/features/tours/lucerne/rigi'
import { thingsThatRemain } from '@/features/tours/lucerne/things-that-remain'

// A tour is a route to follow on one's own (owner, 05.11.2026): its text offers no guide, group, booking or meeting point.
const banned = {
  en: /\bguid(?:e|es|ed|ing)\b|small group|\bbook|\bmeet|organi[sz]er|proposed|2–8|\bwe\b|\bour\b/i,
  de: /(?<![a-zäöü])Führung|Kleine Gruppe|Gruppe(?!n ab zehn)|buch(?:en|ung)|Treffpunkt|Veranstalter|vorgeschlagen|2–8|\bwir\b|\bunser/i,
}

// What the guest page shows of a tour: the included and excluded lists and the cancellation rule are not on it. Only the text counts, not the field names.
function shown({ included, excluded, cancellationPolicy, ...rest }: typeof rigi, language: 'en' | 'de') {
  const texts: string[] = []
  const walk = (value: unknown) => {
    if (typeof value === 'string')
      texts.push(value)
    else if (value && typeof value === 'object')
      Object.entries(value).forEach(([key, inner]) => walk(typeof inner === 'string' && (key === 'en' || key === 'de') ? (key === language ? inner : '') : inner))
  }

  walk(rest)

  return texts.join('\n')
}

describe('tour content', () => {
  for (const tour of [rigi, pilatus, thingsThatRemain]) {
    for (const language of ['en', 'de'] as const) {
      it(`[${tour.slug}] reads as advice for a visitor on their own (${language})`, () => {
        const text = shown(tour, language)

        expect(text.length).toBeGreaterThan(500)
        const m = banned[language].exec(text)
        const hit = m && m[0]

        expect(hit).toBeNull()
      })
    }
  }

  it('starts at a plain starting point', () => {
    expect(rigi.meetingPoint.en).toBe('Luzerne landing stages, Pier 1 for Vitznau')
    expect(pilatus.meetingPoint.en).toBe('Luzerne railway station')
  })
})
