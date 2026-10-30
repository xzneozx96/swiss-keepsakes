import { describe, expect, it } from 'vitest'
import { createMapsLinks } from '../../../src/modules/content/adapters/maps-link-fetch.ts'

const url = new URL('https://maps.app.goo.gl/AbCdEf123')

describe('the fetch behind a Google Maps short link', () => {
  it('asks with HEAD and no redirect following, and hands back the status and the Location', async () => {
    const calls: { input: unknown, init: RequestInit | undefined }[] = []
    const links = createMapsLinks(async (input, init) => {
      calls.push({ input, init })
      return new Response(null, { status: 302, headers: { Location: 'https://www.google.com/maps/@47,8,1z' } })
    })

    expect(await links.step(url, 3000)).toEqual({ status: 302, location: 'https://www.google.com/maps/@47,8,1z' })
    expect(calls).toHaveLength(1)
    expect(calls[0]!.input).toBe(url)
    expect(calls[0]!.init).toMatchObject({ method: 'HEAD', redirect: 'manual' })
    expect(calls[0]!.init?.signal).toBeInstanceOf(AbortSignal)
  })

  it('does not read the body: it cancels it', async () => {
    let cancelled = false
    const body = new ReadableStream({ cancel: () => void (cancelled = true) })
    const links = createMapsLinks(async () => new Response(body, { status: 200 }))

    expect(await links.step(url, 3000)).toEqual({ status: 200, location: null })
    expect(cancelled).toBe(true)
  })

  it('is undefined when the request fails', async () => {
    const links = createMapsLinks(async () => {
      throw new TypeError('fetch failed')
    })
    expect(await links.step(url, 3000)).toBeUndefined()
  })

  it('is undefined when the time runs out, and aborts the request', async () => {
    let aborted = false
    const links = createMapsLinks((_input, init) => new Promise((_resolve, reject) => {
      init!.signal!.addEventListener('abort', () => {
        aborted = true
        reject(init!.signal!.reason)
      })
    }))

    expect(await links.step(url, 20)).toBeUndefined()
    expect(aborted).toBe(true)
  })
})
