import type { Language } from '@sk/domain/shared'
import type { EventName, PageType, ReferrerClass } from './closed-values'
import { readAudience } from './audience'
import { startAnalytics } from './client'
import { analyticsEnabled } from './config'
import { deviceClassOf, referrerClassOf } from './source'

export interface TrackProps {
  pageType: PageType
  contentId?: string
  language: Language
}

type Sink = (name: EventName, props: Record<string, unknown>) => void

let sink: Sink | undefined
let referrerClass: ReferrerClass | undefined

/** Tests install a sink: it receives every event and nothing is loaded or sent. Pass undefined to remove it. */
export function setTrackSink(next: Sink | undefined): void {
  sink = next
}

function visitReferrerClass(): ReferrerClass {
  // Once per visit: the referrer and the query of the first event say where the visit came from.
  referrerClass ??= referrerClassOf({ referrer: document.referrer, search: window.location.search, siteHost: window.location.hostname })

  return referrerClass
}

function savedAudience() {
  try {
    return readAudience(window.localStorage)
  }
  catch {
    return {}
  }
}

function closedProps({ pageType, contentId, language }: TrackProps): Record<string, unknown> {
  return {
    page_type: pageType,
    ...(contentId === undefined ? {} : { content_id: contentId }),
    language,
    referrer_class: visitReferrerClass(),
    device_class: deviceClassOf({ width: window.innerWidth }),
    ...savedAudience(),
  }
}

/**
 * The one call every page and component uses to report an event. It never throws and never waits. A test sink takes the event first;
 * otherwise nothing happens when the switch is off (nothing is loaded, queued or sent), and when it is on PostHog starts on the first event.
 * The allow-list in `before_send` still has the last word on what leaves.
 */
export function track(name: EventName, props: TrackProps): void {
  try {
    if (typeof window === 'undefined')
      return

    const closed = closedProps(props)

    if (sink) {
      sink(name, closed)

      return
    }

    if (!analyticsEnabled())
      return

    void startAnalytics().then((posthog) => {
      try {
        posthog?.capture(name, closed)
      }
      catch {}
    })
  }
  catch {}
}
