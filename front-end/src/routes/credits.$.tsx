import { createFileRoute } from '@tanstack/react-router'

import { redirectLegacyGuestPath } from '@/lib/legacy-redirect'

// Old address /credits and its sub-paths: 302 to the language-prefixed page.
export const Route = createFileRoute('/credits/$')({
  ssr: true,
  beforeLoad: ({ location }) => redirectLegacyGuestPath(location),
})
