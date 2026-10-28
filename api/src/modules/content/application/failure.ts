import type { PublishGap } from '@sk/domain/content'

export type Failure
  = | { reason: 'forbidden' | 'not-found' | 'stale' | 'slug-taken' | 'slug-conflict' | 'media-retired' | 'media-invalid' | 'reference-invalid' | 'published-cannot-be-deleted' | 'published-cannot-move' | 'version-exists' | 'not-published' | 'in-use' | 'category-has-children' | 'category-in-use' | 'category-too-deep' | 'category-parent-has-children' | 'name-missing' | 'order-mismatch' }
    | { reason: 'incomplete', gaps: PublishGap[] }

export type Result<V> = { ok: true, value: V } | ({ ok: false } & Failure)

export function fail(failure: Failure): { ok: false } & Failure {
  return { ok: false, ...failure }
}

export function ok<V>(value: V): Result<V> {
  return { ok: true, value }
}
