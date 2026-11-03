import { pickupPlaceOrderBodySchema, pickupPlacePatchBodySchema, pickupPlaceWriteBodySchema } from '@sk/api-contract'
import { describe, expect, it } from 'vitest'

const accepts = (schema: { safeParse: (input: unknown) => { success: boolean } }, input: unknown) => schema.safeParse(input).success
const uuid = '3f1c1d0e-8a57-4c0e-9b8e-000000000001'
const place = (over: object = {}) => ({ name: { en: 'Shop' }, address: { de: 'Strasse 1' }, mapsLink: 'https://maps.app.goo.gl/AbCdEf123', hours: [{ weekday: 1, opens: '10:00', closes: '18:00' }], ...over })

describe('pickup point schemas [E6.6][AC26]', () => {
  it('accepts a point with hours and no instructions', () => {
    expect(accepts(pickupPlaceWriteBodySchema, place())).toBe(true)
  })

  it('rejects an unknown key', () => {
    expect(accepts(pickupPlaceWriteBodySchema, place({ extra: 1 }))).toBe(false)
    expect(accepts(pickupPlaceWriteBodySchema, place({ name: { en: 'x', fr: 'y' } }))).toBe(false)
  })

  it('leaves range checks on the span to the use case', () => {
    expect(accepts(pickupPlaceWriteBodySchema, place({ hours: [{ weekday: 8, opens: '9:5', closes: '10:00' }] }))).toBe(true)
  })

  it('accepts blank text and refuses overlong text and 36 spans', () => {
    expect(accepts(pickupPlaceWriteBodySchema, place({ name: { en: '' } }))).toBe(true)
    expect(accepts(pickupPlaceWriteBodySchema, place({ name: { en: 'x'.repeat(121) } }))).toBe(false)
    expect(accepts(pickupPlaceWriteBodySchema, place({ address: { en: 'x'.repeat(301) } }))).toBe(false)
    expect(accepts(pickupPlaceWriteBodySchema, place({ instructions: { en: 'x'.repeat(601) } }))).toBe(false)
    const span = { weekday: 1, opens: '10:00', closes: '11:00' }
    expect(accepts(pickupPlaceWriteBodySchema, place({ hours: Array.from({ length: 35 }).fill(span) }))).toBe(true)
    expect(accepts(pickupPlaceWriteBodySchema, place({ hours: Array.from({ length: 36 }).fill(span) }))).toBe(false)
  })

  it('refuses a NUL in text', () => {
    expect(accepts(pickupPlaceWriteBodySchema, place({ name: { en: 'a\u0000b' } }))).toBe(false)
  })

  it('the patch needs at least one field', () => {
    expect(accepts(pickupPlacePatchBodySchema, {})).toBe(false)
    expect(accepts(pickupPlacePatchBodySchema, { hours: [] })).toBe(true)
    expect(accepts(pickupPlacePatchBodySchema, { name: { de: 'Laden' } })).toBe(true)
  })

  it('requires a Google Maps link on create and takes only a Google Maps link [S8-PICKUP-MAPS]', () => {
    const { mapsLink: _left, ...without } = place() as { mapsLink: string }
    expect(accepts(pickupPlaceWriteBodySchema, without)).toBe(false)
    expect(accepts(pickupPlaceWriteBodySchema, place({ mapsLink: null }))).toBe(false)
    for (const good of ['https://maps.app.goo.gl/AbCdEf123', 'https://goo.gl/maps/AbCdEf123', 'https://www.google.com/maps/place/Lucerne/@47.05,8.3,17z', 'https://www.google.ch/maps?q=47.05,8.3'])
      expect(accepts(pickupPlaceWriteBodySchema, place({ mapsLink: good })), good).toBe(true)
    for (const bad of ['', 'http://maps.app.goo.gl/AbCdEf123', 'https://evil.example/maps/abc', 'https://www.google.com/search?q=x', 'https://maps.app.goo.gl/a b', `https://maps.app.goo.gl/${'a'.repeat(2000)}`, 'https://user@maps.app.goo.gl/abc'])
      expect(accepts(pickupPlaceWriteBodySchema, place({ mapsLink: bad })), bad).toBe(false)
  })

  it('takes no position on its own: the server reads it from the link [S8-PICKUP-MAPS]', () => {
    expect(accepts(pickupPlaceWriteBodySchema, place({ latitude: 47, longitude: 8 }))).toBe(false)
    expect(accepts(pickupPlacePatchBodySchema, { latitude: 47 })).toBe(false)
  })

  it('the patch takes a link on its own, and never null [S8-PICKUP-MAPS]', () => {
    expect(accepts(pickupPlacePatchBodySchema, { mapsLink: 'https://maps.app.goo.gl/AbCdEf123' })).toBe(true)
    expect(accepts(pickupPlacePatchBodySchema, { mapsLink: null })).toBe(false)
    expect(accepts(pickupPlacePatchBodySchema, { mapsLink: 'https://evil.example/maps/x' })).toBe(false)
  })

  it('the order body takes uuids only', () => {
    expect(accepts(pickupPlaceOrderBodySchema, { ids: [uuid] })).toBe(true)
    expect(accepts(pickupPlaceOrderBodySchema, { ids: ['nope'] })).toBe(false)
  })
})
