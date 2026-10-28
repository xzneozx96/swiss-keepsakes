import { createFileRoute } from '@tanstack/react-router'

import { redirectToLanguageHome } from '@/lib/legacy-redirect'

export const Route = createFileRoute('/')({
  ssr: true,
  beforeLoad: () => redirectToLanguageHome(),
})
