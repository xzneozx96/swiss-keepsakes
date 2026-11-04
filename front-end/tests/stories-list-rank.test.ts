import { rankByTags } from '@sk/domain/content'

import { describe, expect, it } from 'vitest'
import { storyCard } from './support/story-cards'

describe('[E4.4] rankByTags over story cards', () => {
  const food = storyCard({ title: 'Food', stayTag: 'short_stay', interests: ['food-drink'] })
  const hike = storyCard({ title: 'Hike', stayTag: 'multi_day', interests: ['lake-mountains'] })
  const any = storyCard({ title: 'Any', stayTag: 'both', interests: [] })

  it('[E4.4][AC38] the stay fit comes first, then the matching interests, then the server order; nothing is dropped', () => {
    const ranked = rankByTags([hike, any, food], { stay: 'short_stay', interests: ['food-drink'] })

    expect(ranked.map(s => s.title)).toEqual(['Food', 'Any', 'Hike'])
  })

  it('[E4.4][AC38] no answers return the server order', () => {
    expect(rankByTags([hike, any, food], { stay: null, interests: [] })).toEqual([hike, any, food])
  })

  it('[E4.4][AC38] an interest code the domain does not know counts for nothing', () => {
    const odd = storyCard({ title: 'Odd', interests: ['unknown-code'] })

    expect(rankByTags([odd, food], { stay: null, interests: ['food-drink'] }).map(s => s.title)).toEqual(['Food', 'Odd'])
  })
})
