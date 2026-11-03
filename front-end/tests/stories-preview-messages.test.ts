import { describe, expect, it } from 'vitest'

import { storiesPreviewEn } from '@/features/stories/messages-preview'
import { storiesPreviewDe } from '@/features/stories/messages-preview.de'

const names = (text: string) => Array.from(text.matchAll(/\{(\w+)\}/g), match => match[1]).sort()

describe('[E4.3][AC45] story preview messages', () => {
  it('[E4.3][AC45] every storyPreview key has a German string with the same placeholders', () => {
    const english = storiesPreviewEn as Record<string, string>
    const german = storiesPreviewDe as Record<string, string>

    expect(Object.keys(german).sort()).toEqual(Object.keys(english).sort())
    expect(Object.keys(english).sort()).toEqual(['storyPreview.checked', 'storyPreview.keepsakes', 'storyPreview.label', 'storyPreview.places'])
    for (const key of Object.keys(english)) {
      expect(german[key]?.trim(), key).not.toBe('')
      expect(names(german[key]!), key).toEqual(names(english[key]!))
    }
  })
})
