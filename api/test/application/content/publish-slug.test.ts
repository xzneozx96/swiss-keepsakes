import type { Localized } from '@sk/domain/content'
import { describe, expect, it } from 'vitest'
import { mergePublishSlug } from '../../../src/modules/content/application/publish-slug.ts'

type Input = Parameters<typeof mergePublishSlug>[0]
const en = { en: 'Title' }
const enDe = { en: 'Title', de: 'Titel' }

describe('[E2.6] mergePublishSlug', () => {
  it.each<[string, Input, Localized | 'slug-conflict']>([
    ['never published: the body overrides the stored slug for the language it names', { stored: { en: 'old', de: 'alt' }, body: { en: 'new' }, title: enDe, hasBeenPublished: false }, { en: 'new', de: 'alt' }],
    ['never published: a stored language with no title is kept, so the gap check can name it', { stored: { en: 'old', de: 'alt' }, body: undefined, title: en, hasBeenPublished: false }, { en: 'old', de: 'alt' }],
    ['never published: a body language with no title is dropped', { stored: { en: 'old' }, body: { de: 'neu' }, title: en, hasBeenPublished: false }, { en: 'old' }],
    ['live: a body key that differs from the stored one is a conflict', { stored: { en: 'old' }, body: { en: 'new' }, title: en, hasBeenPublished: true }, 'slug-conflict'],
    ['live: a body key equal to the stored one is accepted', { stored: { en: 'old' }, body: { en: 'old' }, title: en, hasBeenPublished: true }, { en: 'old' }],
    ['live: a body key fills a language with no stored slug', { stored: { en: 'old' }, body: { de: 'neu' }, title: enDe, hasBeenPublished: true }, { en: 'old', de: 'neu' }],
    ['live: a language with no title loses its slug', { stored: { en: 'old', de: 'alt' }, body: undefined, title: en, hasBeenPublished: true }, { en: 'old' }],
    ['live: a language the draft adds with no slug anywhere stays uncovered', { stored: { en: 'old' }, body: undefined, title: enDe, hasBeenPublished: true }, { en: 'old' }],
    ['live: a conflicting key for a language the draft is dropping is still a conflict', { stored: { en: 'old', de: 'alt' }, body: { de: 'neu' }, title: en, hasBeenPublished: true }, 'slug-conflict'],
    ['live: an equal key for a language the draft is dropping is accepted and dropped', { stored: { en: 'old', de: 'alt' }, body: { de: 'alt' }, title: en, hasBeenPublished: true }, { en: 'old' }],
    ['live: no stored slug and no body gives an empty slug', { stored: null, body: undefined, title: en, hasBeenPublished: true }, {}],
    ['no title: the merged slug comes back whole', { stored: { en: 'old' }, body: { de: 'neu' }, title: {}, hasBeenPublished: false }, { en: 'old', de: 'neu' }],
    ['no title on a live item: the stored slug comes back whole', { stored: { en: 'old', de: 'alt' }, body: undefined, title: {}, hasBeenPublished: true }, { en: 'old', de: 'alt' }],
  ])('%s', (_name, input, expected) => {
    const result = mergePublishSlug(input)
    if (expected === 'slug-conflict')
      expect(result).toEqual({ ok: false, reason: 'slug-conflict' })
    else
      expect(result).toEqual({ ok: true, slug: expected })
  })
})
