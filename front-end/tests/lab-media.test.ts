import type { MediaFilters, MediaRef, MediaRow } from '@/features/lab/media-data'

import { describe, expect, it } from 'vitest'

import {
  checkUpload,
  filterMedia,
  isUnused,
  matchesQuery,
  pagePhoto,
  replaceImpact,
  retireCheck,
  seedRefs,
  seedRows,
  usageOf,
  usedPages,
} from '@/features/lab/media-data'
import { libraryRules } from '@/features/lab/media-rules'
import { refusalReason, uploadToasts } from '@/features/lab/media-state'

const withKeepsakes = { countKeepsakes: true }
const row = (id: string) => seedRows.find(r => r.id === id)!
function ref(patch: Partial<MediaRef>): MediaRef {
  return {
    mediaId: 'm1',
    ownerKind: 'place',
    ownerId: 'p1',
    ownerName: 'Lion Monument',
    language: null,
    slot: 'published',
    role: 'cover',
    ...patch,
  }
}
const noFilters: MediaFilters = { query: '', kinds: [], use: [], statuses: [] }

describe('[E4.11] pages that use a file', () => {
  it('counts a draft and a published ref on the same owner and language as one page', () => {
    const pages = usedPages([ref({ slot: 'draft' }), ref({ slot: 'published', role: 'more' })])

    expect(pages).toHaveLength(1)
    expect(pages[0]!.isPublished).toBe(true)
    expect(pages[0]!.roles).toEqual(['cover', 'more'])
  })

  it('counts a story’s EN and DE versions as two pages', () => {
    const pages = usedPages([
      ref({ ownerKind: 'story', ownerId: 's1', language: 'en' }),
      ref({ ownerKind: 'story', ownerId: 's1', language: 'de', slot: 'draft' }),
    ])

    expect(pages).toHaveLength(2)
    expect(pages.filter(p => p.isPublished)).toHaveLength(1)
  })

  it('splits published pages from pages that only have the file in a draft', () => {
    const clock = usageOf('aud-tower-clock', seedRefs, withKeepsakes)

    expect(clock.published.map(p => p.language)).toEqual(['en'])
    expect(clock.draftOnly.map(p => p.language)).toEqual(['de'])
  })

  it('has a photo used only in a draft, and the seed links to real lab stories, pins and tours', () => {
    const usage = usageOf('img-hirschenplatz', seedRefs, withKeepsakes)

    expect(usage.published).toHaveLength(0)
    expect(usage.draftOnly.map(p => p.ownerName)).toEqual(['A slow morning on the Weinmarkt'])
    expect(usageOf('img-lion-monument', seedRefs, withKeepsakes).pages.map(p => p.ownerName)).toContain('The dying lion of Lucerne')
  })

  it('finds each page’s own photo for the where-used rows, and none for a pin without one', () => {
    expect(pagePhoto('story', 's1')).toBe('lion-monument')
    expect(pagePhoto('tour', 'pilatus-above-the-city')).toBe('pilatus-dragon-ride')
    expect(pagePhoto('place', 'p7')).toBeUndefined()
  })

  it('gives every tour exactly one PDF', () => {
    const pdfRefs = seedRefs.filter(r => r.role === 'pdf')
    const tours = new Set(seedRefs.filter(r => r.ownerKind === 'tour').map(r => r.ownerId))

    expect(pdfRefs).toHaveLength(tours.size)
    expect(new Set(pdfRefs.map(r => r.ownerId)).size).toBe(tours.size)
  })
})

describe('[E4.11][AC51] Replace says how many pages change', () => {
  it('matches the where-used list', () => {
    for (const id of ['img-lucerne-kapellbruecke-1200', 'aud-tower-clock', 'img-hirschenplatz', 'pdf-pilatus-guide']) {
      const usage = usageOf(id, seedRefs, withKeepsakes)

      expect(replaceImpact(id, seedRefs, withKeepsakes)).toEqual({
        pages: usage.pages.length,
        published: usage.published.length,
        drafts: usage.draftOnly.length,
      })
    }
  })

  it('counts 2 pages for the tower clock: 1 published, 1 only in a draft', () => {
    expect(replaceImpact('aud-tower-clock', seedRefs, withKeepsakes)).toEqual({ pages: 2, published: 1, drafts: 1 })
  })

  it('says nothing changes for an unused file', () => {
    expect(replaceImpact('img-old-swiss-house', seedRefs, withKeepsakes).pages).toBe(0)
  })
})

