import { z } from 'zod'

// Mirrors packages/domain/src/content (the contract imports only zod). Request bodies are strict, so a price, a
// type or any other unknown key is a 400. A save is a PATCH: a left-out field stays, null clears, a list replaces.

const language = z.enum(['en', 'de'])
const stayTag = z.enum(['short_stay', 'multi_day', 'both'])
const interests = z.array(z.enum(['history-culture', 'food-drink', 'lake-mountains', 'shopping-keepsakes'])).max(4)
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'A time as HH:MM')
// Postgres text and jsonb refuse U+0000, so it is a 400 here and not a 500 there. A lone UTF-16 surrogate cannot be
// written as UTF-8 either, so it is refused with it (String.prototype.isWellFormed needs lib ES2024).
const loneSurrogate = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/
function noNul<T extends z.ZodString>(schema: T): T {
  return schema
    .refine(value => !value.includes('\u0000'), 'Text may not contain a NUL character')
    .refine(value => !loneSurrogate.test(value), 'Text may not contain an unpaired surrogate') as T
}
const text = (max: number) => noNul(z.string().max(max))
const closingTime = z.string().regex(/^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/, 'A time as HH:MM, or 24:00')

// Trimmed first, so "  " is empty and refused. A key left out means no text in that language.
export const localizedTextSchema = z.strictObject({
  en: noNul(z.string().trim().min(1).max(300)).optional(),
  de: noNul(z.string().trim().min(1).max(300)).optional(),
}).meta({ id: 'LocalizedText', description: 'Text per language. A present key is non-empty and at most 300 characters' })

export const localizedLongTextSchema = z.strictObject({
  en: noNul(z.string().trim().min(1).max(20000)).optional(),
  de: noNul(z.string().trim().min(1).max(20000)).optional(),
}).meta({ id: 'LocalizedLongText', description: 'Text per language. A present key is non-empty and at most 20000 characters' })

// The database (platform.valid_slug_map) needs at least one key, so {} is refused and null clears the slug.
const slugMapSchema = z.strictObject({
  en: z.string().max(200).regex(slugPattern, 'Lower-case letters and digits, separated by single dashes').optional(),
  de: z.string().max(200).regex(slugPattern, 'Lower-case letters and digits, separated by single dashes').optional(),
}).refine(map => map.en !== undefined || map.de !== undefined, 'Give a slug in at least one language')

// What a pin publish may carry: the web address for each language the publish adds (ADR-015).
export const pinPublishBodySchema = z.strictObject({
  slug: slugMapSchema.optional(),
}).meta({ id: 'PinPublishBody', description: 'Optional. The slug is the web address for a language the publish adds. A live language with a different slug is refused with 409 slug-conflict, so rename it with a save' })

// What a tour publish may carry: the same as a pin publish.
export const tourPublishBodySchema = z.strictObject({
  slug: slugMapSchema.optional(),
}).meta({ id: 'TourPublishBody', description: 'Optional. The slug is the web address for a language the publish adds. A live language with a different slug is refused with 409 slug-conflict, so rename it with a save' })

// A list of ids with no repeats: the link tables key on (owner, id).
function idList(max: number) {
  return z.array(z.uuid()).max(max).refine(ids => new Set(ids.map(id => id.toLowerCase())).size === ids.length, 'Each id may appear once')
}

// What a response carries: whatever is stored, no checks.
const localizedView = z.object({ en: z.string().optional(), de: z.string().optional() })

const weeklySpanSchema = z.strictObject({
  day: z.int().min(1).max(7).meta({ description: '1 is Monday, 7 is Sunday' }),
  opens: time,
  closes: closingTime,
}).refine(span => span.opens < span.closes, { message: 'opens must be before closes', path: ['closes'] })

// Postgres has no year 0 and the stored dates are real ones, so a day is within 2000 to 2100.
const pinDay = z.iso.date().refine(day => day >= '2000-01-01' && day <= '2100-12-31', 'A date from 2000 to 2100')

