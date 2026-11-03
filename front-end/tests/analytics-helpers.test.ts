import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { trackProductView, trackStoryView } from '@/lib/analytics/helpers'
import { installFakeAnalytics } from './support/fake-analytics'

const STORY = '3f1c2b8e-5a47-4d0e-9b6a-1c2d3e4f5a6b'
const KEEPSAKE = '7a9d0c11-2b3e-4f56-8a77-0b1c2d3e4f5a'
const fake = installFakeAnalytics()

beforeEach(() => fake.reset())
afterEach(() => fake.reset())

describe('[E8.7][AC37][AC60][AC-9] trackStoryView and trackProductView', () => {
  it('tracks story_view on page type story with the story id', () => {
    trackStoryView(STORY, 'de')

    expect(fake.events).toHaveLength(1)
    expect(fake.events[0]).toMatchObject({ name: 'story_view', props: { page_type: 'story', content_id: STORY, language: 'de' } })
  })

  it('tracks product_view on page type keepsake with the keepsake id', () => {
    trackProductView(KEEPSAKE, 'en')

    expect(fake.events[0]).toMatchObject({ name: 'product_view', props: { page_type: 'keepsake', content_id: KEEPSAKE, language: 'en' } })
  })

  it('carries no price, URL or other content property', () => {
    trackStoryView(STORY, 'en')
    trackProductView(KEEPSAKE, 'en')

    for (const event of fake.events)
      expect(Object.keys(event.props).sort()).toEqual(['content_id', 'device_class', 'language', 'page_type', 'referrer_class'])
  })
})
