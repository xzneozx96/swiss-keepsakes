import { describe, expect, it } from 'vitest'

import { ALL_FOOD_PHOTO, topicPhoto } from '@/features/home/lib/food-topics'
import { photoUrl } from '@/lib/photos'

const ICONS = ['cafe', 'bakery', 'restaurant', 'bar', 'brewery', 'market', 'supermarket', 'dessert'] as const

describe('[E4.13] the topic photos of the home food filter (owner, 05.11.2026)', () => {
  it('maps each food icon to its own topic photo, and each photo is in the photo registry', () => {
    const slugs = ICONS.map(icon => topicPhoto(icon))

    expect(slugs).toEqual(ICONS.map(icon => `food-topic-${icon}`))
    for (const slug of [...slugs, ALL_FOOD_PHOTO])
      expect({ slug, url: photoUrl(slug) }).toEqual({ slug, url: expect.stringContaining(`${slug}.jpg`) })
  })

  it('has no photo for an icon outside food or for a category without an icon', () => {
    expect(topicPhoto('toilet')).toBeUndefined()
    expect(topicPhoto(null)).toBeUndefined()
  })
})
