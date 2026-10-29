import { z } from 'zod'

// Files the merchant uploads: a browser PUTs the bytes straight to object storage with a one-time grant, then
// confirms them. Mirrors packages/domain/src/content/media.ts (the contract imports only zod).

const mediaKind = z.enum(['image', 'audio', 'pdf'])

export const uploadRequestSchema = z.strictObject({
  contentType: z.string().max(100).meta({ description: 'The type of the file: image/jpeg, image/png, image/webp, audio/mpeg or application/pdf' }),
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
