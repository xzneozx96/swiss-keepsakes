import { describe, expect, it } from 'vitest'
import { checkHours, checkPickupText } from '../../../src/modules/catalog/application/pickup-rules.ts'

const span = (weekday: number, opens: string, closes: string) => ({ weekday, opens, closes })

describe('pickup hours rules [E6.6][AC26]', () => {
  it('accepts a plain day span', () => {
    expect(checkHours([span(1, '10:00', '18:00')])).toEqual([])
  })

  it('names the day for weekday 8 and 0', () => {
    expect(checkHours([span(8, '10:00', '18:00')])).toEqual([{ path: 'hours.0.weekday', message: expect.any(String) }])
    expect(checkHours([span(1, '10:00', '18:00'), span(0, '10:00', '18:00')])[0]?.path).toBe('hours.1.weekday')
  })

  it('accepts a span that closes the next morning', () => {
    expect(checkHours([span(1, '18:00', '10:00')])).toEqual([])
    expect(checkHours([span(7, '22:00', '02:00')])).toEqual([])
  })

  it('refuses opens equal to closes', () => {
    expect(checkHours([span(1, '10:00', '10:00')])).toEqual([{ path: 'hours.0.closes', message: expect.any(String) }])
  })

  it('accepts 24:00 as closing and refuses it as opening', () => {
    expect(checkHours([span(1, '22:00', '24:00')])).toEqual([])
    expect(checkHours([span(1, '24:00', '10:00')])[0]?.path).toBe('hours.0.opens')
  })

  it('refuses a badly formed time', () => {
    expect(checkHours([span(1, '9:5', '10:00')])[0]?.path).toBe('hours.0.opens')
    expect(checkHours([span(1, '09:00', '25:00')])[0]?.path).toBe('hours.0.closes')
  })

  it('accepts several spans on one day, overlapping too', () => {
    expect(checkHours([span(1, '09:00', '12:00'), span(1, '14:00', '18:00')])).toEqual([])
    expect(checkHours([span(1, '09:00', '14:00'), span(1, '12:00', '18:00')])).toEqual([])
  })

  it('refuses the same day and the same opens twice', () => {
    expect(checkHours([span(1, '09:00', '12:00'), span(1, '09:00', '18:00')])).toEqual([{ path: 'hours.1.opens', message: expect.any(String) }])
  })

  it('accepts no hours', () => {
    expect(checkHours([])).toEqual([])
  })
})

describe('pickup text rules [E6.6][AC26]', () => {
  it('names name and address when both languages are blank', () => {
    const result = checkPickupText({ name: { en: ' ', de: '' }, address: {}, instructions: undefined })
    expect(result).toEqual({ errors: [{ path: 'name', message: expect.any(String) }, { path: 'address', message: expect.any(String) }] })
  })

  it('accepts German only for one and English only for the other', () => {
    expect(checkPickupText({ name: { de: 'Laden' }, address: { en: 'Street' } })).toEqual({
      value: { name: { de: 'Laden' }, address: { en: 'Street' }, instructions: null },
    })
  })

  it('trims text and drops blank keys', () => {
    expect(checkPickupText({ name: { en: '  Shop ', de: '  ' }, address: { en: 'A' }, instructions: { en: ' Ring ' } })).toEqual({
      value: { name: { en: 'Shop' }, address: { en: 'A' }, instructions: { en: 'Ring' } },
    })
  })

  it('turns blank instructions into null', () => {
    expect(checkPickupText({ name: { en: 'S' }, address: { en: 'A' }, instructions: { en: ' ', de: '' } })).toMatchObject({ value: { instructions: null } })
  })
})
