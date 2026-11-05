import type { Pin, PinStoryOption } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { MerchantPinEntry, PinListCounts, PinListQuery, PinListRow, PinStoryOptionsQuery } from '../ports.ts'
import type { Result } from './failure.ts'
import type { PinDeps } from './pin-deps.ts'
import { nextDate, pinListStatus } from '@sk/domain/content'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'

function toEntry(row: PinListRow, now: Date): MerchantPinEntry {
  const next = nextDate(row.dates, now)

  return {
    id: row.id,
    status: pinListStatus(row, now),
    title: (row.draft ?? row.published)?.title ?? {},
    slug: row.slug,
    located: row.latitude !== null && row.longitude !== null,
    categoryIds: row.categoryIds,
    hasDates: row.dates.length > 0,
    nextDate: typeof next === 'object' && next !== null ? next : null,
    stayTag: row.stayTag,
    interests: row.interests,
    coverMediaId: row.coverMediaId,
    outboundUrl: row.outboundUrl,
    cover: row.cover,
    mainStory: row.mainStoryGroupId ? { groupId: row.mainStoryGroupId, published: row.mainStoryPublished } : null,
    rowVersion: row.rowVersion,
    updatedAt: row.updatedAt,
  }
}

export interface PinListResult extends PinListCounts {
  entries: MerchantPinEntry[]
  total: number
  page: number
  pageSize: number
}

// N16: one page of the pins of the signed-in store. A pin whose dates are all over reads as `ended`, by the injected clock;
// the repository filters and counts on the same clock.
export function makeListMerchantPins<T>({ uow, pins, clock }: PinDeps<T>) {
  return async (actor: Actor, storeId: string, query: PinListQuery): Promise<Result<PinListResult>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    const now = clock.now()
    const { rows, total, ...counts } = await uow.run(tx => pins.list(tx, storeId, query, now))
    return ok({ entries: rows.map(row => toEntry(row, now)), total, page: query.page, pageSize: query.pageSize, ...counts })
  }
}

// The pins the editor already references, read by id (at most 50), and with `host` the published pins linking to that host: the
// names of the pins a story tags or links, the link note of a pasted address. They read as in the list, `ended` included.
export function makeListPinsByIds<T>({ uow, pins, clock }: PinDeps<T>) {
  return async (actor: Actor, storeId: string, query: { ids: string[], host?: string | undefined }): Promise<Result<MerchantPinEntry[]>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    const now = clock.now()
    const rows = query.ids.length === 0 && !query.host ? [] : await uow.run(tx => pins.lookup(tx, storeId, query))
    return ok(rows.map(row => toEntry(row, now)))
  }
}

// N17: one pin with its draft, its photos and its link. A pin of another store is a 404.
export function makeGetMerchantPin<T>({ uow, pins }: PinDeps<T>) {
  return async (actor: Actor, storeId: string, pinId: string): Promise<Result<Pin>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    const pin = await uow.run(tx => pins.find(tx, storeId, pinId))
    return pin ? ok(pin) : fail({ reason: 'not-found' })
  }
}

// The main-story picker, searched as you type: live story groups of the store that match `q`, each with the languages that are live.
export function makeListPinStoryOptions<T>({ uow, pins }: PinDeps<T>) {
  return async (actor: Actor, storeId: string, query: PinStoryOptionsQuery): Promise<Result<PinStoryOption[]>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return ok(await uow.run(tx => pins.storyOptions(tx, storeId, query)))
  }
}
