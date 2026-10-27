import { createFileRoute, notFound, Outlet } from '@tanstack/react-router'
import { loadDictionary } from '@/contexts/locale-context'
import { isLanguage } from '@/lib/language-routing'

export const Route = createFileRoute('/_guest/$lang')({
  beforeLoad: async ({ params }) => {
    if (!isLanguage(params.lang))
      throw notFound()
    await loadDictionary(params.lang)
  },
  ssr: true,
  component: Outlet,
})
