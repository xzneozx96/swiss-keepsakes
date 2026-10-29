import type { PinChanges } from '../ports.ts'

// The main photo and the extra photos of a save: each must be an image of the signed-in store.
export function pinImages(changes: Pick<PinChanges, 'coverMediaId' | 'photos'>): { id: string, kind: 'image' }[] {
  const ids = [...(changes.coverMediaId ? [changes.coverMediaId] : []), ...(changes.photos ?? []).map(photo => photo.mediaId)]

  return ids.map(id => ({ id, kind: 'image' as const }))
}
