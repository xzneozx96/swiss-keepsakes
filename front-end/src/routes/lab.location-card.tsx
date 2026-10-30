import { createFileRoute } from '@tanstack/react-router'

import { LocationCardLab } from '@/features/lab/location-card/location-card-lab'
import { noIndexHead } from '@/lib/no-index'

/** Lab: three layouts for the place editor's “Location on the map” card. Not part of the product. */
export const Route = createFileRoute('/lab/location-card')({
  ssr: false,
  head: noIndexHead,
  component: LocationCardLab,
})