const pinDateWriteSchema = z.strictObject({
  firstDay: pinDay,
  lastDay: pinDay,
  startTime: time.nullable().optional(),
  endTime: time.nullable().optional(),
}).superRefine((date, ctx) => {
  const start = date.startTime ?? null
  const end = date.endTime ?? null
  if (date.lastDay < date.firstDay)
    ctx.addIssue({ code: 'custom', message: 'lastDay must not be before firstDay', path: ['lastDay'] })
  if (date.firstDay !== date.lastDay && (start !== null || end !== null))
    ctx.addIssue({ code: 'custom', message: 'Times are for a one-day entry only', path: [start !== null ? 'startTime' : 'endTime'] })
  if (end !== null && start === null)
    ctx.addIssue({ code: 'custom', message: 'endTime needs a startTime', path: ['endTime'] })
  if (end !== null && start !== null && end <= start)
    ctx.addIssue({ code: 'custom', message: 'endTime must be after startTime', path: ['endTime'] })
})

export const pinWriteBodySchema = z.strictObject({
  title: localizedTextSchema.optional(),
  tip: localizedLongTextSchema.optional(),
  slug: slugMapSchema.nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  address: noNul(z.string().trim().min(1).max(300)).nullable().optional(),
  weeklyHours: z.array(weeklySpanSchema).max(21).optional(),
  stayTag: stayTag.optional(),
  interests: interests.optional(),
  coverMediaId: z.uuid().nullable().optional(),
  mainStoryGroupId: z.uuid().nullable().optional(),
  categoryIds: idList(20).optional(),
  dates: z.array(pinDateWriteSchema).max(50).optional(),
}).meta({ id: 'PinWriteBody', description: 'Every field is optional. A pin has no type and no price' })

const pinDraftViewSchema = z.object({ title: localizedView, tip: localizedView })

export const pinSchema = z.object({
  id: z.uuid(),
  storeId: z.uuid(),
  status: z.enum(['draft', 'published', 'hidden']),
  slug: localizedView.nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  address: z.string().nullable(),
  weeklyHours: z.array(z.object({ day: z.int(), opens: z.string(), closes: z.string() })),
  stayTag,
  interests: z.array(z.string()),
  coverMediaId: z.uuid().nullable(),
  mainStoryGroupId: z.uuid().nullable(),
  categoryIds: z.array(z.uuid()),
  dates: z.array(z.object({
    id: z.uuid(),
    firstDay: z.string(),
    lastDay: z.string(),
    startTime: z.string().nullable(),
    endTime: z.string().nullable(),
  })),
  draft: pinDraftViewSchema.nullable(),
  published: pinDraftViewSchema.nullable(),
  firstPublishedAt: z.iso.datetime().nullable(),
  rowVersion: z.int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).meta({ id: 'Pin', description: 'A map pin as the editor sees it, with its draft and its published text' })

// The story body: one Tiptap document. Only the nodes and marks of the story-editor decision are accepted, each with
// strict attributes. The contract imports only zod, so these constants repeat packages/domain/src/content/body.ts;
// a test fails when the two differ. The list nesting is unrolled to a fixed number of levels, so the check that
// refuses a deep body never meets a deeper one (a recursive schema would walk it first).
export const STORY_BODY_LIMITS = { maxBytes: 200_000, maxDepth: 10, maxMedia: 100 } as const
export const BODY_NODE_TYPES = ['paragraph', 'text', 'hardBreak', 'heading', 'blockquote', 'bulletList', 'orderedList', 'listItem', 'image', 'video', 'audio'] as const
export const BODY_MARK_TYPES = ['bold', 'italic', 'link', 'pinLink'] as const
export const BODY_LINK_PROTOCOLS = ['https:', 'http:', 'mailto:'] as const

function isSafeHref(href: string): boolean {
  try {
    return (BODY_LINK_PROTOCOLS as readonly string[]).includes(new URL(href).protocol)
  }
  catch {
    return false
  }
}

const bodyMarkSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('bold') }),
  z.strictObject({ type: z.literal('italic') }),
  z.strictObject({
    type: z.literal('link'),
    attrs: z.strictObject({ href: noNul(z.string().max(2000)).refine(isSafeHref, 'A link is https:, http: or mailto:') }),
  }),
  z.strictObject({ type: z.literal('pinLink'), attrs: z.strictObject({ pinId: z.uuid() }) }),
])

const bodyTextSchema = z.strictObject({ type: z.literal('text'), text: noNul(z.string().min(1).max(20000)), marks: z.array(bodyMarkSchema).max(4).optional() })
const bodyHardBreakSchema = z.strictObject({ type: z.literal('hardBreak') })
const inline = [bodyTextSchema, bodyHardBreakSchema] as const

