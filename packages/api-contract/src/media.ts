import { z } from 'zod'

// Files the merchant uploads: a browser PUTs the bytes straight to object storage with a one-time grant, then
// confirms them. Mirrors packages/domain/src/content/media.ts (the contract imports only zod).

const mediaKind = z.enum(['image', 'audio', 'pdf'])

export const uploadRequestSchema = z.strictObject({
  contentType: z.string().max(100).meta({ description: 'The type of the file: image/jpeg, image/png, image/webp, audio/mpeg, audio/mp4 (M4A) or application/pdf' }),
  byteSize: z.int().positive().meta({ description: 'The size of the file in bytes' }),
}).meta({ id: 'UploadRequest', description: 'The file to upload. The type and size are checked before a URL is issued' })

export const uploadGrantSchema = z.object({
  uploadKey: z.string().meta({ description: 'Send this back to confirm the upload' }),
  url: z.string().meta({ description: 'PUT the file bytes here' }),
  method: z.literal('PUT'),
  headers: z.record(z.string(), z.string()).meta({ description: 'Send these headers with the PUT' }),
  expiresAt: z.iso.datetime().meta({ description: 'The URL stops working at this time' }),
  kind: mediaKind,
}).meta({ id: 'UploadGrant', description: 'Where and how to upload one file' })

export const confirmUploadSchema = z.strictObject({
  uploadKey: z.string().min(1).max(300).meta({ description: 'The uploadKey of the grant, after the file was PUT' }),
  fileName: z.string().max(1000).optional().meta({ description: 'The name of the file on the uploader\'s device. It becomes the name in the library. A blank one is replaced by a default name' }),
}).meta({ id: 'ConfirmUpload', description: 'The upload to confirm' })

export const mediaSchema = z.object({
  id: z.uuid(),
  kind: mediaKind,
  status: z.enum(['processing', 'ready', 'retired']),
  contentType: z.string(),
  byteSize: z.int(),
  width: z.int().nullable(),
  height: z.int().nullable(),
  publicUrl: z.string().nullable().meta({ description: 'The public URL of the original. Null until the file is ready' }),
  variants: z.array(z.object({ width: z.int(), url: z.string() })).meta({ description: 'Resized copies of an image. Empty until the file is ready' }),
}).meta({ id: 'Media', description: 'A file in the library' })

export type ConfirmUpload = z.infer<typeof confirmUploadSchema>
export type UploadRequest = z.infer<typeof uploadRequestSchema>
export type UploadGrant = z.infer<typeof uploadGrantSchema>
export type Media = z.infer<typeof mediaSchema>

export const MEDIA_NAME_MAX = 200
export const ALT_MAX = 300

const mediaName = z.string().trim().min(1, 'Give the file a name.').max(MEDIA_NAME_MAX)
const altText = z.string().trim().max(ALT_MAX)

export const mediaAltSchema = z.strictObject({
  en: altText.optional(),
  de: altText.optional(),
}).meta({ id: 'MediaAlt', description: 'The description of a file in each language. It is the alt text guests with a screen reader hear' })

export const mediaUseSummarySchema = z.object({
  pages: z.int().meta({ description: 'The pages that use the file. A story counts once per language version, keepsakes count too' }),
  published: z.int().meta({ description: 'The pages that show the file in their published version' }),
  drafts: z.int().meta({ description: 'The pages that use the file only in a draft' }),
}).meta({ id: 'MediaUseSummary' })

export const mediaItemSchema = mediaSchema.extend({
  name: z.string().meta({ description: 'What the merchant sees and searches. It starts as the uploaded file name' }),
  fileName: z.string().meta({ description: 'The file name of the latest upload' }),
  alt: mediaAltSchema,
  durationSeconds: z.int().nullable(),
  version: z.int().meta({ description: 'Starts at 1. A replacement adds one' }),
  createdAt: z.iso.datetime(),
  usage: mediaUseSummarySchema.optional().meta({ description: 'Only in the list. An answer to a change leaves it out: read the list again for the pages' }),
}).meta({ id: 'MediaItem', description: 'A file of the library with its name, description and use' })

