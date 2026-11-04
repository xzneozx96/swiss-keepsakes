import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { conditionalJson } from '../../../src/platform/http/conditional-json.ts'

const app = new Hono().get('/x', c => conditionalJson(c, { a: 1 }, 'max-age=7'))

describe('[E2.12] conditionalJson', () => {
  it('answers 200 with the given Cache-Control and a strong ETag, then 304 with no body for that tag, weak or in a list', async () => {
    const first = await app.request('/x')
    const tag = first.headers.get('ETag')!

    expect(first.status).toBe(200)
    expect(first.headers.get('Cache-Control')).toBe('max-age=7')
    expect(tag).toMatch(/^"[0-9a-f]{64}"$/)
    expect(await first.json()).toEqual({ a: 1 })
    for (const header of [tag, `W/${tag}`, `"other", ${tag}`, '*']) {
      const again = await app.request('/x', { headers: { 'If-None-Match': header } })
      expect(again.status, header).toBe(304)
      expect(await again.text()).toBe('')
    }
    expect((await app.request('/x', { headers: { 'If-None-Match': '"nope"' } })).status).toBe(200)
  })
})
