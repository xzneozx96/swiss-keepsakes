import type { PublicCategory } from '@sk/api-contract'

import { describe, expect, it } from 'vitest'

import { offeredCategories, resolveCategory } from '@/features/content/lib/category-filter'
import { blogCategory } from './support/blog-categories'

const legends = blogCategory({ slug: 'legends', name: { en: 'Legends', de: 'Sagen' }, position: 2 })
const tips = blogCategory({ slug: 'practical-tips', name: { en: 'Practical tips', de: null }, position: 3 })
const history = blogCategory({ slug: 'swiss-history', name: { en: 'Swiss history', de: 'Schweizer Geschichte' }, position: 1 })
const castles = blogCategory({ slug: 'castles', name: { en: 'Castles', de: 'Burgen' }, parentId: history.id, position: 1 })
// The API's counts: a parent's count includes its sub-categories' stories.
function counted(counts: Record<string, number>): PublicCategory[] {
  return [tips, castles, legends, history].map(c => ({ ...c, storyCount: counts[c.slug] ?? 0 }))
}

describe('[E4.4][AC30] offeredCategories', () => {
  it('[AC-1] offers only categories with a story (storyCount above 0)', () => {
    const all = counted({ 'legends': 2, 'practical-tips': 1 })

    expect(offeredCategories(all, 'en').map(o => o.slug)).toEqual(['legends', 'practical-tips'])
  })

  it('[AC-2] a parent is offered through a sub-category, and the sub-category follows its parent', () => {
    const all = counted({ 'castles': 1, 'swiss-history': 1, 'legends': 1 })

    expect(offeredCategories(all, 'en').map(o => [o.slug, o.parent])).toEqual([['swiss-history', true], ['castles', false], ['legends', true]])
  })

  it('[AC-2] a sub-category with no story of its own is not offered, its parent is', () => {
    const all = counted({ 'swiss-history': 1 })

    expect(offeredCategories(all, 'en').map(o => o.slug)).toEqual(['swiss-history'])
  })

  it('[AC-6] the label is the name in the language, else the other language', () => {
    const all = counted({ 'legends': 1, 'practical-tips': 1 })

    expect(offeredCategories(all, 'de').map(o => o.label)).toEqual(['Sagen', 'Practical tips'])
    expect(offeredCategories(all, 'en').map(o => o.label)).toEqual(['Legends', 'Practical tips'])
  })
})

describe('[E4.4][AC30] resolveCategory', () => {
  it('[AC-4] keeps an offered slug and drops an unknown one or one with no story', () => {
    const offered = offeredCategories(counted({ 'legends': 2, 'castles': 1, 'swiss-history': 1 }), 'en')

    expect(resolveCategory(offered, 'legends')).toBe('legends')
    expect(resolveCategory(offered, 'castles')).toBe('castles')
    expect(resolveCategory(offered, 'no-such-topic')).toBeNull()
    expect(resolveCategory(offered, 'practical-tips')).toBeNull()
    expect(resolveCategory(offered, undefined)).toBeNull()
    expect(resolveCategory([], 'legends')).toBeNull()
  })
})
