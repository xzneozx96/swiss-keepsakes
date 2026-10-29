import type { MediaLabSearch } from './media-search-params'

import { MediaLibrary } from './media-library-screen'
import { MediaShell } from './media-shell'
import { useLibrary } from './media-state'

/**
 * What the lab frame shows: the merchant shell with the media library on its own data in
 * memory. A new address (state) is a fresh frame, so nothing leaks between states.
 */
export function MediaLabApp({ search }: { search: MediaLabSearch }) {
  const lib = useLibrary(search.state)

  return (
    <MediaShell>
      <MediaLibrary lib={lib} state={search.state} />
    </MediaShell>
  )
}
