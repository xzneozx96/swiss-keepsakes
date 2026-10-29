import { z } from 'zod'
import { BODY_LIST_LEVELS, listItemSchema } from './content.ts'

// What the public reads return: published text in one language, media as a storage key, and no price anywhere.
// Responses are plain objects, not strict ones, like the editor views in content.ts.

const stayTag = z.enum(['short_stay', 'multi_day', 'both'])

export const publicLanguageSchema = z.enum(['en', 'de']).meta({ id: 'PublicLanguage' })

// Spread into every item and detail: the language carried, the one asked for, and the languages that exist.
export const languageNoticeSchema = z.object({
  language: publicLanguageSchema,
  requestedLanguage: publicLanguageSchema,
  fallback: z.boolean().meta({ description: 'True when the item is in another language than the one asked for' }),
  availableLanguages: z.array(publicLanguageSchema),
}).meta({ id: 'LanguageNotice' })

export const nextDateSchema = z.object({
  firstDay: z.iso.date(),
  lastDay: z.iso.date(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
}).meta({ id: 'NextDate', description: 'The next date of a pin, in Europe/Zurich' })

const categoryRefSchema = z.object({ id: z.uuid(), slug: z.string(), name: z.string().nullable() })

// The story body as the page reads it: the editor document with each media id replaced by its storage key.
// Strict, so a node or attribute the server does not mean to send fails the response check in tests.
const publicMarkSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('bold') }),
  z.strictObject({ type: z.literal('italic') }),
  z.strictObject({ type: z.literal('link'), attrs: z.strictObject({ href: z.string() }) }),
  z.strictObject({ type: z.literal('pinLink'), attrs: z.strictObject({ pinId: z.uuid() }) }),
])

const publicTextSchema = z.strictObject({ type: z.literal('text'), text: z.string(), marks: z.array(publicMarkSchema).optional() })
const publicHardBreakSchema = z.strictObject({ type: z.literal('hardBreak') })
const publicInline = z.discriminatedUnion('type', [publicTextSchema, publicHardBreakSchema])

const publicParagraphSchema = z.strictObject({ type: z.literal('paragraph'), content: z.array(publicInline).optional() })
const publicHeadingSchema = z.strictObject({
  type: z.literal('heading'),
  attrs: z.strictObject({ level: z.literal([2, 3]) }),
  content: z.array(publicInline).optional(),
})
const publicBlockquoteSchema = z.strictObject({ type: z.literal('blockquote'), content: z.array(publicParagraphSchema) })

// Lists unrolled to the same depth as the write schema (a story body is at most ten levels deep).
const publicBulletListSchema = z.strictObject({ type: z.literal('bulletList'), content: z.array(listItemSchema(publicParagraphSchema, BODY_LIST_LEVELS)) })
const publicOrderedListSchema = z.strictObject({ type: z.literal('orderedList'), content: z.array(listItemSchema(publicParagraphSchema, BODY_LIST_LEVELS)) })

const publicImageSchema = z.strictObject({
  type: z.literal('image'),
  attrs: z.strictObject({ key: z.string().nullable(), alt: z.string(), caption: z.string() }),
})
const publicVideoSchema = z.strictObject({
  type: z.literal('video'),
  attrs: z.strictObject({ youtubeId: z.string(), title: z.string(), caption: z.string() }),
})
const publicAudioSchema = z.strictObject({
  type: z.literal('audio'),
  attrs: z.strictObject({ key: z.string().nullable(), title: z.string(), caption: z.string() }),
})

export const publicStoryBodySchema = z.strictObject({
  type: z.literal('doc'),
  content: z.array(z.discriminatedUnion('type', [
    publicParagraphSchema,
    publicHeadingSchema,
    publicBlockquoteSchema,
    publicBulletListSchema,
    publicOrderedListSchema,
    publicImageSchema,
    publicVideoSchema,
    publicAudioSchema,
  ])),
}).meta({ id: 'PublicStoryBody', description: 'The story text as one Tiptap document. Images and audio carry a storage key in place of a media id' })

export const publicStoryCardSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  readMinutes: z.int().min(1),
  coverKey: z.string().nullable(),
  stayTag,
  interests: z.array(z.string()),
  categories: z.array(categoryRefSchema),
  publishedAt: z.iso.datetime(),
  ...languageNoticeSchema.shape,
}).meta({ id: 'PublicStoryCard' })