const useFilter = z.enum(['unused', 'drafts', 'published'])
const statusFilter = z.enum(['processing', 'ready', 'retired'])
const splitList = (value: string | undefined) => (value === undefined || value === '' ? [] : value.split(','))
const useList = z.string().max(60).optional().transform(splitList).pipe(z.array(useFilter).max(3))
const statusList = z.string().max(60).optional().transform(splitList).pipe(z.array(statusFilter).max(3))

export const mediaListQuerySchema = z.object({
  kind: mediaKind.default('image'),
  q: z.string().trim().max(200).optional().meta({ description: 'Matches the name only, in any case' }),
  use: useList.meta({ description: 'Comma separated: unused, drafts, published. A file matches any of them' }),
  status: statusList.meta({ description: 'Comma separated: processing, ready, retired. Empty means all three' }),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
})

const countByUse = z.object({ unused: z.int(), drafts: z.int(), published: z.int() })
const countByStatus = z.object({ processing: z.int(), ready: z.int(), retired: z.int() })

export const mediaListSchema = z.object({
  items: z.array(mediaItemSchema),
  total: z.int().meta({ description: 'The files that match, before paging' }),
  page: z.int(),
  pageSize: z.int(),
  kinds: z.object({ image: z.int(), audio: z.int(), pdf: z.int() }).meta({ description: 'Every file of each kind, retired ones too. Search and filters do not change them' }),
  uses: countByUse.meta({ description: 'The files of this kind that match the search and the status filter, by use' }),
  statuses: countByStatus.meta({ description: 'The files of this kind that match the search and the use filter, by status' }),
}).meta({ id: 'MediaList', description: 'One page of the library' })

export const mediaUseSchema = z.object({
  pageKind: z.enum(['story', 'place', 'tour', 'keepsake']),
  pageId: z.uuid().meta({ description: 'A story group, place, tour or keepsake id' }),
  language: z.enum(['en', 'de']).nullable().meta({ description: 'Only for a story: its language version' }),
  title: z.object({ en: z.string().optional(), de: z.string().optional() }).meta({ description: 'The page title. A story has its own language only' }),
  role: z.enum(['cover', 'text', 'pdf', 'stop', 'photo']).meta({ description: 'What the file is on that page' }),
  published: z.boolean(),
  thumbnailUrl: z.string().nullable(),
}).meta({ id: 'MediaUse', description: 'One page that uses a file' })

export const mediaUsesSchema = z.object({
  published: z.array(mediaUseSchema),
  drafts: z.array(mediaUseSchema),
}).meta({ id: 'MediaUses', description: 'Where a file is used, on published pages and only in drafts' })

export const mediaPatchBodySchema = z.strictObject({
  name: mediaName.optional(),
  alt: mediaAltSchema.optional().meta({ description: 'Replaces the description. A language left out keeps its text; an empty string clears it' }),
}).refine(body => body.name !== undefined || body.alt !== undefined, { message: 'Send a name or a description' })
  .meta({ id: 'MediaPatch', description: 'The name and description of a file' })

export const replaceMediaBodySchema = z.strictObject({
  uploadKey: z.string().min(1).max(300).meta({ description: 'The uploadKey of a grant, after the new file was PUT. It must be the same kind of file' }),
  fileName: z.string().max(1000).optional(),
}).meta({ id: 'ReplaceMedia', description: 'The new file for an existing one' })

export type MediaUseSummary = z.infer<typeof mediaUseSummarySchema>
export type MediaItem = z.infer<typeof mediaItemSchema>
export type MediaList = z.infer<typeof mediaListSchema>
export type MediaListQuery = z.input<typeof mediaListQuerySchema>
export type MediaUse = z.infer<typeof mediaUseSchema>
export type MediaUses = z.infer<typeof mediaUsesSchema>
export type MediaPatchBody = z.infer<typeof mediaPatchBodySchema>
export type ReplaceMediaBody = z.infer<typeof replaceMediaBodySchema>
export type MediaAlt = z.infer<typeof mediaAltSchema>
