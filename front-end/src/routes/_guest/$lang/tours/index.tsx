import { createFileRoute, useRouter } from '@tanstack/react-router'

import { loadPublicToursPage, TOURS_PAGE_SIZE } from '@/features/tours/api/public-tours'
import { TourListPage } from '@/features/tours/discovery'
import { isLanguage } from '@/lib/language-routing'

// C08 Tours. The first page (10) is read on the server, so the HTML carries it (ADR-033); the page loads the rest in the browser as the
// guest scrolls. A failed read is data (`null`), so the page shows its own error with a retry and never a demo tour.
export const Route = createFileRoute('/_guest/$lang/tours/')({
  ssr: true,
  loader: async ({ params }) => {
    const lang = isLanguage(params.lang) ? params.lang : 'en'

    return { lang, first: await loadPublicToursPage(lang, { limit: TOURS_PAGE_SIZE }).catch(() => null) }
  },
  component: Page,
})

function Page() {
  const { lang, first } = Route.useLoaderData()
  const router = useRouter()

  return <TourListPage first={first} lang={lang} onRetry={() => void router.invalidate()} />
}
