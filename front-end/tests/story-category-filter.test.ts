import { describe, expect, it } from 'vitest'

import { filterStories, offeredCategories, resolveCategory } from '@/features/content/lib/category-filter'
import { blogCategory, ref } from './support/blog-categories'
import { storyCard } from './support/story-cards'

const legends = blogCategory({ slug: 'legends', name: { en: 'Legends', de: 'Sagen' }, position: 2 })
const tips = blogCategory({ slug: 'practical-tips', name: { en: 'Practical tips', de: null }, position: 3 })
const history = blogCategory({ slug: 'swiss-history', name: { en: 'Swiss history', de: 'Schweizer Geschichte' }, position: 1 })
const castles = blogCategory({ slug: 'castles', name: { en: 'Castles', de: 'Burgen' }, parentId: history.id, position: 1 })
const all = [history, legends, tips, castles]

describe('[E4.4][AC30] offeredCategories', () => {
  it('[AC-1] offers only categories that a story in the list has', () => {
    const stories = [storyCard({ title: 'A', categories: [ref(legends)] }), storyCard({ title: 'B', categories: [ref(tips)] })]

    expect(offeredCategories(all, stories, 'en').map(o => o.slug)).toEqual(['legends', 'practical-tips'])
  })

  it('[AC-2] a parent is offered through a sub-category, and the sub-category follows its parent', () => {
    const stories = [storyCard({ title: 'A', categories: [ref(castles)] }), storyCard({ title: 'B', categories: [ref(legends)] })]

    expect(offeredCategories(all, stories, 'en').map(o => o.slug)).toEqual(['swiss-history', 'castles', 'legends'])
  })

  it('[AC-2] a sub-category is offered only when a story has it directly', () => {
    const stories = [storyCard({ title: 'A', categories: [ref(history)] })]

    expect(offeredCategories(all, stories, 'en').map(o => o.slug)).toEqual(['swiss-history'])
  })

  it('[AC-6] the label is the name in the language, else the other language', () => {
    const stories = [storyCard({ title: 'A', categories: [ref(legends), ref(tips)] })]

    expect(offeredCategories(all, stories, 'de').map(o => o.label)).toEqual(['Sagen', 'Practical tips'])
    expect(offeredCategories(all, stories, 'en').map(o => o.label)).toEqual(['Legends', 'Practical tips'])
  })
})

describe('[E4.4][AC30] filterStories and resolveCategory', () => {
  const onCastle = storyCard({ title: 'Castle', categories: [ref(castles)] })
  const onLegend = storyCard({ title: 'Legend', categories: [ref(legends)] })
  const stories = [onCastle, onLegend]

  it('[AC-2] a parent keeps its own and its sub-categories stories', () => {
    expect(filterStories(stories, all, 'swiss-history')).toEqual([onCastle])
  })

  it('[AC-2] a sub-category keeps only its own', () => {
    expect(filterStories(stories, all, 'castles')).toEqual([onCastle])
    expect(filterStories([storyCard({ title: 'P', categories: [ref(history)] }), onCastle], all, 'castles')).toEqual([onCastle])
  })

  it('[AC-1] no slug removes the filter', () => {
    expect(filterStories(stories, all, null)).toEqual(stories)
  })

  it('[AC-4] resolveCategory keeps an offered slug and drops an unknown or unoffered one', () => {
    const offered = offeredCategories(all, stories, 'en')

    expect(resolveCategory(offered, 'legends')).toBe('legends')
    expect(resolveCategory(offered, 'no-such-topic')).toBeNull()
    expect(resolveCategory(offered, 'practical-tips')).toBeNull()
    expect(resolveCategory(offered, undefined)).toBeNull()
  })
})
