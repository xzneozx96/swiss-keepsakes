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
  photoKey: 'store/photo',
  link: 'https://hotel.example',
  photos: [{ key: 'store/photo', alt: 'The bridge' }],
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

  it('leaves a photo out while the front end has no address for the media store, so the slot shows the icon', () => {
    expect(toPlaceDetail(read).photos).toEqual([])
  })
})
