import type { Pin, PinDraft, StayTag } from '@sk/domain/content'
import type { PinChanges, PinListStatus, PinRepository, PinStoryOptionsQuery, PinUsage } from '../../src/modules/content/ports.ts'
import { randomUUID } from 'node:crypto'
import { pinListStatus } from '@sk/domain/content'

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

export function createFakePins(): PinRepository<null> & { rows: Map<string, Pin>, removed: string[], usages: Map<string, PinUsage>, categoryParents: Map<string, string>, optionQueries: PinStoryOptionsQuery[] } {
  // child category id -> its parent, which the categories module owns.
  const categoryParents = new Map<string, string>()
  const optionQueries: PinStoryOptionsQuery[] = []
  const rows = new Map<string, Pin>()
  const removed: string[] = []
  const usages = new Map<string, PinUsage>()
  const store = (pin: Pin) => {
    rows.set(pin.id, pin)
    return pin
  }
  return {
    rows,
    removed,
    usages,
    categoryParents,
    optionQueries,
    async usage(_tx, _storeId, pinId) {
      return usages.get(pinId) ?? { stories: 0, reviews: 0, tours: 0 }
    },
    async idsInStore(_tx, storeId, ids) {
      return ids.map(id => id.toLowerCase()).filter(id => rows.get(id)?.storeId === storeId)
    },
    async find(_tx, storeId, pinId) {
      const pin = rows.get(pinId)
      return pin?.storeId === storeId ? pin : undefined
    },
    // Mirrors the SQL: the facets apply the search and the other groups, the page applies all of them, the sort ends in id desc.
    async list(_tx, storeId, query, now) {
      const needle = query.q?.toLowerCase()
      const own = [...rows.values()].filter(pin => pin.storeId === storeId)
      const statusOf = (pin: Pin) => pinListStatus(pin, now)
      const kindOf = (pin: Pin) => (pin.dates.length > 0 ? 'event' : 'place')
      const text = (pin: Pin) => [(pin.draft ?? pin.published)?.title.en, (pin.draft ?? pin.published)?.title.de]
      const matches = (pin: Pin, skip: 'status' | 'category' | 'stay' | 'type' | null) =>
        (needle === undefined || needle === '' || text(pin).some(title => title?.toLowerCase().includes(needle)))
        && (skip === 'status' || query.status.length === 0 || query.status.includes(statusOf(pin)))
        && (skip === 'stay' || query.stay.length === 0 || query.stay.includes(pin.stayTag))
        && (skip === 'type' || query.type.length === 0 || query.type.includes(kindOf(pin)))
        && (skip === 'category' || query.category.length === 0 || query.category.some(id => (id === 'none' ? pin.categoryIds.length === 0 : pin.categoryIds.includes(id))))
      const count = (skip: 'status' | 'category' | 'stay' | 'type', test: (pin: Pin) => boolean) => own.filter(pin => matches(pin, skip) && test(pin)).length
      const categoryIds = new Set([...own.flatMap(pin => pin.categoryIds), ...categoryParents.values()])
      const shown = own.filter(pin => matches(pin, null))
      const key = (pin: Pin) => (query.sort === 'edited' ? pin.updatedAt : pin.createdAt).getTime()
      shown.sort((a, b) => key(b) - key(a) || b.id.localeCompare(a.id))
      return {
        rows: shown.slice((query.page - 1) * query.pageSize, query.page * query.pageSize).map(pin => ({
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
          outboundUrl: pin.outboundUrl,
          cover: null,
          mainStoryGroupId: pin.mainStoryGroupId,
          mainStoryPublished: pin.mainStoryGroupId !== null,
          rowVersion: pin.rowVersion,
          updatedAt: pin.updatedAt,
        })),
        total: shown.length,
        statuses: Object.fromEntries((['draft', 'published', 'hidden', 'ended'] as const).map(status => [status, count('status', pin => statusOf(pin) === status)])) as Record<PinListStatus, number>,
        stays: Object.fromEntries((['short_stay', 'multi_day', 'both'] as const).map(stay => [stay, count('stay', pin => pin.stayTag === stay)])) as Record<StayTag, number>,
        types: { place: count('type', pin => kindOf(pin) === 'place'), event: count('type', pin => kindOf(pin) === 'event') },
        // A category counts its own pins and those of its children; `categoryParents` maps a child to its parent.
        categories: {
          none: count('category', pin => pin.categoryIds.length === 0),
          ...Object.fromEntries(Array.from(categoryIds, id => [id, count('category', pin => pin.categoryIds.some(own => own === id || categoryParents.get(own) === id))])),
        },
      }
    },
    async lockSlugs() {},
    async slugsTaken(_tx, language, exceptPinId) {
      return new Set([...rows.values()].filter(pin => pin.id !== exceptPinId).flatMap(pin => pin.slug?.[language] ?? []))
    },
    async storyOptions(_tx, _storeId, query) {
      optionQueries.push(query)
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
        mapsLink: null,
        weeklyHours: [],
        stayTag: 'both',
        interests: [],
        mustVisit: false,
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
