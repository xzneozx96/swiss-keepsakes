import { describe, expect, it } from 'vitest'
import { hashRequest } from '../../src/platform/idempotency.ts'

const body = (text: string) => new TextEncoder().encode(text).buffer as ArrayBuffer
const base = hashRequest('POST', '/api/holds', body('{"departureId":"d1","seats":2}'))

describe('[E1.9] the Idempotency-Key request hash', () => {
  it('[E1.9] is the same for the same method, path and body bytes', () => {
    expect(hashRequest('POST', '/api/holds', body('{"departureId":"d1","seats":2}'))).toBe(base)
  })

  it.each([
    ['another body', 'POST', '/api/holds', '{"departureId":"d1","seats":3}'],
    ['the same JSON in another key order, because it covers the raw bytes', 'POST', '/api/holds', '{"seats":2,"departureId":"d1"}'],
    ['another method', 'PUT', '/api/holds', '{"departureId":"d1","seats":2}'],
    ['another path', 'POST', '/api/orders', '{"departureId":"d1","seats":2}'],
    ['a query string', 'POST', '/api/holds?seats=2', '{"departureId":"d1","seats":2}'],
  ])('[E1.9] differs for %s', (_, method, path, text) => {
    expect(hashRequest(method, path, body(text))).not.toBe(base)
  })

  it('[E2.6] differs by the If-Match header, and is the old hash when the header is absent', () => {
    const text = '{"departureId":"d1","seats":2}'
    const withVersion = hashRequest('POST', '/api/holds', body(text), '1')
    expect(withVersion).not.toBe(base)
    expect(hashRequest('POST', '/api/holds', body(text), '2')).not.toBe(withVersion)
    expect(hashRequest('POST', '/api/holds', body(text), '1')).toBe(withVersion)
    expect(hashRequest('POST', '/api/holds', body(text), undefined)).toBe(base)
    expect(hashRequest('POST', '/api/holds', body(text), null)).toBe(base)
  })
})