describe('[E4.11] Retire', () => {
  it('is refused while a page uses the file, with the page count', () => {
    const check = retireCheck(row('img-lion-monument'), seedRefs, withKeepsakes)

    expect(check).toEqual({ ok: false, reason: 'in-use', pages: usageOf('img-lion-monument', seedRefs, withKeepsakes).pages.length })
  })

  it('is refused when the file is only in a draft', () => {
    expect(retireCheck(row('img-hirschenplatz'), seedRefs, withKeepsakes)).toMatchObject({ ok: false, reason: 'in-use', pages: 1 })
  })

  it('is refused while processing and once retired', () => {
    expect(retireCheck(row('img-hammetschwand-view'), seedRefs, withKeepsakes)).toEqual({ ok: false, reason: 'processing' })
    expect(retireCheck(row('img-ritter-palace'), seedRefs, withKeepsakes)).toEqual({ ok: false, reason: 'retired' })
  })

  it('is allowed for an unused file, and refused once a draft takes it (the race)', () => {
    const file = row('img-old-swiss-house')
    const raced = [...seedRefs, ref({ mediaId: file.id, ownerKind: 'story', ownerId: 's1', language: 'de', slot: 'draft' })]

    expect(retireCheck(file, seedRefs, withKeepsakes)).toEqual({ ok: true })
    expect(retireCheck(file, raced, withKeepsakes)).toMatchObject({ ok: false, reason: 'in-use', pages: 1 })
  })
})

describe('[E4.11] unused files and keepsakes (open point 2)', () => {
  it('finds the files no page uses', () => {
    expect(isUnused('img-old-swiss-house', seedRefs, withKeepsakes)).toBe(true)
    expect(isUnused('aud-background-swiss-keepsakes', seedRefs, withKeepsakes)).toBe(true)
    expect(isUnused('img-lion-monument', seedRefs, withKeepsakes)).toBe(false)
  })

  it('shows a keepsake-only photo as unused and retirable, the open risk of point 2', () => {
    const giftBox = row('img-gift-box')

    expect(libraryRules.countKeepsakes).toBe(false)
    expect(isUnused(giftBox.id, seedRefs, libraryRules)).toBe(true)
    expect(retireCheck(giftBox, seedRefs, libraryRules).ok).toBe(true)
    // Counting keepsakes would protect it.
    expect(isUnused(giftBox.id, seedRefs, withKeepsakes)).toBe(false)
    expect(retireCheck(giftBox, seedRefs, withKeepsakes).ok).toBe(false)
  })

  it('keeps the seed honest: a retired file has no uses', () => {
    for (const retired of seedRows.filter(r => r.status === 'retired'))
      expect(isUnused(retired.id, seedRefs, withKeepsakes)).toBe(true)
  })
})

