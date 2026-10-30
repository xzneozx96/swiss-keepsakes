import type { Actor } from '@sk/domain/identity'
import type { AddressRegister, RegisteredBuilding } from '../../../src/modules/content/ports.ts'
import { describe, expect, it } from 'vitest'
import { makeFindAddressAt } from '../../../src/modules/content/application/find-address-at.ts'

const store = 'store-1'
const owner: Actor = { kind: 'staff', userId: 'u1', guestId: 'g1', stores: new Map([[store, 'owner']]) }
const elsewhere: Actor = { kind: 'staff', userId: 'u2', guestId: 'g2', stores: new Map([['store-2', 'owner']]) }
const guest: Actor = { kind: 'guest', userId: 'u3', guestId: 'g3' }
const pin = { latitude: 47.0516489, longitude: 8.3075351 }

const building = (over: Partial<RegisteredBuilding> = {}): RegisteredBuilding => ({ street: 'Kapellbrücke', houseNumber: '1', postcode: '6004', city: 'Luzern', latitude: 47.0516489, longitude: 8.3075351, ...over })
// About 11 m per 0.0001 degrees of latitude.
const north = (meters: number) => ({ latitude: pin.latitude + meters / 111_320, longitude: pin.longitude })

function setup(answer: RegisteredBuilding[] | undefined) {
  const asked: { latitude: number, longitude: number, radiusMeters: number, timeoutMs: number }[] = []
  const register: AddressRegister = {
    buildingsNear: async (latitude, longitude, radiusMeters, timeoutMs) => {
      asked.push({ latitude, longitude, radiusMeters, timeoutMs })
      return answer
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

  it('says address-lookup-unavailable when the register could not be read', async () => {
    expect(await setup(undefined).find(owner, store, pin)).toEqual({ ok: false, reason: 'address-lookup-unavailable' })
  })

  it('refuses a guest and a member of another store, and never asks the register', async () => {
    const s = setup([building()])
    expect(await s.find(guest, store, pin)).toEqual({ ok: false, reason: 'forbidden' })
    expect(await s.find(elsewhere, store, pin)).toEqual({ ok: false, reason: 'forbidden' })
    expect(s.asked).toEqual([])
  })
})
