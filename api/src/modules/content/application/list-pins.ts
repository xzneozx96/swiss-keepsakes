import type { Pin, PinListEntry, PinStoryOption } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { PinListRow } from '../ports.ts'
import type { Result } from './failure.ts'
import type { PinDeps } from './pin-deps.ts'
import { nextDate, pinListStatus } from '@sk/domain/content'
import { mayManageContent } from './access.ts'
import { fail, ok } from './failure.ts'

function toEntry(row: PinListRow, now: Date): PinListEntry {
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
    mainStory: row.mainStoryGroupId ? { groupId: row.mainStoryGroupId, published: row.mainStoryPublished } : null,
    hasPendingChanges: row.status !== 'draft' && row.draft !== null,
    rowVersion: row.rowVersion,
    updatedAt: row.updatedAt,
  }
}

// N16: every pin of the signed-in store. A pin whose dates are all over reads as `ended`, by the injected clock.
export function makeListMerchantPins<T>({ uow, pins, clock }: PinDeps<T>) {
  return async (actor: Actor, storeId: string): Promise<Result<PinListEntry[]>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    const rows = await uow.run(tx => pins.list(tx, storeId))
    const now = clock.now()
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

// The main-story picker: the story groups of the store, each with the languages that are live.
export function makeListPinStoryOptions<T>({ uow, pins }: PinDeps<T>) {
  return async (actor: Actor, storeId: string): Promise<Result<PinStoryOption[]>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return ok(await uow.run(tx => pins.storyOptions(tx, storeId)))
  }
}