describe('[E4.11] search and filters', () => {
  const lion = row('img-lion-monument')

  it('matches the name, in any case, and nothing else', () => {
    expect(lion.name).toBe('Lion Monument, morning light')
    expect(matchesQuery(lion, 'lion monument')).toBe(true)
    expect(matchesQuery(lion, 'MORNING')).toBe(true)
    // The uploaded file name and the alt text are not searched.
    expect(matchesQuery(lion, 'lion-monument.jpg')).toBe(false)
    expect(matchesQuery(lion, 'carved into the rock')).toBe(false)
    expect(matchesQuery(lion, '  ')).toBe(true)
  })

  it('starts a name as the uploaded file name and finds it by that name', () => {
    const noAlt = seedRows.find(r => r.kind === 'image' && !r.alt.en && !r.alt.de)!

    expect(noAlt.name).toBe(noAlt.fileName)
    expect(matchesQuery(noAlt, noAlt.fileName.replace('.jpg', ''))).toBe(true)
  })

  it('finds a renamed file by its new name', () => {
    const renamed = { ...row('img-weinmarkt'), name: 'Weinmarkt fountain' }

    expect(filterMedia([renamed], seedRefs, { ...noFilters, query: 'fountain' }, libraryRules)).toEqual([renamed])
    expect(filterMedia([renamed], seedRefs, { ...noFilters, query: 'weinmarkt.jpg' }, libraryRules)).toEqual([])
  })

  it('narrows by kind, use and status, and an empty query matches everything', () => {
    expect(filterMedia(seedRows, seedRefs, noFilters, withKeepsakes)).toHaveLength(seedRows.length)
    expect(filterMedia(seedRows, seedRefs, { ...noFilters, kinds: ['pdf'] }, withKeepsakes).every(r => r.kind === 'pdf')).toBe(true)
    expect(filterMedia(seedRows, seedRefs, { ...noFilters, statuses: ['processing'] }, withKeepsakes).map(r => r.id)).toEqual(['img-hammetschwand-view'])
    expect(filterMedia(seedRows, seedRefs, { ...noFilters, use: ['drafts'] }, withKeepsakes).map(r => r.id)).toEqual(['img-hirschenplatz'])

    const unused = filterMedia(seedRows, seedRefs, { ...noFilters, use: ['unused'] }, withKeepsakes)

    expect(unused.length).toBeGreaterThan(0)
    expect(unused.every(r => isUnused(r.id, seedRefs, withKeepsakes))).toBe(true)
  })

  it('finds nothing for “fondue” (the no-match state)', () => {
    expect(filterMedia(seedRows, seedRefs, { ...noFilters, query: 'fondue' }, withKeepsakes)).toHaveLength(0)
  })
})

describe('[E4.11] upload checks', () => {
  const MB = 1024 * 1024

  it('refuses a type the library does not take', () => {
    expect(checkUpload({ type: 'image/heic', size: MB })).toEqual({ ok: false, reason: 'type' })
  })

  it('refuses a file one byte over its kind’s limit', () => {
    expect(checkUpload({ type: 'image/jpeg', size: 20 * MB })).toEqual({ ok: true, kind: 'image' })
    expect(checkUpload({ type: 'image/jpeg', size: 20 * MB + 1 })).toEqual({ ok: false, reason: 'size', kind: 'image', maxMb: 20 })
    expect(checkUpload({ type: 'application/pdf', size: 31 * MB })).toMatchObject({ ok: false, reason: 'size', maxMb: 30 })
  })

  it('makes Replace keep the kind', () => {
    expect(checkUpload({ type: 'application/pdf', size: MB }, 'image')).toEqual({ ok: false, reason: 'kind', kind: 'image' })
    expect(checkUpload({ type: 'audio/mpeg', size: MB }, 'audio')).toEqual({ ok: true, kind: 'audio' })
  })
})

describe('[E4.11] one toast per upload batch', () => {
  it('counts the accepted files', () => {
    expect(uploadToasts(1, [])).toEqual({ success: '1 file uploaded. It shows as processing until its sizes are built.', danger: null })
    expect(uploadToasts(3, []).success).toMatch(/^3 files uploaded/)
  })

  it('lists the refused files with their reason, and they are never added', () => {
    const tooBig = { name: 'old-town-panorama.png', reason: refusalReason(checkUpload({ type: 'image/png', size: 40 * 1024 * 1024 })) }
    const heic = { name: 'IMG_4410.HEIC', reason: refusalReason(checkUpload({ type: 'image/heic', size: 1000 })) }

    expect(uploadToasts(0, [tooBig])).toEqual({ success: null, danger: '1 file refused: old-town-panorama.png, too large (max 20 MB).' })
    expect(uploadToasts(2, [tooBig, heic]).danger).toBe('2 files refused: old-town-panorama.png, too large (max 20 MB); IMG_4410.HEIC, type not accepted (JPEG, PNG, WebP, MP3, M4A or PDF).')
  })
})

describe('[E4.11] seed rows', () => {
  it('builds one row per library photo and recording, plus the tour PDFs', () => {
    const kinds = (kind: MediaRow['kind']) => seedRows.filter(r => r.kind === kind).length

    expect(kinds('image')).toBeGreaterThan(60)
    expect(kinds('audio')).toBe(2)
    expect(kinds('pdf')).toBe(5)
  })
})
