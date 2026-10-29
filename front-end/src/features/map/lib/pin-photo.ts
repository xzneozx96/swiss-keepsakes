const TRAILING_SLASH = /\/$/

/**
 * The public address of a pin's photo from its storage key (ADR-004: public bucket, versioned
 * keys). The public map list carries the key and no address, so the guest app needs the bucket's
 * base address; until it is set no photo resolves and pins show the place icon.
 */
export function pinPhotoUrl(photoKey: string | null) {
  const base = (import.meta.env as Record<string, string | undefined>).VITE_MEDIA_BASE_URL

  return photoKey && base ? `${base.replace(TRAILING_SLASH, '')}/${photoKey}` : undefined
}
