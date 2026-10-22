/**
 * A write the client refused because the data would no longer fit in the browser's storage.
 * Only the demo client throws it today; a screen shows it next to its save button.
 */
export class StorageFullError extends Error {
  constructor() {
    super('The data would not fit in this browser\'s storage')
    this.name = 'StorageFullError'
  }
}

/**
 * A call to our API that the API answered with a problem (RFC 9457, `packages/api-contract/src/problem.ts`).
 * `type` is the stable code a screen maps to its own copy. The `title` is English and for logs only.
 */
export class ApiProblem extends Error {
  readonly status: number
  readonly type: string
  readonly requestId: string | undefined

  constructor(status: number, type: string, title: string, requestId?: string) {
    super(title)
    this.name = 'ApiProblem'
    this.status = status
    this.type = type
    this.requestId = requestId
  }
}
