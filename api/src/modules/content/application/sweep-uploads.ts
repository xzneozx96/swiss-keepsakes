import type { Clock, ObjectStorage } from '../ports.ts'
import { MEDIA_RULES } from '@sk/domain/content'

const HOUR = 3_600_000

export interface SweepUploadsDeps {
  storage: ObjectStorage
  clock: Clock
}

// Hourly. Only the `uploads` bucket is listed, never `media`. A raw upload nobody confirmed within the abandoned
// window is removed. A confirmed source normally leaves with its job; one whose confirm transaction rolled back has
// no row and no job, so it goes after the longer orphaned window (a live job takes minutes, retries about an hour).
export function makeSweepUploads({ storage, clock }: SweepUploadsDeps) {
  return async (): Promise<{ removed: number }> => {
    const now = clock.now().getTime()
    // An object with no timestamp cannot be aged, so it stays.
    const expired = (await storage.list('uploads', '')).filter(({ key, lastModified }) => {
      const hours = key.startsWith('confirmed/') ? MEDIA_RULES.orphanedSourceHours : MEDIA_RULES.abandonedUploadHours
      return lastModified !== undefined && now - lastModified.getTime() > hours * HOUR
    })
    // The deletes are independent, so they run together; the SDK's connection pool bounds how many are in flight.
    await Promise.all(expired.map(({ key }) => storage.delete('uploads', key)))
    return { removed: expired.length }
  }
}
