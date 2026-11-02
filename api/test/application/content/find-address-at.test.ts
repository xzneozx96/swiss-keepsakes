import type { Actor } from '@sk/domain/identity'
import type { AddressRegister, RegisteredBuilding } from '../../../src/modules/content/ports.ts'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createAddressRegister } from '../../../src/modules/content/adapters/address-register-fetch.ts'
import { makeFindAddressAt } from '../../../src/modules/content/application/find-address-at.ts'

const store = 'store-1'
const owner: Actor = { kind: 'staff', userId: 'u1', guestId: 'g1', stores: new Map([[store, 'owner']]) }
const elsewhere: Actor = { kind: 'staff', userId: 'u2', guestId: 'g2', stores: new Map([['store-2', 'owner']]) }
const guest: Actor = { kind: 'guest', userId: 'u3', guestId: 'g3' }
const pin = { latitude: 47.0516489, longitude: 8.3075351 }

const building = (over: Partial<RegisteredBuilding> = {}): RegisteredBuilding => ({ street: 'Kapellbrücke', houseNumber: '1', postcode: '6004', city: 'Luzern', latitude: 47.0516489, longitude: 8.3075351, ...over })
// About 11 m per 0.0001 degrees of latitude.
const north = (meters: number) => ({ latitude: pin.latitude + meters / 111_320, longitude: pin.longitude })

function setup(...answers: (RegisteredBuilding[] | undefined)[]) {
  const asked: { latitude: number, longitude: number, radiusMeters: number, timeoutMs: number }[] = []
  const register: AddressRegister = {
    buildingsNear: async (latitude, longitude, radiusMeters, timeoutMs) => {
      asked.push({ latitude, longitude, radiusMeters, timeoutMs })
      return answers[Math.min(asked.length, answers.length) - 1]
    },
  }
  return { asked, find: makeFindAddressAt({ register }) }
}

describe('finding the address at a pin', () => {
  it('answers the address of the building at the pin, formatted on one line', async () => {
    const s = setup([building()])
    expect(await s.find(owner, store, pin)).toEqual({ ok: true, value: { street: 'Kapellbrücke', houseNumber: '1', postcode: '6004', city: 'Luzern', formatted: 'Kapellbrücke 1, 6004 Luzern' } })
    expect(s.asked).toEqual([{ ...pin, radiusMeters: 50, timeoutMs: 3000 }])
  })

  it('picks the nearest entrance, whatever the order the register answers in', async () => {
    const s = setup([
      building({ street: 'Rathausquai', houseNumber: '6', ...north(45) }),
      building({ street: 'Kapellbrücke', houseNumber: '1', ...north(12) }),
      building({ street: 'Rathausquai', houseNumber: '7', ...north(30) }),
    ])
    expect(await s.find(owner, store, pin)).toMatchObject({ ok: true, value: { formatted: 'Kapellbrücke 1, 6004 Luzern' } })
  })

  it('keeps an entrance 46 m away and drops one 60 m away', async () => {
    expect(await setup([building(north(46))]).find(owner, store, pin)).toMatchObject({ ok: true })
    expect(await setup([building(north(60))]).find(owner, store, pin)).toEqual({ ok: false, reason: 'address-not-found' })
  })

  it('leaves out the number when the register has none', async () => {
    expect(await setup([building({ houseNumber: '' })]).find(owner, store, pin)).toMatchObject({ ok: true, value: { houseNumber: '', formatted: 'Kapellbrücke, 6004 Luzern' } })
  })

  it('says address-not-found when no building stands near, a viewpoint or a bench', async () => {
    expect(await setup([]).find(owner, store, pin)).toEqual({ ok: false, reason: 'address-not-found' })
  })

  it('says address-lookup-unavailable when the register could not be read twice, each ask with its own 3 s limit', async () => {
    const s = setup(undefined, undefined)

    expect(await s.find(owner, store, pin)).toEqual({ ok: false, reason: 'address-lookup-unavailable' })
    expect(s.asked.map(ask => ask.timeoutMs)).toEqual([3000, 3000])
  })

  it('asks once more when the first ask fails, and answers from the second', async () => {
    const s = setup(undefined, [building()])

    expect(await s.find(owner, store, pin)).toMatchObject({ ok: true, value: { formatted: 'Kapellbrücke 1, 6004 Luzern' } })
    expect(s.asked).toHaveLength(2)
  })

  it('does not ask again for an answer: no building near is final, and a first answer is not repeated', async () => {
    const none = setup([])
    const found = setup([building()])

    expect(await none.find(owner, store, pin)).toEqual({ ok: false, reason: 'address-not-found' })
    await found.find(owner, store, pin)
    expect(none.asked).toHaveLength(1)
    expect(found.asked).toHaveLength(1)
  })

  it('refuses a guest and a member of another store, and never asks the register', async () => {
    const s = setup([building()])
    expect(await s.find(guest, store, pin)).toEqual({ ok: false, reason: 'forbidden' })
    expect(await s.find(elsewhere, store, pin)).toEqual({ ok: false, reason: 'forbidden' })
    expect(s.asked).toEqual([])
  })

  // The answer recorded from geo.admin.ch for the Kapellbrücke pin lists Rathausquai 7 and Kapellbrücke 1.2 before
  // Kapellbrücke 1, and the register does not sort by distance. Measured from the pin (about 46 m, 49 m and 53 m), the
  // nearest entrance is Kapellbrücke 1.
  it.each([
    ['the pin of the Google Maps link', 47.0516489, 8.3075351],
    ['the same pin rounded to 4 decimals', 47.0516, 8.3074],
  ])('answers Kapellbrücke 1 for %s, from the recorded register answer', async (_name, latitude, longitude) => {
    const recorded = readFileSync(new URL('../../fixtures/geo-admin-identify-kapellbruecke.json', import.meta.url), 'utf8')
    const register = createAddressRegister(async () => new Response(recorded, { status: 200 }))

    expect(await makeFindAddressAt({ register })(owner, store, { latitude, longitude })).toEqual({
      ok: true,
      value: { street: 'Kapellbrücke', houseNumber: '1', postcode: '6004', city: 'Luzern', formatted: 'Kapellbrücke 1, 6004 Luzern' },
    })
  })
})
