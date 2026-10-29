import type { Pin, PinDraft } from '@sk/domain/content'
import type { PinChanges, PinRepository } from '../../src/modules/content/ports.ts'
import { randomUUID } from 'node:crypto'

// An in-memory pin repository. It copies what the SQL one does with a draft, but none of the database guards.
const emptyText: PinDraft = { title: {}, tip: {}, localTip: {}, coverAlt: {}, photoAlt: {} }

// The text a save writes, like the SQL repository: what the changes name, the rest from the stored text.
function textOf(changes: PinChanges, base: PinDraft): PinDraft | undefined {
  if (!changes.title && !changes.tip && !changes.localTip && !changes.coverAlt && !changes.photos)
    return undefined
  return {
    title: changes.title ?? base.title,
    tip: changes.tip ?? base.tip,
    localTip: changes.localTip ?? base.localTip,
    coverAlt: changes.coverAlt ?? base.coverAlt,
    photoAlt: changes.photos ? Object.fromEntries(changes.photos.filter(photo => Object.keys(photo.alt).length > 0).map(photo => [photo.mediaId, photo.alt])) : base.photoAlt,
  }
}

export function createFakePins(): PinRepository<null> & { rows: Map<string, Pin>, removed: string[] } {
  const rows = new Map<string, Pin>()
  const removed: string[] = []
  const store = (pin: Pin) => {
    rows.set(pin.id, pin)
    return pin
  }
  return {
    rows,
    removed,
    async idsInStore(_tx, storeId, ids) {
      return ids.map(id => id.toLowerCase()).filter(id => rows.get(id)?.storeId === storeId)
    },
    async find(_tx, storeId, pinId) {
      const pin = rows.get(pinId)
      return pin?.storeId === storeId ? pin : undefined
    },
    async list(_tx, storeId) {
      return [...rows.values()].filter(pin => pin.storeId === storeId).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).map(pin => ({
        id: pin.id,
        status: pin.status,
        draft: pin.draft,
        published: pin.published,
        slug: pin.slug,
        latitude: pin.latitude,
        longitude: pin.longitude,
        categoryIds: pin.categoryIds,
        dates: pin.dates,
        stayTag: pin.stayTag,
        interests: pin.interests,
        coverMediaId: pin.coverMediaId,
        mainStoryGroupId: pin.mainStoryGroupId,
        mainStoryPublished: pin.mainStoryGroupId !== null,
        rowVersion: pin.rowVersion,
        updatedAt: pin.updatedAt,
      }))
    },
    async storyOptions() {
      return []
    },
    async insert(_tx, storeId, changes, at) {
      const { title: _t, tip: _p, localTip: _l, coverAlt: _c, photos, dates, ...rest } = changes
      return store({
        id: randomUUID(),
        storeId,
        status: 'draft',
        slug: null,
        latitude: null,
        longitude: null,
        address: null,
        weeklyHours: [],
        stayTag: 'both',
        interests: [],
        serviceType: null,
        mustVisit: false,
        foodKind: null,
        coverMediaId: null,
        outboundUrl: null,
        mainStoryGroupId: null,
        categoryIds: [],
        ...rest,
        photos: (photos ?? []).map(photo => ({ mediaId: photo.mediaId })),
        dates: (dates ?? []).map(d => ({ id: randomUUID(), ...d })),
        draft: textOf(changes, emptyText) ?? null,
        published: null,
        firstPublishedAt: null,
        rowVersion: 1,
        createdAt: at,
        updatedAt: at,
      })
    },
    async findForUpdate(_tx, storeId, pinId) {
      const pin = rows.get(pinId)
      return pin?.storeId === storeId ? pin : undefined
    },
    async save(_tx, pin, changes, at) {
      const { title: _t, tip: _p, localTip: _l, coverAlt: _c, photos, dates, ...rest } = changes
      return store({
        ...pin,
        ...rest,
        photos: photos ? photos.map(photo => ({ mediaId: photo.mediaId })) : pin.photos,
        dates: dates ? dates.map(d => ({ id: randomUUID(), ...d })) : pin.dates,
        draft: textOf(changes, pin.draft ?? pin.published ?? emptyText) ?? pin.draft,
        rowVersion: pin.rowVersion + 1,
        updatedAt: at,
      })
    },
    async publish(_tx, pin, at, slug) {
      return store({ ...pin, status: 'published', slug, published: pin.draft ?? pin.published, draft: null, firstPublishedAt: pin.firstPublishedAt ?? at, rowVersion: pin.rowVersion + 1, updatedAt: at })
    },
    async hide(_tx, pin, at) {
      return store({ ...pin, status: 'hidden', rowVersion: pin.rowVersion + 1, updatedAt: at })
    },
    async remove(_tx, storeId, pinId) {
      if (rows.get(pinId)?.storeId !== storeId)
        return false
      removed.push(pinId)
      return rows.delete(pinId)
    },
  }
}
