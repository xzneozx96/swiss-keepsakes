import { createFileRoute } from '@tanstack/react-router'

import { CalendarLab } from '@/features/lab/calendar/calendar-lab'
import { noIndexHead } from '@/lib/no-index'

export const Route = createFileRoute('/lab/calendar')({
  ssr: false,
  head: noIndexHead,
  component: CalendarLab,
})
