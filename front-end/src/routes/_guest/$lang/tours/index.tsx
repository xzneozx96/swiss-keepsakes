import { createFileRoute } from '@tanstack/react-router'

import { TourListPage } from '@/features/tours/discovery'

export const Route = createFileRoute('/_guest/$lang/tours/')({
  ssr: true,
  component: Page,
})

function Page() {
  return <TourListPage />
}