export const publicStoryListSchema = z.object({
  items: z.array(publicStoryCardSchema),
}).meta({ id: 'PublicStoryList' })

export const publicStorySchema = publicStoryCardSchema.extend({
  authorName: z.string(),
  authorRole: z.string(),
  body: publicStoryBodySchema,
}).meta({ id: 'PublicStory' })

export const publicPinSchema = z.object({
  id: z.uuid(),
  slug: z.string().nullable(),
  title: z.string(),
  tip: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  address: z.string().nullable(),
  weeklyHours: z.array(z.object({ day: z.int(), opens: z.string(), closes: z.string() })),
  stayTag,
  interests: z.array(z.string()),
  categories: z.array(categoryRefSchema).meta({ description: 'The pin categories, with the parent of each sub-category included' }),
  nextDate: nextDateSchema.nullable(),
  hasMainStory: z.boolean(),
  mainStorySlug: z.string().nullable(),
  photoKey: z.string().nullable(),
  ...languageNoticeSchema.shape,
}).meta({ id: 'PublicPin', description: 'The pin card' })

export const publicMapItemSchema = z.object({
  id: z.uuid(),
  slug: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  title: z.string(),
  language: publicLanguageSchema,
  categoryIds: z.array(z.uuid()),
  stayTag,
  interests: z.array(z.string()),
  nextDate: nextDateSchema.nullable(),
  hasMainStory: z.boolean(),
  mainStorySlug: z.string().nullable(),
  photoKey: z.string().nullable(),
}).meta({ id: 'PublicMapItem', description: 'One pin on the map list' })

export const publicMapSchema = z.object({
  items: z.array(publicMapItemSchema),
}).meta({ id: 'PublicMap' })

export const publicTourCardSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  stayTag,
  interests: z.array(z.string()),
  durationMinutes: z.int().nullable(),
  coverKey: z.string().nullable(),
  ...languageNoticeSchema.shape,
}).meta({ id: 'PublicTourCard' })

export const publicTourListSchema = z.object({
  items: z.array(publicTourCardSchema),
}).meta({ id: 'PublicTourList' })

export const publicTourSchema = publicTourCardSchema.extend({
  summary: z.string(),
  meetingPoint: z.string(),
  sections: z.array(z.object({ id: z.string(), heading: z.string(), body: z.string() })),
  stops: z.array(z.object({
    position: z.int(),
    latitude: z.number(),
    longitude: z.number(),
    title: z.string(),
    text: z.string(),
    minutesFromStart: z.int().nullable(),
    key: z.string().nullable(),
    placeId: z.uuid().nullable(),
  })),
  pdfKey: z.string().nullable(),
  keepsakeProductIds: z.array(z.uuid()),
}).meta({ id: 'PublicTour' })

export const publicCategorySchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.object({ en: z.string().nullable(), de: z.string().nullable() }),
  parentId: z.uuid().nullable(),
  position: z.int(),
}).meta({ id: 'PublicCategory' })

export const publicCategoryListSchema = z.object({
  items: z.array(publicCategorySchema),
}).meta({ id: 'PublicCategoryList' })

export type PublicLanguage = z.infer<typeof publicLanguageSchema>
export type LanguageNotice = z.infer<typeof languageNoticeSchema>
export type NextDate = z.infer<typeof nextDateSchema>
export type PublicStoryCard = z.infer<typeof publicStoryCardSchema>
export type PublicStoryList = z.infer<typeof publicStoryListSchema>
export type PublicStory = z.infer<typeof publicStorySchema>
export type PublicPin = z.infer<typeof publicPinSchema>
export type PublicMapItem = z.infer<typeof publicMapItemSchema>
export type PublicMap = z.infer<typeof publicMapSchema>
export type PublicTourCard = z.infer<typeof publicTourCardSchema>
export type PublicTourList = z.infer<typeof publicTourListSchema>
export type PublicTour = z.infer<typeof publicTourSchema>
export type PublicCategory = z.infer<typeof publicCategorySchema>
export type PublicCategoryList = z.infer<typeof publicCategoryListSchema>
