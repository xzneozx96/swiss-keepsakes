import { createFileRoute, notFound, Outlet } from '@tanstack/react-router'

import { isLanguage } from '@/lib/language-routing'

export const Route = createFileRoute('/_guest/$lang')({
  beforeLoad: ({ params }) => {
    if (!isLanguage(params.lang))
      throw notFound()
  },
  ssr: true,
  component: Outlet,
})
