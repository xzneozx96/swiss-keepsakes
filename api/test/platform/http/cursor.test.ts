import { Buffer } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { cursorProblem, decodeCursor, encodeCursor } from '../../../src/platform/http/cursor.ts'
import { createGuardedApp } from '../../support/guarded-app.ts'

const scope = { route: 'stories', lang: 'en', category: null }
const key = ['2026-11-05T10:00:00.123456Z', '0190a000-0000-7000-8000-000000000001'] as const
const keySchema = z.tuple([z.iso.datetime({ precision: 6 }), z.uuid()])

const raw = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')

describe('[ADR-033] the opaque cursor', () => {
  it('round trips the key at full precision', () => {
    expect(decodeCursor(encodeCursor(key, scope), scope, keySchema)).toEqual({ ok: true, key })
  })

  it('is URL-safe text', () => {
    expect(encodeCursor(key, scope)).toMatch(/^[\w-]+$/)
  })

  it('does not depend on the order of the scope keys', () => {
    expect(decodeCursor(encodeCursor(key, scope), { category: null, lang: 'en', route: 'stories' }, keySchema).ok).toBe(true)
  })

  it.each([
    ['not base64 or JSON', '%%%'],
    ['empty', ''],
    ['not JSON', Buffer.from('hello').toString('base64url')],
    ['JSON that is no cursor', raw([1, 2])],
    ['another version', raw({ v: 2, k: key, f: 'x' })],
    ['values that are not text', raw({ v: 1, k: [1, 2], f: 'x' })],
  ])('refuses a cursor that is %s', (_name, value) => {
    expect(decodeCursor(value, scope, keySchema)).toEqual({ ok: false })
  })

  it('refuses a cursor whose values have the wrong type for the key', () => {
    const forged = encodeCursor(['not a date', key[1]], scope)

    expect(decodeCursor(forged, scope, keySchema)).toEqual({ ok: false })
  })

  it('refuses a cursor with too few values', () => {
    expect(decodeCursor(encodeCursor([key[0]], scope), scope, keySchema)).toEqual({ ok: false })
  })

  it.each([
    ['the filter', { ...scope, category: 'food' }],
    ['the language', { ...scope, lang: 'de' }],
    ['the route', { ...scope, route: 'keepsakes' }],
    ['a sort', { ...scope, sort: 'oldest' }],
  ])('refuses a cursor made for another %s', (_name, other) => {
    expect(decodeCursor(encodeCursor(key, scope), other, keySchema)).toEqual({ ok: false })
  })

  it('cursorProblem answers 400 validation-failed on the cursor query parameter', async () => {
    const { app } = createGuardedApp({})
    app.get('/probe', c => cursorProblem(c))

    const response = await app.request('/probe')

    expect(response.status).toBe(400)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(await response.json()).toMatchObject({ type: 'validation-failed', status: 400, errors: [{ in: 'query', path: 'cursor' }] })
  })
})
