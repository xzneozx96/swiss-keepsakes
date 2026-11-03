export type Failure
  = | { reason: 'forbidden' } | { reason: 'not-found', skuId?: string }
  // The units open orders hold. Unknown (undefined) when only the database CHECK saw the shortfall.
    | { reason: 'stock-below-reserved', reserved?: number, skuId?: string }

export type Result<V> = { ok: true, value: V } | ({ ok: false } & Failure)

export function fail(failure: Failure): { ok: false } & Failure {
  return { ok: false, ...failure }
}

export function ok<V>(value: V): Result<V> {
  return { ok: true, value }
}