const bodyParagraphSchema = z.strictObject({ type: z.literal('paragraph'), content: z.array(z.discriminatedUnion('type', inline)).optional() })
const bodyHeadingSchema = z.strictObject({
  type: z.literal('heading'),
  attrs: z.strictObject({ level: z.literal([2, 3]) }),
  content: z.array(z.discriminatedUnion('type', inline)).optional(),
})
const bodyBlockquoteSchema = z.strictObject({ type: z.literal('blockquote'), content: z.array(bodyParagraphSchema) })

// A list item holds paragraphs and nested lists; `levels` more list levels may open inside it. A nested list is
// one schema with a two-value type, so the unrolled schema grows with the levels and not with their square. The
// write schema here and the public read in public.ts share this helper and BODY_LIST_LEVELS.
interface ListItem<P> { type: 'listItem', content: (P | NestedList<P>)[] }
interface NestedList<P> { type: 'bulletList' | 'orderedList', content: ListItem<P>[] }
const listTypes = z.enum(['bulletList', 'orderedList'])
export function listItemSchema<P extends z.ZodType>(paragraph: P, levels: number): z.ZodType<ListItem<z.infer<P>>> {
  return z.strictObject({
    type: z.literal('listItem'),
    content: z.array(levels > 0
      ? z.discriminatedUnion('type', [paragraph as unknown as z.ZodObject, z.strictObject({ type: listTypes, content: z.array(listItemSchema(paragraph, levels - 1)) })])
      : paragraph),
  }) as unknown as z.ZodType<ListItem<z.infer<P>>>
}

// Depth 10 allows lists at depths 2, 4, 6, 8 and 10, but only three list levels can hold text (list 2, 4, 6, then item,
// paragraph and text at 7, 8, 9; a fourth list level leaves room for an empty paragraph only). Two more nested levels
// let a too-deep body reach the depth check.
export const BODY_LIST_LEVELS = 5
const bodyBulletListSchema = z.strictObject({ type: z.literal('bulletList'), content: z.array(listItemSchema(bodyParagraphSchema, BODY_LIST_LEVELS)) })
const bodyOrderedListSchema = z.strictObject({ type: z.literal('orderedList'), content: z.array(listItemSchema(bodyParagraphSchema, BODY_LIST_LEVELS)) })

const bodyImageSchema = z.strictObject({
  type: z.literal('image'),
  attrs: z.strictObject({ mediaId: z.uuid(), alt: text(300), caption: text(300) }),
})
const bodyVideoSchema = z.strictObject({
  type: z.literal('video'),
  attrs: z.strictObject({ youtubeId: z.string().regex(/^[\w-]{11}$/, 'A YouTube video id'), title: text(300), caption: text(300) }),
})
const bodyAudioSchema = z.strictObject({
  type: z.literal('audio'),
  attrs: z.strictObject({ mediaId: z.uuid(), title: text(300), caption: text(300) }),
})

const bodyNodeSchema = z.discriminatedUnion('type', [
  bodyParagraphSchema,
  bodyHeadingSchema,
  bodyBlockquoteSchema,
  bodyBulletListSchema,
  bodyOrderedListSchema,
  bodyImageSchema,
  bodyVideoSchema,
  bodyAudioSchema,
])

function utf8Length(value: string): number {
  let bytes = 0
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code < 0x80) bytes += 1
    else if (code < 0x800) bytes += 2
    else if (code >= 0xD800 && code <= 0xDBFF) {
      bytes += 4
      i++
    }
    else bytes += 3
  }
  return bytes
}

type Path = (string | number)[]
interface Walked { type?: unknown, content?: unknown }

// The first fault of the three caps, in document order for depth and media. Runs on a body the shape check passed.
function firstCapFault(body: Walked): { path: Path, message: string } | undefined {
  if (utf8Length(JSON.stringify(body)) > STORY_BODY_LIMITS.maxBytes)
    return { path: [], message: `The body is larger than ${STORY_BODY_LIMITS.maxBytes} bytes` }
  let media = 0
  let fault: { path: Path, message: string } | undefined
  function walk(nodes: unknown, depth: number, path: Path): void {
    if (!Array.isArray(nodes) || fault) return
    nodes.forEach((node: Walked, index) => {
      if (fault) return
      const here = [...path, index]
      if (depth > STORY_BODY_LIMITS.maxDepth) {
        fault = { path: here, message: `Nesting is deeper than ${STORY_BODY_LIMITS.maxDepth} levels` }
        return
      }
      if (node.type === 'image' || node.type === 'video' || node.type === 'audio') {
        media++
        if (media > STORY_BODY_LIMITS.maxMedia) {
          fault = { path: here, message: `A body holds at most ${STORY_BODY_LIMITS.maxMedia} images, videos and audio files` }
          return
        }
      }
      walk(node.content, depth + 1, [...here, 'content'])
    })
  }
  walk(body.content, 2, ['content'])
  return fault
}

