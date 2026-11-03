import { describe, expect, it } from 'vitest'

import { emptyDate, emptyForm } from '@/features/places/lib/form'
import { previewDetail, previewItem, tipIn, titleIn } from '@/features/places/lib/preview'

const now = new Date('2026-10-30T10:00:00Z')
const base = { storyLanguages: [] as const, untitled: 'Untitled pin', now }

describe('[E4.2][AC68] the draft as the guest map\'s pin', () => {
  it('takes the title of the chosen language, else the other one with its language, else the stand-in', () => {
    const form = { ...emptyForm(), titleEn: ' Chapel Bridge ', titleDe: '' }

    expect(titleIn(form, 'en')).toEqual({ title: 'Chapel Bridge', language: 'en' })
    expect(titleIn(form, 'de')).toEqual({ title: 'Chapel Bridge', language: 'en' })
    expect(previewItem(emptyForm(), 'en', base).item.title).toBe('Untitled pin')
  })

  it('takes the tips of the chosen language, else the other one with its language, else none', () => {
    const form = { ...emptyForm(), tipEn: ' Go early ', tipDe: '' }

    expect(tipIn(form, 'en')).toEqual({ text: 'Go early', language: 'en' })
    expect(tipIn(form, 'de')).toEqual({ text: 'Go early', language: 'en' })
    expect(tipIn(emptyForm(), 'en')).toBeUndefined()
  })

  it('is located only with both coordinates', () => {
    expect(previewItem(emptyForm(), 'en', base).located).toBe(false)
    expect(previewItem({ ...emptyForm(), latitude: 47.05, longitude: 8.3 }, 'en', base)).toMatchObject({ located: true, item: { latitude: 47.05, longitude: 8.3 } })
  })

  it('gives the story link only when the story is published in the previewed language', () => {
    const form = { ...emptyForm(), mainStoryGroupId: '0198a000-0000-7000-8000-000000000077' }

    expect(previewItem(form, 'en', { ...base, storyLanguages: ['en'] }).item).toMatchObject({ hasMainStory: true, mainStorySlug: expect.any(String) })
    expect(previewItem(form, 'de', { ...base, storyLanguages: ['en'] }).item).toMatchObject({ hasMainStory: false, mainStorySlug: null })
    expect(previewItem(emptyForm(), 'en', { ...base, storyLanguages: ['en'] }).item.hasMainStory).toBe(false)
  })

  it('shows the next date that is complete and not over, and drops the times of a range', () => {
    const day = (firstDay: string, over = {}) => ({ ...emptyDate(), kind: 'day' as const, firstDay, ...over })
    const form = {
      ...emptyForm(),
      dates: [
        day('2026-10-01'),
        day('2026-12-24', { startTime: '18:00', endTime: '19:30' }),
        day('2026-11-07', { startTime: '10:00' }),
        day('', { startTime: '09:00' }),
        { ...emptyDate(), kind: 'range' as const, firstDay: '2027-01-01', lastDay: '2027-01-05', startTime: '08:00' },
      ],
    }

    expect(previewItem(form, 'en', base).item.nextDate).toEqual({ firstDay: '2026-11-07', lastDay: '2026-11-07', startTime: '10:00', endTime: null })
    expect(previewItem({ ...form, dates: form.dates.slice(-1) }, 'en', base).item.nextDate).toEqual({ firstDay: '2027-01-01', lastDay: '2027-01-05', startTime: null, endTime: null })
    expect(previewItem({ ...emptyForm(), dates: [day('2026-10-01')] }, 'en', base).item.nextDate).toBeNull()
  })
})

describe('[E4.7][N03] the draft as the details sheet', () => {
  const detailBase = { storyTitle: 'The story', hasStory: true, photos: [], untitled: 'Untitled pin', now }

  it('carries the draft\'s address, map link, hours, outbound link and tip, and drops what is empty or half typed', () => {
    const form = {
      ...emptyForm(),
      titleEn: 'Chapel Bridge',
      tipEn: 'Go early',
      address: ' Kapellbrücke ',
      mapsLink: ' https://maps.app.goo.gl/abc ',
      outboundUrl: 'https://hotel.example',
      hours: [{ key: 'a', day: 1, opens: '09:00', closes: '17:00' }, { key: 'b', day: 2, opens: '09:', closes: '17:00' }],
    }

    expect(previewDetail(form, 'en', detailBase)).toMatchObject({
      title: 'Chapel Bridge',
      tip: 'Go early',
      address: 'Kapellbrücke',
      mapsLink: 'https://maps.app.goo.gl/abc',
      link: 'https://hotel.example',
      hours: [{ day: 1, opens: '09:00', closes: '17:00' }],
    })
    expect(previewDetail(emptyForm(), 'en', detailBase)).toMatchObject({ tip: '', address: null, mapsLink: null, link: null, hours: [], mainStory: null, otherStories: [] })
  })

  it('names the chosen story only when it is published in the previewed language', () => {
    const form = { ...emptyForm(), mainStoryGroupId: '0198a000-0000-7000-8000-000000000077' }

    expect(previewDetail(form, 'en', detailBase).mainStory).toMatchObject({ title: 'The story', readMinutes: null })
    expect(previewDetail(form, 'en', { ...detailBase, hasStory: false }).mainStory).toBeNull()
  })
})
