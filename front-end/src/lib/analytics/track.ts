import type { Language } from '@sk/domain/shared'
import type { EventName, PageType, ReferrerClass } from './closed-values'
import { useSyncExternalStore } from 'react'
import { isPrivatePath } from '@/lib/private-routes'
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
let allowed = false
const listeners = new Set<() => void>()
let referrerClass: ReferrerClass | undefined

/** Tests install a sink: it receives every event and nothing is loaded or sent. Pass undefined to remove it. */
export function setTrackSink(next: Sink | undefined): void {
  sink = next
}

/**
 * The guest-site gate (private path, merchant browser, answer not known yet). AnalyticsRoot sets it, and every event goes through it,
 * not only page views. Closed until the root opens it, so an event from any caller that runs first is dropped.
 */
export function setTrackAllowed(next: boolean): void {
  if (allowed === next)
    return
  allowed = next
  listeners.forEach(listener => listener())
}

export function isTrackAllowed(): boolean {
  return allowed
}

/** Whether the gate is open, as state: a caller that must not lose an event while the gate holds waits on it and sends when it opens. */
export function useTrackAllowed(): boolean {
  return useSyncExternalStore((listener) => {
    listeners.add(listener)

    return () => listeners.delete(listener)
  }, isTrackAllowed, () => false)
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
    if (typeof window === 'undefined' || !allowed || isPrivatePath(window.location.pathname))
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
