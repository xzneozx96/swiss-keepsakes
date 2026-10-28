import type { Localized, Pin } from '@sk/domain/content'
import type { Actor } from '@sk/domain/identity'
import type { Result } from './failure.ts'
import type { PinDeps } from './pin-deps.ts'
import { languagesOf, pinPublishGaps } from '@sk/domain/content'
import { mayManageContent, staffActor } from './access.ts'
import { fail, ok } from './failure.ts'

// The slug that goes live with the text: the stored slug, plus the pending slug for a language that has none (a live
// slug is never renamed by a publish). A pending slug for a language with no title is dropped. On a live or hidden
// pin a language that loses its title loses its slug, so the slug keeps covering the title
// (places_published_fields_check). A draft keeps its stored slug as it is, and a slug that misses a title language is a gap.
function slugForLanguages(pin: Pick<Pin, 'slug' | 'status'>, pending: Localized | undefined, title: Localized): Localized {
  const languages = languagesOf(title)
  const merged: Localized = { ...pending, ...pin.slug }
  if (languages.length === 0)
    return merged // no title: the publish is refused for it, and the slug is not what to report
  const slug: Localized = {}
  for (const language of languages) {
    if (merged[language] !== undefined)
      slug[language] = merged[language]
  }
  if (pin.status === 'draft') {
    for (const language of languagesOf(pin.slug)) {
      if (slug[language] === undefined)
        slug[language] = pin.slug![language]
    }
  }
  return slug
}

// The pending draft goes live. A hidden pin with no draft goes live with the text it had. A language the draft adds
// needs its slug in `slug`; a language the draft drops goes with its slug. The last language cannot be dropped.
export function makePublishPin<T>({ uow, pins, audit, clock }: PinDeps<T>) {
  return async (actor: Actor, storeId: string, pinId: string, ifMatch: number, requestId: string | null, slug?: Localized): Promise<Result<Pin>> => {
    if (!mayManageContent(actor, storeId))
      return fail({ reason: 'forbidden' })
    return uow.run(async (tx) => {
      const pin = await pins.findForUpdate(tx, storeId, pinId)
      if (!pin)
        return fail({ reason: 'not-found' })
      if (pin.rowVersion !== ifMatch)
        return fail({ reason: 'stale' })
      const title = (pin.draft ?? pin.published)?.title ?? {}
      const liveSlug = slugForLanguages(pin, slug, title)
      const gaps = pinPublishGaps({ ...pin, slug: liveSlug, title })
      if (gaps.length > 0)
        return fail({ reason: 'incomplete', gaps })
      const published = await pins.publish(tx, pin, clock.now(), liveSlug)
      await audit.record(tx, {
        storeId,
        actor: staffActor(actor),
        entity: 'pin',
        entityId: pin.id,
        action: 'published',
        before: { status: pin.status },
        after: { status: 'published', rowVersion: published.rowVersion },
        requestId,
      })
      return ok(published)
    })
  }
}
