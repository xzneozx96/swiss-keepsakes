import type { PickupPlace } from '@sk/api-contract'
import { pickupPlaceWriteBodySchema } from '@sk/api-contract'
import { describe, expect, it } from 'vitest'

import { bodyOf, emptyForm, formOf, languagesOf, pickupErrors } from '@/features/pickup/lib/form'

const place: PickupPlace = {
  id: '0198a000-0000-7000-8000-000000000001',
  storeId: '0198a000-0000-7000-8000-000000000002',
  name: { en: 'Shop', de: 'Laden' },
  address: { en: 'Hertensteinstrasse 1' },
  instructions: null,
  position: 0,
  archived: false,
  hours: [{ weekday: 1, opens: '09:00', closes: '12:00' }, { weekday: 1, opens: '14:00', closes: '18:00' }],
  rowVersion: 3,
  mapsLink: 'https://www.google.com/maps/place/Shop/@47.05165,8.30754,17z',
  latitude: 47.05165,
  longitude: 8.30754,
}

const link = 'https://maps.app.goo.gl/abc'
const filled = () => ({ ...emptyForm(), name: { en: '', de: 'Laden' }, address: { en: '', de: 'Strasse 1' }, mapsLink: link })

describe('[E6.6][AC26] pickup form', () => {
  it('maps a place to the form, weekday to day, and blank instructions for null', () => {
    const form = formOf(place)

    expect(form.name).toEqual({ en: 'Shop', de: 'Laden' })
    expect(form.address).toEqual({ en: 'Hertensteinstrasse 1', de: '' })
    expect(form.instructions).toEqual({ en: '', de: '' })
    expect(form.mapsLink).toBe(place.mapsLink)
    expect(form.position).toEqual({ lat: 47.05165, lng: 8.30754 })
    expect(form.hours.map(({ day, opens, closes }) => ({ day, opens, closes }))).toEqual([
      { day: 1, opens: '09:00', closes: '12:00' },
      { day: 1, opens: '14:00', closes: '18:00' },
    ])
    expect(new Set(form.hours.map(s => s.key)).size).toBe(2)
  })

  it('bodyOf trims, drops blank keys, renames day to weekday and keeps span order', () => {
    const form = { ...filled(), name: { en: '  ', de: ' Laden ' }, hours: [
      { key: 'a', day: 2, opens: '14:00', closes: '18:00' },
      { key: 'b', day: 1, opens: '22:00', closes: '02:00' },
    ] }
    const body = bodyOf(form)

    expect(body).toEqual({
      name: { de: 'Laden' },
      address: { de: 'Strasse 1' },
      instructions: {},
      mapsLink: link,
      hours: [
        { weekday: 2, opens: '14:00', closes: '18:00' },
        { weekday: 1, opens: '22:00', closes: '02:00' },
      ],
    })
    expect(pickupPlaceWriteBodySchema.safeParse(body).success).toBe(true)
  })

  it('round trips', () => {
    const body = bodyOf(formOf(place))

    expect(bodyOf(formOf({ ...place, ...body, instructions: body.instructions ?? null }))).toEqual(body)
    expect(body.hours).toEqual(place.hours)
  })

  it('needs a name and an address in one language, blank counts as missing', () => {
    expect(pickupErrors(emptyForm())).toMatchObject({ name: true, address: true, mapsLink: true, count: 3 })
    expect(pickupErrors({ ...emptyForm(), name: { en: ' ', de: '' }, address: { en: 'x', de: '' }, mapsLink: link })).toMatchObject({ name: true, address: false, mapsLink: false, count: 1 })
    expect(pickupErrors(filled())).toEqual({ name: false, address: false, mapsLink: false, hours: {}, count: 0 })
  })

  it('needs a Google Maps link, and a blank one counts as missing', () => {
    expect(pickupErrors({ ...filled(), mapsLink: '' })).toMatchObject({ mapsLink: true, count: 1 })
    expect(pickupErrors({ ...filled(), mapsLink: '  ' })).toMatchObject({ mapsLink: true, count: 1 })
  })

  it('refuses spans through the shared hours rules and counts them', () => {
    const form = { ...filled(), hours: [
      { key: 'a', day: 1, opens: '10:00', closes: '10:00' },
      { key: 'b', day: 1, opens: '10:', closes: '12:00' },
      { key: 'c', day: 1, opens: '22:00', closes: '02:00' },
    ] }

    expect(pickupErrors(form)).toEqual({
      name: false,
      address: false,
      mapsLink: false,
      hours: { a: 'places.error.hoursSame', b: 'places.error.hoursMissing' },
      count: 2,
    })
  })

  it('refuses a second span that opens at the same time on the same day, as the API does, and not on another day', () => {
    const form = { ...filled(), hours: [
      { key: 'a', day: 1, opens: '10:00', closes: '12:00' },
      { key: 'b', day: 1, opens: '10:00', closes: '18:00' },
      { key: 'c', day: 2, opens: '10:00', closes: '12:00' },
      { key: 'd', day: 1, opens: '10:00', closes: '10:00' },
    ] }

    expect(pickupErrors(form)).toMatchObject({
      hours: { b: 'pickup.error.hoursRepeat', d: 'places.error.hoursSame' },
      count: 2,
    })
  })

  it('reports the languages a point is complete in', () => {
    expect(languagesOf(filled())).toBe('en-missing')
    expect(languagesOf(formOf(place))).toBe('de-missing')
    expect(languagesOf(formOf({ ...place, address: { en: 'a', de: 'b' } }))).toBe('complete')
    expect(languagesOf(emptyForm())).toBe('incomplete')
  })
})
