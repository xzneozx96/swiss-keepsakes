import type { Time } from '@internationalized/date'

import { parseTime } from '@internationalized/date'

/**
 * The `HH:mm` text the form holds, as the value a time input takes. Empty or unreadable text is no time. A closing
 * time of `24:00` (midnight, which the API accepts) shows as 00:00, as a time input cannot hold hour 24.
 */
export function timeOf(text: string, closing = false): Time | null {
  try {
    return parseTime(closing && text === '24:00' ? '00:00' : text)
  }
  catch {
    return null
  }
}

/** The time input's value back to `HH:mm` text. No time is empty text. A closing time of 00:00 is midnight, so `24:00`. */
export function textOf(time: Time | null, closing = false): string {
  if (time === null)
    return ''
  const text = time.toString().slice(0, 5)

  return closing && text === '00:00' ? '24:00' : text
}
