import { describe, expect, it } from 'vitest'

import { storiesMediaEn } from '@/features/stories/messages-media'
import { storiesMediaDe } from '@/features/stories/messages-media.de'

const names = (text: string) => Array.from(text.matchAll(/\{(\w+)\}/g), match => match[1]).sort()

describe('[E4.3][AC30][AC45] media and pin link messages', () => {
  it('[E4.3][AC45] every storyMedia key has a German string with the same placeholders', () => {
    const english = storiesMediaEn as Record<string, string>
    const german = storiesMediaDe as Record<string, string>

    expect(Object.keys(german).sort()).toEqual(Object.keys(english).sort())
    for (const key of Object.keys(english)) {
      expect(german[key]?.trim(), key).not.toBe('')
      expect(names(german[key]!), key).toEqual(names(english[key]!))
    }
  })

  it('[E4.3][AC45] AC-2/AC-3/AC-4 the exact English copy', () => {
    expect(storiesMediaEn['storyMedia.video.invalid']).toBe('This is not a YouTube link. Copy the address from the video’s Share button.')
    expect(storiesMediaEn['storyMedia.video.help']).toBe('YouTube only. Guests load the video when they press play.')
    expect(storiesMediaEn['storyMedia.audio.intro']).toBe('Recordings you made. Never AI voices.')
    expect(storiesMediaEn['storyMedia.pin.draft']).toBe('Draft: shows as plain text until published')
    expect(storiesMediaEn['storyMedia.pin.hidden']).toBe('Hidden: shows as plain text')
    expect(storiesMediaEn['storyMedia.pin.onMap']).toBe('Opens on the map')
    expect(storiesMediaEn['storyMedia.pin.search']).toBe('Search your pins')
    expect(storiesMediaEn['storyMedia.host.switch']).toBe('Link the pin instead')
    expect(storiesMediaEn['storyMedia.pin.notPublished']).toBe('(not published: plain text for guests)')
  })
})