export const storyBodySchema = z.strictObject({
  type: z.literal('doc'),
  content: z.array(bodyNodeSchema),
}).superRefine((body, ctx) => {
  const fault = firstCapFault(body)
  if (fault) ctx.addIssue({ code: 'custom', path: fault.path, message: fault.message })
}).meta({ id: 'StoryBody', description: 'The story text as one Tiptap document. Only the nodes and marks of the story editor are accepted' })

// The title may be empty: a draft is incomplete, and the publish gap (title) stops an untitled version going live.
export const storyDraftSchema = z.strictObject({
  title: noNul(z.string().trim().max(300)),
  excerpt: text(1000),
  authorName: text(120),
  authorRole: text(120),
  coverMediaId: z.uuid().nullable(),
  body: storyBodySchema,
}).meta({ id: 'StoryDraft', description: 'The text of one story version. The title may be empty until it is published' })

const storyGroupFields = {
  stayTag: stayTag.optional(),
  interests: interests.optional(),
  categoryIds: idList(20).optional(),
  placeIds: idList(50).optional(),
  keepsakeProductIds: idList(6).optional(),
  relatedGroupIds: idList(3).optional(),
}

export const storyGroupCreateBodySchema = z.strictObject({
  kind: z.enum(['story', 'editorial_review']).default('story'),
  subjectPlaceId: z.uuid().optional(),
  ...storyGroupFields,
}).superRefine((body, ctx) => {
  // story_groups_subject_check: only an editorial review has a subject place, and it must have one.
  if (body.kind === 'editorial_review' && body.subjectPlaceId === undefined)
    ctx.addIssue({ code: 'custom', message: 'An editorial review needs a subject place', path: ['subjectPlaceId'] })
  if (body.kind === 'story' && body.subjectPlaceId !== undefined)
    ctx.addIssue({ code: 'custom', message: 'Only an editorial review has a subject place', path: ['subjectPlaceId'] })
}).meta({ id: 'StoryGroupCreateBody' })

export const storyGroupSaveBodySchema = z.strictObject(storyGroupFields).meta({ id: 'StoryGroupSaveBody' })

