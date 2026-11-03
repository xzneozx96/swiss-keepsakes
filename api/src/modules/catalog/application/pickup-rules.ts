import type { Localized, PickupSpan } from '../ports.ts'

// The rules for a pickup point (E6.6, gate G-S8-D5). Pure: the use cases call them and the database CHECKs are the backstop.
// A span closing before it opens closes the next morning; opens equal to closes is refused; 24:00 may close but not open.

// The most points one store holds, archived ones included. The contract's PICKUP_MAX_PLACES caps the order body at the same number; a test keeps the two equal.
export const PICKUP_MAX_PLACES = 100

export interface PickupError { path: string, message: string }
export interface PickupTextInput { name: Localized, address: Localized, instructions?: Localized | undefined }
export interface PickupText { name: Localized, address: Localized, instructions: Localized | null }

const opening = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const closing = /^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/

export function checkHours(spans: readonly PickupSpan[]): PickupError[] {
  const errors: PickupError[] = []
  const seen = new Set<string>()
  spans.forEach((span, index) => {
    const at = `hours.${index}`
    if (!Number.isInteger(span.weekday) || span.weekday < 1 || span.weekday > 7)
      errors.push({ path: `${at}.weekday`, message: 'The weekday is 1 (Monday) to 7 (Sunday)' })
    const opensOk = opening.test(span.opens)
    const closesOk = closing.test(span.closes)
    if (!opensOk)
      errors.push({ path: `${at}.opens`, message: 'The opening time is HH:MM, from 00:00 to 23:59' })
    if (!closesOk)
      errors.push({ path: `${at}.closes`, message: 'The closing time is HH:MM, or 24:00' })
    if (opensOk && closesOk) {
      if (span.opens === span.closes)
        errors.push({ path: `${at}.closes`, message: 'The closing time cannot equal the opening time' })
      // The primary key (place_id, weekday, opens) makes a repeated start time on one day impossible, so it is a 422 on that span and not an overlap rule.
      const key = `${span.weekday}|${span.opens}`
      if (seen.has(key))
        errors.push({ path: `${at}.opens`, message: 'Two spans on one day cannot open at the same time' })
      seen.add(key)
    }
  })
  return errors
}

function clean(text: Localized): Localized {
  const out: Localized = {}
  const en = text.en?.trim()
  const de = text.de?.trim()
  if (en)
    out.en = en
  if (de)
    out.de = de
  return out
}

const isBlank = (text: Localized) => text.en === undefined && text.de === undefined

export function checkPickupText(input: PickupTextInput): { value: PickupText } | { errors: PickupError[] } {
  const name = clean(input.name)
  const address = clean(input.address)
  const instructions = input.instructions ? clean(input.instructions) : {}
  const errors: PickupError[] = []
  if (isBlank(name))
    errors.push({ path: 'name', message: 'Give the name in English or German' })
  if (isBlank(address))
    errors.push({ path: 'address', message: 'Give the address in English or German' })
  if (errors.length > 0)
    return { errors }
  return { value: { name, address, instructions: isBlank(instructions) ? null : instructions } }
}
