import { z } from 'zod'

// Mirrors packages/domain/src/content (the contract imports only zod). Request bodies are strict, so a price, a
// type or any other unknown key is a 400. A save is a PATCH: a left-out field stays, null clears, a list replaces.

const language = z.enum(['en', 'de'])
const stayTag = z.enum(['short_stay', 'multi_day', 'both'])
const interests = z.array(z.enum(['history-culture', 'food-drink', 'lake-mountains', 'shopping-keepsakes'])).max(4)
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'A time as HH:MM')
// Postgres text and jsonb refuse U+0000, so it is a 400 here and not a 500 there.
function noNul<T extends z.ZodString>(schema: T): T {
  return schema.refine(value => !value.includes('\u0000'), 'Text may not contain a NUL character')
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

const storyBlockSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('paragraph'), text: text(20000) }),
  z.strictObject({ type: z.literal('image'), mediaId: z.uuid(), caption: text(300) }),
  z.strictObject({
    type: z.literal('video'),
    youtubeId: z.string().regex(/^[\w-]{11}$/, 'A YouTube video id'),
    title: text(300),
    caption: text(300),
  }),
  z.strictObject({ type: z.literal('audio'), mediaId: z.uuid(), title: text(300), caption: text(300) }),
])

// The title may be empty: a draft is incomplete, and the publish gap (title) stops an untitled version going live.
export const storyDraftSchema = z.strictObject({
  title: noNul(z.string().trim().max(300)),
  excerpt: text(1000),
  intro: text(20000),
  authorName: text(120),
  authorRole: text(120),
  readMinutes: z.int().min(1).max(600).nullable(),
  coverMediaId: z.uuid().nullable(),
  sections: z.array(z.strictObject({
    id: noNul(z.string().min(1).max(64)),
    heading: text(300),
    blocks: z.array(storyBlockSchema).max(200),
  })).max(60),
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

const storyDraftViewSchema = z.object({
  title: z.string(),
  excerpt: z.string(),
  intro: z.string(),
  authorName: z.string(),
  authorRole: z.string(),
  readMinutes: z.int().nullable(),
  coverMediaId: z.uuid().nullable(),
  sections: z.array(z.object({
    id: z.string(),
    heading: z.string(),
    blocks: z.array(z.discriminatedUnion('type', [
      z.object({ type: z.literal('paragraph'), text: z.string() }),
      z.object({ type: z.literal('image'), mediaId: z.uuid(), caption: z.string() }),
      z.object({ type: z.literal('video'), youtubeId: z.string(), title: z.string(), caption: z.string() }),
      z.object({ type: z.literal('audio'), mediaId: z.uuid(), title: z.string(), caption: z.string() }),
    ])),
  })),
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
