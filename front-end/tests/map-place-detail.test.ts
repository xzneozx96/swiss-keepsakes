import type { PublicPin } from '@sk/api-contract'

import { describe, expect, it } from 'vitest'

import { toPlaceDetail } from '@/features/map/lib/place-detail'

const read: PublicPin = {
  id: '00000000-0000-4000-8000-000000000101',
  slug: 'chapel-bridge',
  title: 'Chapel Bridge',
  tip: 'Go early.',
  latitude: 47.0516,
  longitude: 8.3074,
  address: 'Kapellbrücke',
  mapsLink: 'https://maps.app.goo.gl/abc',
  weeklyHours: [{ day: 1, opens: '09:00', closes: '17:00' }],
  stayTag: 'both',
  interests: [],
  categories: [],
  nextDate: null,
  hasMainStory: true,
  mainStorySlug: 'story',
  link: 'https://hotel.example',
  photos: [
    { url: 'https://media.test/s/a/original.jpg', variants: [320, 640, 1280].map(width => ({ width, url: `https://media.test/s/a/w${width}.webp` })), alt: 'The bridge' },
    { url: 'https://media.test/s/b/original.jpg', variants: [{ width: 320, url: 'https://media.test/s/b/w320.webp' }], alt: null },
    { url: 'https://media.test/s/c/original.jpg', variants: [], alt: null },
  ],
  mainStory: { slug: 'story', title: 'The story', readMinutes: 5 },
  otherStories: [],
  language: 'en',
  requestedLanguage: 'en',
  fallback: false,
  availableLanguages: ['en'],
}

describe('[E4.7][N03] the pin read as the sheet shows it', () => {
  it('keeps the card\'s facts, the stored map link and the stories', () => {
    expect(toPlaceDetail(read)).toMatchObject({
      title: 'Chapel Bridge',
      tip: 'Go early.',
      address: 'Kapellbrücke',
      mapsLink: 'https://maps.app.goo.gl/abc',
      hours: [{ day: 1, opens: '09:00', closes: '17:00' }],
      link: 'https://hotel.example',
      mainStory: { slug: 'story', title: 'The story', readMinutes: 5 },
    })
  })

  it('picks the smallest copy that is at least 800 px for the carousel, else the largest copy, else the original', () => {
    expect(toPlaceDetail(read).photos).toEqual([
      { src: 'https://media.test/s/a/w1280.webp', alt: 'The bridge' },
      { src: 'https://media.test/s/b/w320.webp', alt: null },
      { src: 'https://media.test/s/c/original.jpg', alt: null },
    ])
  })
})
