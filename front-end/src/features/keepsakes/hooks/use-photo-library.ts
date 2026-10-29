import type { Media } from '@sk/api-contract'

import { useState } from 'react'

/** The files a keepsake page knows, so a photo added a moment ago shows before the server has sent the keepsake again. */
export function usePhotoLibrary(initial: Media[]) {
  const [known, setKnown] = useState(() => new Map(initial.map(photo => [photo.id, photo])))

  return {
    photosOf: (ids: string[]) => ids.flatMap(id => known.get(id) ?? []),
    add: (media: Media) => setKnown(previous => new Map(previous).set(media.id, media)),
  }
}
