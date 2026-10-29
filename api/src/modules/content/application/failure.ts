import type { PublishGap } from '@sk/domain/content'

export type Failure
  = | { reason: 'forbidden' | 'not-found' | 'stale' | 'slug-taken' | 'slug-conflict' | 'media-retired' | 'media-invalid' | 'reference-invalid' | 'published-cannot-be-deleted' | 'published-cannot-move' | 'version-exists' | 'not-published' | 'in-use' | 'type-not-allowed' | 'too-large' | 'empty' | 'upload-missing' | 'content-mismatch' | 'category-has-children' | 'category-in-use' | 'category-too-deep' | 'category-parent-has-children' | 'name-missing' | 'order-mismatch' | 'media-already-retired' | 'media-not-ready' | 'media-kind-mismatch' }
    | { reason: 'incomplete', gaps: PublishGap[] }
    // A file that pages still use. `pages` is how many (absent when the database refused the retire).
    | { reason: 'media-in-use', pages?: number }
    // The ids of the files the worker has not finished, so the editor can say which ones to wait for.
    | { reason: 'media-processing', mediaIds: string[] }

export type Result<V> = { ok: true, value: V } | ({ ok: false } & Failure)

export function fail(failure: Failure): { ok: false } & Failure {
  return { ok: false, ...failure }
}

export function ok<V>(value: V): Result<V> {
  return { ok: true, value }
}
