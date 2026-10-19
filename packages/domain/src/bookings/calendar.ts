import type { TourBooking } from './types'

const NEWLINES = /\n/g
const ICS_ESCAPED_CHAR = /[\\;,]/g
const MILLISECONDS = /\.\d{3}/
const DATE_SEPARATORS = /[-:]/g

function stamp(iso: string) {
  return new Date(iso)
    .toISOString()
    .replace(DATE_SEPARATORS, '')
    .replace(MILLISECONDS, '')
}

// RFC 5545 text values escape backslash, semicolon, comma and line breaks.
function escape(text: string) {
  return text.replace(ICS_ESCAPED_CHAR, c => `\\${c}`).replace(NEWLINES, '\\n')
}

/** C13 "Add to calendar": a one-event iCalendar file for the departure, as a data URL. */
export function calendarHref(
  booking: TourBooking,
  text: { name: string, place: string, note: string },
): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Swiss Keepsakes//Tour booking//EN',
    'BEGIN:VEVENT',
    `UID:${booking.id}@swisskeepsakes.example`,
    `DTSTAMP:${stamp(booking.createdAt)}`,
    `DTSTART:${stamp(booking.startsAt)}`,
    `DTEND:${stamp(booking.endsAt)}`,
    `SUMMARY:${escape(text.name)}`,
    `LOCATION:${escape(text.place)}`,
    `DESCRIPTION:${escape(text.note)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`
}
