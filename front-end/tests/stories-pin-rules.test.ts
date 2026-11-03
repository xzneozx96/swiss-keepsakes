import type { PinListItem } from '@sk/api-contract'

import { describe, expect, it } from 'vitest'

import { hostOf, pinForHost, pinOptionOf, pinRowLine, websiteLabel } from '@/features/stories/lib/pins'

const ID = '0198a000-0000-7000-8000-000000000010'
const copy: Record<string, string> = {
  'storyMedia.pin.onMap': 'Opens on the map',
  'storyMedia.pin.draft': 'Draft: shows as plain text until published',
  'storyMedia.pin.hidden': 'Hidden: shows as plain text',
}
const t = (key: keyof typeof copy) => copy[key]!

function item(over: Partial<PinListItem> = {}): PinListItem {
  return { id: ID, status: 'published', title: { en: 'Zyt tower', de: 'Zytturm' }, slug: null, located: true, categoryIds: [], hasDates: false, nextDate: null, stayTag: 'both', interests: [], coverMediaId: null, outboundUrl: 'https://zyt.example/tower', cover: null, mainStory: null, rowVersion: 1, updatedAt: '2026-10-29T10:00:00.000Z', ...over }
}

describe('[E4.3][AC45] pin rules', () => {
  it('[E4.3][AC45] AC-4 a published pin with a website shows that website, one without says "Opens on the map", a draft and a hidden pin say why they are plain text', () => {
    expect(pinRowLine(t, pinOptionOf(item(), 'en', 'Untitled'))).toBe('zyt.example/tower')
    expect(pinRowLine(t, pinOptionOf(item({ outboundUrl: null }), 'en', 'Untitled'))).toBe('Opens on the map')
    expect(pinRowLine(t, pinOptionOf(item({ status: 'draft' }), 'en', 'Untitled'))).toBe('Draft: shows as plain text until published')
    expect(pinRowLine(t, pinOptionOf(item({ status: 'hidden' }), 'en', 'Untitled'))).toBe('Hidden: shows as plain text')
  })

  it('[E4.3][AC45] an ended pin reads as published', () => {
    expect(pinOptionOf(item({ status: 'ended' }), 'en', 'Untitled').status).toBe('published')
  })

  it('[E4.3][AC45] AC-5 hosts match with or without www., any case, and a draft pin\'s website never matches', () => {
    const published = pinOptionOf(item(), 'en', 'Untitled')
    const draft = pinOptionOf(item({ id: 'd', status: 'draft' }), 'en', 'Untitled')

    expect(pinForHost([published], 'https://www.Zyt.example/a')?.id).toBe(ID)
    expect(pinForHost([published], 'http://zyt.example')?.id).toBe(ID)
    expect(pinForHost([published], 'mailto:a@zyt.example')).toBeUndefined()
    expect(pinForHost([published], 'junk')).toBeUndefined()
    expect(pinForHost([draft], 'https://zyt.example/a')).toBeUndefined()
    expect(hostOf('https://www.Zyt.example/a')).toBe('zyt.example')
    expect(hostOf('junk')).toBe('')
    expect(websiteLabel('https://zyt.example/tower/')).toBe('zyt.example/tower')
  })

  it('[E4.3][AC45] the name follows the version\'s language, else the other, else the untitled text', () => {
    expect(pinOptionOf(item(), 'de', 'Untitled').name).toBe('Zytturm')
    expect(pinOptionOf(item({ title: { en: 'Only' } }), 'de', 'Untitled').name).toBe('Only')
    expect(pinOptionOf(item({ title: {} }), 'de', 'Untitled').name).toBe('Untitled')
  })
})
