import { describe, expect, it } from 'vitest'

import { rankStories } from '@/features/content/lib/rank-stories'
import { storyCard } from './support/story-cards'

describe('[E4.4] rankStories', () => {
  const food = storyCard({ title: 'Food', stayTag: 'short_stay', interests: ['food-drink'] })
  const hike = storyCard({ title: 'Hike', stayTag: 'multi_day', interests: ['lake-mountains'] })
  const any = storyCard({ title: 'Any', stayTag: 'both', interests: [] })

  it('[E4.4][AC38] the stay fit comes first, then the matching interests, then the server order; nothing is dropped', () => {
    const ranked = rankStories([hike, any, food], { stay: 'short_stay', interests: ['food-drink'] })

    expect(ranked.map(s => s.title)).toEqual(['Food', 'Any', 'Hike'])
  })

  it('[E4.4][AC38] no answers return the server order', () => {
    expect(rankStories([hike, any, food], { stay: null, interests: [] })).toEqual([hike, any, food])
  })

  it('[E4.4][AC38] an interest code the domain does not know counts for nothing', () => {
    const odd = storyCard({ title: 'Odd', interests: ['unknown-code'] })

    expect(rankStories([odd, food], { stay: null, interests: ['food-drink'] }).map(s => s.title)).toEqual(['Food', 'Odd'])
  })
})
