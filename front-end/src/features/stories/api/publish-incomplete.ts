import type { PublishGap } from '@sk/domain/content'

import { ApiProblem } from '@/features/data-client/errors'

const GAPS: readonly string[] = ['title', 'location', 'slug', 'pdf', 'excerpt', 'coverMediaId', 'subjectPlaceId', 'checkedOn'] satisfies PublishGap[]

/** The 422 `publish-incomplete`: the API refused a publish and names what is missing. The shared `ApiProblem` keeps no detail, so the gaps stay with this feature. */
export class PublishIncomplete extends ApiProblem {
  readonly gaps: PublishGap[]

  constructor(base: ApiProblem, gaps: PublishGap[]) {
    super(base.status, base.type, base.message, base.requestId)
    this.name = 'PublishIncomplete'
    this.gaps = gaps
  }
}

/** The `errors[].path` values of a problem body that are gap names, once each. Anything else is dropped. */
export function gapsOf(body: unknown): PublishGap[] {
  const errors = typeof body === 'object' && body !== null ? (body as { errors?: unknown }).errors : undefined

  if (!Array.isArray(errors))
    return []
  const paths = errors.map(error => (typeof error === 'object' && error !== null ? (error as { path?: unknown }).path : undefined))

  return [...new Set(paths.filter((path): path is PublishGap => typeof path === 'string' && GAPS.includes(path)))]
}
