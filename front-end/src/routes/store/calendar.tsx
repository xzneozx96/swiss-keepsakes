import { createFileRoute } from '@tanstack/react-router'

import { CalendarPage } from '@/features/merchant/calendar/calendar-page'

// Calendar: every tour departure and keepsake pickup by day, week or month, for Owner and
// Manager alike (owner review 15.10.2026).
export const Route = createFileRoute('/store/calendar')({
  component: CalendarPage,
})
