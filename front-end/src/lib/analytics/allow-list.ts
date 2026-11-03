import type { CaptureResult } from 'posthog-js'
import type { EventName, PageType } from './closed-values'
import { CONTENT_ID, CONTENT_PAGE_TYPES, DEVICE_CLASSES, EVENT_NAMES, INTERESTS, LANGUAGES, PAGE_TYPES, REFERRER_CLASSES, SEGMENTS } from './closed-values'

type Props = Record<string, unknown>

interface Shape {
  /** The page types the event may carry (page_type is always required). */
  pageTypes: readonly PageType[]
  /** content_id: required, or allowed only on the pages that name one (`optional`), or never. */
  contentId: 'required' | 'optional'
}

const PIN_CARD: Shape = { pageTypes: ['place'], contentId: 'required' }

const SHAPES: Record<EventName, Shape> = {
  page_view: { pageTypes: PAGE_TYPES, contentId: 'optional' },
  pin_open: PIN_CARD,
  pin_to_story_click: PIN_CARD,
  outbound_click: PIN_CARD,
  story_view: { pageTypes: ['story'], contentId: 'required' },
  product_view: { pageTypes: ['keepsake'], contentId: 'required' },
}

const CLOSED_SETS: Record<string, readonly string[]> = {
  language: LANGUAGES,
  referrer_class: REFERRER_CLASSES,
  device_class: DEVICE_CLASSES,
  segment: SEGMENTS,
}

/** What PostHog needs to ingest an event; both are copied as they are, and only when they are strings. */
const TRANSPORT_FIELDS = ['token', 'distinct_id'] as const
const CLOSED_FIELDS = ['page_type', 'content_id', 'language', 'referrer_class', 'device_class', 'segment', 'interests'] as const

function isInterestList(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.length > 0
    && new Set(value).size === value.length
    && value.every(item => typeof item === 'string' && INTERESTS.includes(item))
}

/** The closed properties of one event, or undefined when any of them breaks its list or the shape of the event. */
function closedProperties(event: EventName, props: Props): Props | undefined {
  const shape = SHAPES[event]
  const pageType = props.page_type

  if (typeof pageType !== 'string' || !(shape.pageTypes as readonly string[]).includes(pageType))
    return undefined

  const hasContentId = props.content_id !== undefined

  if (hasContentId && (typeof props.content_id !== 'string' || !CONTENT_ID.test(props.content_id)))
    return undefined

  if (shape.contentId === 'required' ? !hasContentId : hasContentId && !(CONTENT_PAGE_TYPES as readonly string[]).includes(pageType))
    return undefined

  const out: Props = { page_type: pageType }

  if (hasContentId)
    out.content_id = props.content_id

  for (const [name, allowed] of Object.entries(CLOSED_SETS)) {
    const value = props[name]

    if (value === undefined)
      continue
    if (typeof value !== 'string' || !allowed.includes(value))
      return undefined

    out[name] = value
  }

  if (props.interests !== undefined) {
    if (!isInterestList(props.interests))
      return undefined

    out.interests = [...props.interests]
  }

  return out
}

/**
 * The PostHog `before_send` guard (ADR-032): the only thing between the browser and what is sent. It passes only the six closed
 * events with their closed properties and drops (returns null) any event that breaks the list, never repairs one: an unknown event
 * name (`$pageview` and `order_submit` included), a wrong shape, a property name outside the list, a value outside its set.
 * Properties starting with `$` are stripped, not a violation: PostHog adds the URL, path, referrer and user agent itself.
 * The result is a new object that carries the closed properties, `token` and `distinct_id` (PostHog cannot ingest without
 * them) and `$process_person_profile: false` (without it the server creates a person profile); no `$set`, `$set_once` or `$unset`.
 */
export function allowListBeforeSend(result: CaptureResult): CaptureResult | null {
  const event = result.event as string

  if (!(EVENT_NAMES as readonly string[]).includes(event))
    return null

  const props = (result.properties ?? {}) as Props
  const closed: readonly string[] = CLOSED_FIELDS
  const transport: readonly string[] = TRANSPORT_FIELDS

  for (const name of Object.keys(props)) {
    if (!name.startsWith('$') && !closed.includes(name) && !transport.includes(name))
      return null
  }

  const kept = closedProperties(event as EventName, props)

  if (!kept)
    return null

  for (const name of TRANSPORT_FIELDS) {
    const value = props[name]

    if (value === undefined)
      continue
    if (typeof value !== 'string')
      return null

    kept[name] = value
  }

  kept.$process_person_profile = false

  return {
    uuid: result.uuid,
    event: result.event,
    properties: kept,
    ...(result.timestamp === undefined ? {} : { timestamp: result.timestamp }),
  }
}
