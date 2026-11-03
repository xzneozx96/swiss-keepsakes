import { describe, expect, it } from 'vitest'

import { storiesPublishEn } from '@/features/stories/messages-publish'
import { storiesPublishDe } from '@/features/stories/messages-publish.de'

const names = (text: string) => Array.from(text.matchAll(/\{(\w+)\}/g), match => match[1]).sort()

describe('[E4.3][AC30] publish screen messages', () => {
  it('[E4.3][AC30] every storyPublish key has a German string with the same placeholders', () => {
    const english = storiesPublishEn as Record<string, string>
    const german = storiesPublishDe as Record<string, string>

    expect(Object.keys(german).sort()).toEqual(Object.keys(english).sort())
    for (const key of Object.keys(english)) {
      expect(german[key]?.trim(), key).not.toBe('')
      expect(names(german[key]!), key).toEqual(names(english[key]!))
    }
  })
})
