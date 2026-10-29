export type PublishGap = 'name' | 'photos' | 'variants'

export type Failure
  = | { reason: 'forbidden' | 'not-found' | 'stale' | 'media-retired' | 'media-invalid' | 'not-published' | 'sku-code-taken' | 'name-required' | 'slug-conflict' }
    | { reason: 'sku-code-invalid', path: string }
    | { reason: 'incomplete', gaps: PublishGap[] }
    // The ids of the photos the worker has not finished, so the editor can say which ones to wait for.
    | { reason: 'media-processing', mediaIds: string[] }

export type Result<V> = { ok: true, value: V } | ({ ok: false } & Failure)

export function fail(failure: Failure): { ok: false } & Failure {
  return { ok: false, ...failure }
}

export function ok<V>(value: V): Result<V> {
  return { ok: true, value }
}
