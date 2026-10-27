import { z } from 'zod'

// Mirrors packages/domain/src/content (the contract imports only zod). Request bodies are strict, so a price, a
// type or any other unknown key is a 400. A save is a PATCH: a left-out field stays, null clears, a list replaces.

const language = z.enum(['en', 'de'])
const stayTag = z.enum(['short_stay', 'multi_day', 'both'])
const interests = z.array(z.enum(['history-culture', 'food-drink', 'lake-mountains', 'shopping-keepsakes'])).max(4)
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'A time as HH:MM')
const closingTime = z.string().regex(/^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/, 'A time as HH:MM, or 24:00')

// Trimmed first, so "  " is empty and refused. A key left out means no text in that language.
export const localizedTextSchema = z.strictObject({
  en: z.string().trim().min(1).max(300).optional(),
  de: z.string().trim().min(1).max(300).optional(),
}).meta({ id: 'LocalizedText', description: 'Text per language. A present key is non-empty and at most 300 characters' })

export const localizedLongTextSchema = z.strictObject({
  en: z.string().trim().min(1).max(20000).optional(),
  de: z.string().trim().min(1).max(20000).optional(),
}).meta({ id: 'LocalizedLongText', description: 'Text per language. A present key is non-empty and at most 20000 characters' })

const slugMapSchema = z.strictObject({
  en: z.string().max(200).regex(slugPattern, 'Lower-case letters and digits, separated by single dashes').optional(),
  de: z.string().max(200).regex(slugPattern, 'Lower-case letters and digits, separated by single dashes').optional(),
})

// What a response carries: whatever is stored, no checks.
const localizedView = z.object({ en: z.string().optional(), de: z.string().optional() })

const weeklySpanSchema = z.strictObject({
  day: z.int().min(1).max(7).meta({ description: '1 is Monday, 7 is Sunday' }),
  opens: time,
  closes: closingTime,
}).refine(span => span.opens < span.closes, { message: 'opens must be before closes', path: ['closes'] })

const pinDateWriteSchema = z.strictObject({
  firstDay: z.iso.date(),
  lastDay: z.iso.date(),
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
  slug: slugMapSchema.optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  address: z.string().trim().min(1).max(300).nullable().optional(),
  weeklyHours: z.array(weeklySpanSchema).max(21).optional(),
  stayTag: stayTag.optional(),
  interests: interests.optional(),
  coverMediaId: z.uuid().nullable().optional(),
  mainStoryGroupId: z.uuid().nullable().optional(),
  categoryIds: z.array(z.uuid()).max(20).optional(),
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
  z.strictObject({ type: z.literal('paragraph'), text: z.string().max(20000) }),
  z.strictObject({ type: z.literal('image'), mediaId: z.uuid(), caption: z.string().max(300) }),
  z.strictObject({
    type: z.literal('video'),
    youtubeId: z.string().regex(/^[\w-]{11}$/, 'A YouTube video id'),
    title: z.string().max(300),
    caption: z.string().max(300),
  }),
  z.strictObject({ type: z.literal('audio'), mediaId: z.uuid(), title: z.string().max(300), caption: z.string().max(300) }),
])

export const storyDraftSchema = z.strictObject({
  title: z.string().trim().max(300),
  excerpt: z.string().max(1000),
  intro: z.string().max(20000),
  authorName: z.string().max(120),
  authorRole: z.string().max(120),
  readMinutes: z.int().min(1).max(600).nullable(),
  coverMediaId: z.uuid().nullable(),
  sections: z.array(z.strictObject({
    id: z.string().min(1).max(64),
    heading: z.string().max(300),
    blocks: z.array(storyBlockSchema).max(200),
  })).max(60),
}).meta({ id: 'StoryDraft', description: 'The text of one story version. The title may be empty until it is published' })

const storyGroupFields = {
  stayTag: stayTag.optional(),
  interests: interests.optional(),
  categoryIds: z.array(z.uuid()).max(20).optional(),
  placeIds: z.array(z.uuid()).max(50).optional(),
  keepsakeProductIds: z.array(z.uuid()).max(6).optional(),
  relatedGroupIds: z.array(z.uuid()).max(3).optional(),
}

export const storyGroupCreateBodySchema = z.strictObject({
  kind: z.enum(['story', 'editorial_review']).default('story'),
  subjectPlaceId: z.uuid().optional(),
  ...storyGroupFields,
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
  slug: storySlug.optional(),
  draft: storyDraftSchema.optional(),
}).meta({ id: 'StoryVersionSaveBody' })

export const storyVersionMoveBodySchema = z.strictObject({
  targetGroupId: z.uuid(),
}).meta({ id: 'StoryVersionMoveBody' })

export const storyVersionSchema = z.object({
  groupId: z.uuid(),
  storeId: z.uuid(),
  language,
  status: z.enum(['draft', 'published']),
  slug: z.string().nullable(),
  draft: storyDraftSchema.nullable(),
  published: storyDraftSchema.nullable(),
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
  minutesFromStart: z.int().min(0).nullable().optional(),
  mediaId: z.uuid().nullable().optional(),
  placeId: z.uuid().nullable().optional(),
})

export const tourWriteBodySchema = z.strictObject({
  slug: slugMapSchema.optional(),
  stayTag: stayTag.optional(),
  interests: interests.optional(),
  durationMinutes: z.int().min(1).nullable().optional(),
  coverMediaId: z.uuid().nullable().optional(),
  pdfMediaId: z.uuid().nullable().optional(),
  keepsakeProductIds: z.array(z.uuid()).max(3).optional(),
  stops: z.array(tourStopWriteSchema).max(50).optional(),
  draft: z.strictObject({
    title: localizedTextSchema.optional(),
    summary: localizedLongTextSchema.optional(),
    meetingPoint: localizedTextSchema.optional(),
    sections: z.array(z.strictObject({
      id: z.string().min(1).max(64),
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
