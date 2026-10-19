import { problemSchema } from '@sk/api-contract'

// The request id middleware in app.ts sets X-Request-Id on every response, and createApp registers this component.
export const requestIdHeader = { 'X-Request-Id': { $ref: '#/components/headers/RequestId' } }

// Spread into every route's `responses`. Any status the route does not list is then a problem in the document,
// and the generated client types `error` as one.
export const problemResponses = {
  default: {
    description: 'An RFC 9457 problem. `type` says what went wrong',
    headers: requestIdHeader,
    content: { 'application/problem+json': { schema: problemSchema } },
  },
}
