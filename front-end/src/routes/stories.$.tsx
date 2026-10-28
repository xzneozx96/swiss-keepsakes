import { createFileRoute } from '@tanstack/react-router'

import { redirectLegacyGuestPath } from '@/lib/legacy-redirect'

// Old address /stories and its sub-paths: 302 to the language-prefixed page.
export const Route = createFileRoute('/stories/$')({
  ssr: true,
  beforeLoad: ({ location }) => redirectLegacyGuestPath(location),
})
