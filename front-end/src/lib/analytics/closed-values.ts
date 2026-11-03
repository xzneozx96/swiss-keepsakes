import type { Language } from '@sk/domain/shared'
import { interestCodes } from '@sk/domain/content'

/**
 * The closed lists the PostHog sender may send (ADR-032). Nothing outside these names and values leaves the browser:
 * the allow-list drops an event that breaks them, and the derivation code only produces members of these lists.
 */
export const EVENT_NAMES = ['page_view', 'pin_open', 'pin_to_story_click', 'story_view', 'product_view', 'outbound_click'] as const
export type EventName = typeof EVENT_NAMES[number]

export const PAGE_TYPES = ['home', 'stories', 'story', 'place', 'map', 'tours', 'tour', 'keepsakes', 'keepsake', 'other'] as const
export type PageType = typeof PAGE_TYPES[number]

/** Pages that name one content item, so a page_view may carry its id. */
export const CONTENT_PAGE_TYPES: readonly PageType[] = ['story', 'place', 'tour', 'keepsake']

/** The language type is the domain's; the list may only hold its members. */
export const LANGUAGES = ['en', 'de'] as const satisfies readonly Language[]

export const REFERRER_CLASSES = ['search', 'partner', 'social', 'direct', 'other'] as const
export type ReferrerClass = typeof REFERRER_CLASSES[number]

export const DEVICE_CLASSES = ['phone', 'tablet', 'desktop', 'other'] as const
export type DeviceClass = typeof DEVICE_CLASSES[number]

/** The stay tags without `both`: a guest who answered `both` has no segment. */
export const SEGMENTS = ['short_stay', 'multi_day'] as const
export type Segment = typeof SEGMENTS[number]

export const INTERESTS: readonly string[] = interestCodes

export const CONTENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
