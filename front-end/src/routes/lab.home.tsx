import { createFileRoute } from '@tanstack/react-router'

import { HomeCompare } from '@/features/lab/home-compare'
import { noIndexHead } from '@/lib/no-index'

/** Lab, slice S2: the three home directions (C01) side by side, and the approved search (S2). */
export const Route = createFileRoute('/lab/home')({
  ssr: false,
  head: noIndexHead,
  component: HomeCompare,
})
