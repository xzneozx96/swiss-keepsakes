import { z } from 'zod'

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

const categoryRefSchema = z.object({ id: z.uuid(), slug: z.string(), name: z.string() })

const storyBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('paragraph'), text: z.string() }),
  z.object({ type: z.literal('image'), key: z.string().nullable(), caption: z.string() }),
  z.object({ type: z.literal('video'), youtubeId: z.string(), title: z.string(), caption: z.string() }),
  z.object({ type: z.literal('audio'), key: z.string().nullable(), title: z.string(), caption: z.string() }),
])

export const publicStoryCardSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  readMinutes: z.int().nullable(),
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
  intro: z.string(),
  authorName: z.string(),
  authorRole: z.string(),
  sections: z.array(z.object({
    id: z.string(),
    heading: z.string(),
    blocks: z.array(storyBlockSchema),
  })),
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
  name: z.object({ en: z.string(), de: z.string() }),
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
