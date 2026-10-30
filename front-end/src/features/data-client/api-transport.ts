import { ApiProblem } from './errors'

/** No call waits longer than this. An abort ends the call like a lost connection does. */
const TIMEOUT_MS = 15_000

// The contract package carries Zod, so it loads on the first call and never with the first paint.
let loaded: Promise<ReturnType<(typeof import('@sk/api-contract'))['createApiClient']>> | undefined

export function loadClient() {
  loaded ??= import('@sk/api-contract').then(
    module => module.createApiClient(window.location.origin),
    (error: unknown) => {
      loaded = undefined
      throw error
    },
  )

  return loaded
}

export function problemOf(response: Response, body: unknown): ApiProblem {
  const { type, title, requestId } = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>

  return new ApiProblem(
    response.status,
    typeof type === 'string' ? type : 'about:blank',
    typeof title === 'string' ? title : response.statusText,
    typeof requestId === 'string' ? requestId : undefined,
  )
}

export async function answer<T>(call: Promise<{ data?: T, error?: unknown, response: Response }>): Promise<T> {
  const { data, error, response } = await call

  if (data === undefined)
    throw problemOf(response, error)

  return data
}

export function timeout(ms = TIMEOUT_MS) {
  return { signal: AbortSignal.timeout(ms) }
}

/** A call that works on a file (the API reads it and builds its sizes) gets more time than a JSON call. */
export const FILE_CALL_TIMEOUT_MS = 60_000

const UPLOAD_BASE_MS = 60_000
const UPLOAD_PER_MB_MS = 3_000

/** The time a file may take to reach storage: 60 s and 3 s per MB, so 50 MB may take 3.5 minutes (about 2 Mbit/s). */
export function uploadTimeoutMs(byteSize: number) {
  return UPLOAD_BASE_MS + Math.ceil(byteSize / 1_048_576) * UPLOAD_PER_MB_MS
}

// The key belongs to the user's intent (`useIdempotencyKey`), so a retry after a timeout repeats the same request, and the API replays its answer.
export function keyed(idempotencyKey: string, ms = TIMEOUT_MS) {
  return { ...timeout(ms), headers: { 'Idempotency-Key': idempotencyKey } }
}

// The demo QueryClient never refetches and never retries, which suits browser-held data. Reads
// from the API need the next read to be a fresh one: another session may have changed the data.
export const fromApi = { staleTime: 0, gcTime: 5 * 60_000, retry: false, networkMode: 'online', structuralSharing: true } as const
