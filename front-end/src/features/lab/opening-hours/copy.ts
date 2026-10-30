/** Every string of the opening hours lab, English only, kept in one place. */
export const copy = {
  back: 'Lab',
  title: 'Opening hours editor',
  intro: 'Option A of four was chosen on 30.10.2026 and built into the place editor (features/places/components/hours-rows.tsx). It stays here as the reference: the same weekly hours as form.hours (HoursSpan[]: day 1 to 7, opens, closes; several spans per day; no span means closed), shown under the rows.',
  practiceTitle: 'Common practice this draws on',
  practice: [
    'Calendly availability: a row per weekday with a switch, one or more ranges, a + for another range and a copy-to-days menu.',
    'Google Business Profile: a row per day with an open/closed toggle, several ranges and “Add hours”.',
  ],
  samePrefix: 'Resulting HoursSpan[]',
  spansUnit: (n: number) => `${n} span${n === 1 ? '' : 's'}`,
  reset: 'Reset sample week',
  options: {
    a: { id: 'A', title: 'Compact week rows', why: 'Chosen 30.10.2026. One 44 px row per day in one card: a switch, the range, + for a split day, and copy to other days. The Calendly and Google pattern; the most familiar.' },
  },
  days: { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' } as Record<number, string>,
  dayNames: { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday' } as Record<number, string>,
  open: 'Open',
  closed: 'Closed',
  opens: 'Opens',
  closes: 'Closes',
  addRange: 'Add a second range',
  removeRange: 'Remove range',
  copyTo: 'Copy to other days',
  copyDays: 'Copy these hours to',
  copyApply: 'Apply',
  timeFieldLabel: (day: string, what: string) => `${day} ${what}`,
}
