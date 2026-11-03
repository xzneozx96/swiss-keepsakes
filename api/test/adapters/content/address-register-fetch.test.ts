import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createAddressRegister } from '../../../src/modules/content/adapters/address-register-fetch.ts'

// A response recorded from api3.geo.admin.ch on 2026-10-30 for the Kapellbrücke pin (47.0516489, 8.3075351).
const recorded = readFileSync(new URL('../../fixtures/geo-admin-identify-kapellbruecke.json', import.meta.url), 'utf8')
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('the fetch behind the federal building register', () => {
  it('asks the identify service of geo.admin.ch for the GWR layer, with no redirect following and a time limit', async () => {
    const calls: { input: unknown, init: RequestInit | undefined }[] = []
    const register = createAddressRegister(async (input, init) => {
      calls.push({ input, init })
      return new Response(recorded, { status: 200 })
    })

    await register.buildingsNear(47.0516489, 8.3075351, 50, 3000)

    expect(calls).toHaveLength(1)
    const url = new URL(String(calls[0]!.input))
    expect(url.origin + url.pathname).toBe('https://api3.geo.admin.ch/rest/services/api/MapServer/identify')
    expect(url.searchParams.get('layers')).toBe('all:ch.bfs.gebaeude_wohnungs_register')
    expect(url.searchParams.get('geometry')).toBe('8.3075351,47.0516489')
    expect(url.searchParams.get('sr')).toBe('4326')
    expect(url.searchParams.get('returnGeometry')).toBe('true')
    expect(calls[0]!.init).toMatchObject({ redirect: 'manual' })
    expect(calls[0]!.init?.signal).toBeInstanceOf(AbortSignal)
  })

  it('asks for a window in which the pixel tolerance is the radius in metres, on both axes', async () => {
    let url = new URL('https://invalid.example')
    const register = createAddressRegister(async (input) => {
      url = new URL(String(input))
      return json({ results: [] })
    })
    await register.buildingsNear(47.0516489, 8.3075351, 50, 3000)

    const [west, south, east, north] = url.searchParams.get('mapExtent')!.split(',').map(Number) as [number, number, number, number]
    const [width, height] = url.searchParams.get('imageDisplay')!.split(',').map(Number) as [number, number]
    const tolerance = Number(url.searchParams.get('tolerance'))
    const metersPerPixelNorth = (north - south) * 111_320 / height
    const metersPerPixelEast = (east - west) * 111_320 * Math.cos(47.0516489 * Math.PI / 180) / width
    expect(tolerance * metersPerPixelNorth).toBeCloseTo(50, 0)
    expect(tolerance * metersPerPixelEast).toBeCloseTo(50, 0)
  })

  it('reads the street, number, postcode, city and position of each entrance of a recorded answer', async () => {
    const buildings = await createAddressRegister(async () => new Response(recorded, { status: 200 })).buildingsNear(47.0516489, 8.3075351, 50, 3000)

    expect(buildings).toHaveLength(6)
    expect(buildings).toContainEqual({ street: 'Kapellbrücke', houseNumber: '1', postcode: '6004', city: 'Luzern', latitude: 47.051283, longitude: 8.307243 })
    expect(buildings).toContainEqual({ street: 'Rathausquai', houseNumber: '6', postcode: '6004', city: 'Luzern', latitude: expect.any(Number), longitude: expect.any(Number) })
  })

  it('skips an entrance with no street name and keeps the rest', async () => {
    const hit = (strname: string[]) => ({ geometry: { x: 8.3, y: 47.0 }, attributes: { strname, deinr: null, dplz4: 6004, dplzname: 'Luzern' } })
    const buildings = await createAddressRegister(async () => json({ results: [hit([]), hit(['']), hit(['Seestrasse'])] })).buildingsNear(47, 8.3, 50, 3000)
    expect(buildings).toEqual([{ street: 'Seestrasse', houseNumber: '', postcode: '6004', city: 'Luzern', latitude: 47, longitude: 8.3 }])
  })

  it('answers an empty list when nothing is near', async () => {
    expect(await createAddressRegister(async () => json({ results: [] })).buildingsNear(47, 8.3, 50, 3000)).toEqual([])
  })

  it.each([
    ['a failed request', async () => {
      throw new TypeError('fetch failed')
    }],
    ['a 500', async () => new Response('oops', { status: 500 })],
    ['a redirect', async () => new Response(null, { status: 302, headers: { Location: 'https://evil.example/' } })],
    ['a body that is not JSON', async () => new Response('<html>', { status: 200 })],
    ['a body without results', async () => json({ error: 'nope' })],
  ])('is undefined for %s', async (_name, answer) => {
    expect(await createAddressRegister(answer).buildingsNear(47, 8.3, 50, 3000)).toBeUndefined()
  })

  it('is undefined when the time runs out, and aborts the request', async () => {
    let aborted = false
    const register = createAddressRegister((_input, init) => new Promise((_resolve, reject) => {
      init!.signal!.addEventListener('abort', () => {
        aborted = true
        reject(init!.signal!.reason)
      })
    }))
    expect(await register.buildingsNear(47, 8.3, 50, 20)).toBeUndefined()
    expect(aborted).toBe(true)
  })
})