export const storyGroupSchema = z.object({
  id: z.uuid(),
  storeId: z.uuid(),
  kind: z.enum(['story', 'editorial_review']),
  subjectPlaceId: z.uuid().nullable(),
  stayTag,
  interests: z.array(z.string()),
  categoryIds: z.array(z.uuid()),
  placeIds: z.array(z.uuid()),
  keepsakeProductIds: z.array(z.uuid()),
  relatedGroupIds: z.array(z.uuid()),
  rowVersion: z.int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).meta({ id: 'StoryGroup', description: 'The shared part of the language versions of one story' })

const storySlug = z.string().max(200).regex(slugPattern, 'Lower-case letters and digits, separated by single dashes')

export const storyVersionCreateBodySchema = z.strictObject({
  language,
  slug: storySlug.optional(),
  draft: storyDraftSchema.optional(),
}).meta({ id: 'StoryVersionCreateBody' })

export const storyVersionSaveBodySchema = z.strictObject({
  slug: storySlug.nullable().optional(),
  draft: storyDraftSchema.optional(),
}).meta({ id: 'StoryVersionSaveBody' })

export const storyVersionMoveBodySchema = z.strictObject({
  targetGroupId: z.uuid(),
}).meta({ id: 'StoryVersionMoveBody' })

// Stored data is not checked again on a read, so the body here is only known to be a document of nodes.
const storyBodyNodeViewSchema = z.object({
  type: z.string(),
  attrs: z.record(z.string(), z.unknown()).optional(),
  content: z.array(z.unknown()).optional(),
  text: z.string().optional(),
  marks: z.array(z.unknown()).optional(),
})

const storyDraftViewSchema = z.object({
  title: z.string(),
  excerpt: z.string(),
  authorName: z.string(),
  authorRole: z.string(),
  coverMediaId: z.uuid().nullable(),
  body: z.object({ type: z.literal('doc'), content: z.array(storyBodyNodeViewSchema) }),
})

export const storyVersionSchema = z.object({
  groupId: z.uuid(),
  storeId: z.uuid(),
  language,
  status: z.enum(['draft', 'published']),
  slug: z.string().nullable(),
  draft: storyDraftViewSchema.nullable(),
  published: storyDraftViewSchema.nullable(),
  publishedAt: z.iso.datetime().nullable(),
  rowVersion: z.int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).meta({ id: 'StoryVersion', description: 'One language version of a story, with its draft and its published text' })

const tourStopWriteSchema = z.strictObject({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  title: localizedTextSchema.optional(),
  text: localizedLongTextSchema.optional(),
  minutesFromStart: z.int().min(0).max(10080).nullable().optional(),
  mediaId: z.uuid().nullable().optional(),
  placeId: z.uuid().nullable().optional(),
})

export const tourWriteBodySchema = z.strictObject({
  slug: slugMapSchema.nullable().optional(),
  stayTag: stayTag.optional(),
  interests: interests.optional(),
  durationMinutes: z.int().min(1).max(10080).nullable().optional(),
  coverMediaId: z.uuid().nullable().optional(),
  pdfMediaId: z.uuid().nullable().optional(),
  keepsakeProductIds: idList(3).optional(),
  stops: z.array(tourStopWriteSchema).max(50).optional(),
  draft: z.strictObject({
    title: localizedTextSchema.optional(),
    summary: localizedLongTextSchema.optional(),
    meetingPoint: localizedTextSchema.optional(),
    sections: z.array(z.strictObject({
      id: noNul(z.string().min(1).max(64)),
      heading: localizedTextSchema,
      body: localizedLongTextSchema,
    })).max(40).optional(),
  }).optional(),
}).meta({ id: 'TourGuideWriteBody', description: 'Every field is optional. A tour guide has no price and no departure' })

const tourDocViewSchema = z.object({
  title: localizedView,
  summary: localizedView,
  meetingPoint: localizedView,
  sections: z.array(z.object({ id: z.string(), heading: localizedView, body: localizedView })),
})

export const tourSchema = z.object({
  id: z.uuid(),
  storeId: z.uuid(),
  status: z.enum(['draft', 'published']),
  slug: localizedView.nullable(),
  stayTag,
  interests: z.array(z.string()),
  durationMinutes: z.int().nullable(),
  coverMediaId: z.uuid().nullable(),
  pdfMediaId: z.uuid().nullable(),
  keepsakeProductIds: z.array(z.uuid()),
  stops: z.array(z.object({
    id: z.uuid(),
    position: z.int(),
    latitude: z.number(),
    longitude: z.number(),
    title: localizedView,
    text: localizedView,
    minutesFromStart: z.int().nullable(),
    mediaId: z.uuid().nullable(),
    placeId: z.uuid().nullable(),
  })),
  draft: tourDocViewSchema.nullable(),
  published: tourDocViewSchema.nullable(),
  rowVersion: z.int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).meta({ id: 'TourGuide', description: 'A tour guide as the editor sees it, with its draft and its published text' })

export type LocalizedText = z.infer<typeof localizedTextSchema>
export type PinPublishBody = z.infer<typeof pinPublishBodySchema>
export type TourPublishBody = z.infer<typeof tourPublishBodySchema>
export type PinWriteBody = z.infer<typeof pinWriteBodySchema>
export type Pin = z.infer<typeof pinSchema>
export type StoryDraft = z.infer<typeof storyDraftSchema>
export type StoryGroupCreateBody = z.infer<typeof storyGroupCreateBodySchema>
export type StoryGroupSaveBody = z.infer<typeof storyGroupSaveBodySchema>
export type StoryGroup = z.infer<typeof storyGroupSchema>
export type StoryVersionCreateBody = z.infer<typeof storyVersionCreateBodySchema>
export type StoryVersionSaveBody = z.infer<typeof storyVersionSaveBodySchema>
export type StoryVersionMoveBody = z.infer<typeof storyVersionMoveBodySchema>
export type StoryVersion = z.infer<typeof storyVersionSchema>
export type TourGuideWriteBody = z.infer<typeof tourWriteBodySchema>
export type TourGuide = z.infer<typeof tourSchema>
