import type { StoryGroupDetail } from '@sk/api-contract'

import { describe, expect, it } from 'vitest'

import { draftOf, fieldsOf, otherCover, startDraft } from '@/features/stories/lib/draft'
import { blockingGaps } from '@/features/stories/lib/gaps'
import { storySearch } from '@/features/stories/lib/search-params'
import { versionStateOf } from '@/features/stories/lib/version-state'

const id = (n: number) => `0198a000-0000-7000-8000-${String(n).padStart(12, '0')}`
const body = { type: 'doc' as const, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] }
const stamp = '2026-11-03T08:00:00.000Z'

function doc(over: Record<string, unknown> = {}) {
  return { title: 'A title', excerpt: 'An excerpt', authorName: 'Stored Author', coverMediaId: id(1), checkedOn: '2026-10-01', body, ...over }
}

function version(over: Record<string, unknown> = {}) {
  return { groupId: id(9), storeId: id(8), language: 'en' as const, status: 'draft' as const, slug: null, draft: null, published: null, publishedAt: null, rowVersion: 1, createdAt: stamp, updatedAt: stamp, ...over } as never
}

function group(versions: Record<string, unknown>, over: Record<string, unknown> = {}) {
  return { id: id(9), storeId: id(8), kind: 'story', subjectPlaceId: null, stayTag: 'both', interests: [], categoryIds: [], placeIds: [], keepsakeProductIds: [], relatedGroupIds: [], rowVersion: 1, createdAt: stamp, updatedAt: stamp, versions: { en: null, de: null, ...versions }, ...over } as unknown as StoryGroupDetail
}

describe('[E4.3][AC30][AC45] story editor rules', () => {
  it('[E4.3][AC30] storySearch keeps en, de and review and drops everything else', () => {
    expect(storySearch({ lang: 'de', screen: 'review' })).toEqual({ lang: 'de', screen: 'review' })
    expect(storySearch({ lang: 'en' })).toEqual({ lang: 'en', screen: undefined })
    expect(storySearch({ lang: 'fr', screen: 'write' })).toEqual({ lang: undefined, screen: undefined })
    expect(storySearch({ lang: 3, screen: ['review'] })).toEqual({ lang: undefined, screen: undefined })
  })

  it('[E4.3][AC45] a published version with no draft round-trips body, checkedOn and authorName through fieldsOf and draftOf', () => {
    const published = version({ status: 'published', published: doc() })
    const fields = fieldsOf(published)

    expect(fields).toMatchObject({ title: 'A title', excerpt: 'An excerpt', coverMediaId: id(1), body, checkedOn: '2026-10-01' })
    expect(draftOf(fields, '', 'Stored Author')).toEqual(doc())
  })

  it('[E4.3][AC30] draftOf sends the account name, and keeps the stored author when the account has no name', () => {
    const fields = fieldsOf(version({ draft: doc() }))

    expect(draftOf(fields, 'Anna Keller', 'Stored Author').authorName).toBe('Anna Keller')
    expect(draftOf(fields, '  ', 'Stored Author').authorName).toBe('Stored Author')
    expect(draftOf(fields, 'x'.repeat(130), '').authorName).toHaveLength(120)
  })

  it('[E4.3][AC30] AC-6 draftOf cuts a 141-character title to 140 and a 301-character excerpt to 300', () => {
    const fields = { ...fieldsOf(version()), title: 'a'.repeat(141), excerpt: 'b'.repeat(301) }
    const draft = draftOf(fields, 'Anna', '')

    expect(draft.title).toHaveLength(140)
    expect(draft.excerpt).toHaveLength(300)
  })

  it('[E4.3][AC30] AC-5 startDraft is empty with the cover given, and otherCover reads the other language\'s draft before its published copy', () => {
    expect(startDraft('Anna', id(2))).toEqual({ title: '', excerpt: '', authorName: 'Anna', coverMediaId: id(2), body: { type: 'doc', content: [{ type: 'paragraph' }] } })
    const both = group({ en: version({ draft: doc({ coverMediaId: id(3) }), published: doc({ coverMediaId: id(4) }) }) }).versions

    expect(otherCover(both, 'de')).toBe(id(3))
    expect(otherCover(group({ en: version({ published: doc({ coverMediaId: id(4) }) }) }).versions, 'de')).toBe(id(4))
    expect(otherCover(both, 'en')).toBeNull()
  })

  it('[E4.3][AC45] AC-4 versionStateOf: published plus a draft, or plus local edits, is editsNotLive; published alone is published; a version with no document is draft; null is none', () => {
    const published = version({ status: 'published', published: doc() })

    expect(versionStateOf(version({ status: 'published', published: doc(), draft: doc() }), false)).toBe('editsNotLive')
    expect(versionStateOf(published, true)).toBe('editsNotLive')
    expect(versionStateOf(published, false)).toBe('published')
    expect(versionStateOf(version(), false)).toBe('draft')
    expect(versionStateOf(null, false)).toBe('none')
  })

  it('[E4.3][AC30] AC-7 blockingGaps lists cover, title, excerpt and slug for a new story', () => {
    const open = version()

    expect(blockingGaps(group({ en: open }), open, fieldsOf(open)).sort()).toEqual(['coverMediaId', 'excerpt', 'slug', 'title'])
  })
})
