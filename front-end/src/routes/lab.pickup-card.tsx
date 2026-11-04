import { createFileRoute } from '@tanstack/react-router'

import { PickupCardLab } from '@/features/lab/pickup-card/pickup-card-lab'
import { noIndexHead } from '@/lib/no-index'

/** Lab: the merchant's pickup points as a table. Not part of the product. */
export const Route = createFileRoute('/lab/pickup-card')({
  ssr: false,
  head: noIndexHead,
  component: PickupCardLab,
})
