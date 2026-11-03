import { describe, expect, it } from 'vitest'

import { deleteStoryText } from '@/features/stories/lib/delete-text'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'

function translate(dictionary: Record<string, string>) {
  return (key: string, vars: Record<string, string | number> = {}) =>
    (dictionary[key] ?? key).replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name]))
}
const english = translate(en)
const german = translate(de)
const text = (input: Parameters<typeof deleteStoryText>[1], t = english) => deleteStoryText(t as Parameters<typeof deleteStoryText>[0], input)

describe('[E4.3][AC30] the Delete story dialog text', () => {
  it('[E4.3][AC30] AC-5 names the pins and the stories that link to the story, and says the links go', () => {
    const { body } = text({ name: 'Old Town walk', published: false, links: { pins: 1, stories: 2 } })

    expect(body).toContain('This story is the main story of 1 pin and is linked from 2 other stories.')
    expect(body).toContain('Deleting it removes those links.')
  })

  it('[E4.3][AC30] AC-5 says one thing when only pins or only stories link, and uses the singular for one', () => {
    expect(text({ name: 'A', published: false, links: { pins: 3, stories: 0 } }).body).toContain('This story is the main story of 3 pins.')
    expect(text({ name: 'A', published: false, links: { pins: 0, stories: 1 } }).body).toContain('This story is linked from 1 other story.')
  })

  it('[E4.3][AC30] AC-5 has no link line when nothing links to the story', () => {
    const { body } = text({ name: 'A', published: false, links: { pins: 0, stories: 0 } })

    expect(body).not.toMatch(/main story|linked from|links/i)
  })

  it('[E4.3][AC30] AC-5 says the links could not be checked, rather than saying there are none, when the read failed', () => {
    expect(text({ name: 'A', published: false, links: null }).body).toContain('could not be checked')
  })

  it('[E4.3][AC30] AC-6 a published story is live for guests and will disappear, with the button Delete story', () => {
    const published = text({ name: 'Old Town walk', published: true, links: { pins: 0, stories: 0 } })

    expect(published.title).toBe('Delete Old Town walk?')
    expect(published.body).toContain('live for guests and will disappear')
    expect(published.confirmLabel).toBe('Delete story')
  })

  it('[E4.3][AC30] AC-6 a story that was never published says the draft will be deleted and has no live line', () => {
    const { body, confirmLabel } = text({ name: 'A', published: false, links: { pins: 0, stories: 0 } })

    expect(body).toContain('The draft will be deleted')
    expect(body).not.toContain('live for guests')
    expect(confirmLabel).toBe('Delete story')
  })

  it('[E4.3][AC30] AC-8 reads in German with the same counts', () => {
    const { title, body, confirmLabel } = text({ name: 'Altstadt', published: true, links: { pins: 1, stories: 2 } }, german)

    expect(title).toBe('Altstadt löschen?')
    expect(body).toContain('für Gäste sichtbar')
    expect(body).toContain('ist die Hauptgeschichte von 1 Pin und wird von 2 anderen Geschichten verlinkt')
    expect(confirmLabel).toBe('Geschichte löschen')
  })
})
