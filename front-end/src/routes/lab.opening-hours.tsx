import { createFileRoute } from '@tanstack/react-router'

import { OpeningHoursLab } from '@/features/lab/opening-hours/opening-hours-lab'
import { noIndexHead } from '@/lib/no-index'

/** Lab: four ways to edit a place's weekly opening hours (place editor, step When). Not part of the product. */
export const Route = createFileRoute('/lab/opening-hours')({
  ssr: false,
  head: noIndexHead,
  component: OpeningHoursLab,
})
