import { createFileRoute } from '@tanstack/react-router'

import { PickupCardLab } from '@/features/lab/pickup-card/pickup-card-lab'
import { noIndexHead } from '@/lib/no-index'

/** Lab: three layouts for the merchant's pickup point card (round 2). Not part of the product. */
export const Route = createFileRoute('/lab/pickup-card')({
  ssr: false,
  head: noIndexHead,
  component: PickupCardLab,
})
