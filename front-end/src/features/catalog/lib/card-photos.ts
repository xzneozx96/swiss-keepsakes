/** The strip's photos: the list read's photos, or the cover alone when only that is known. */
export const photosOf = ({ photos, photo }: { photos?: string[], photo?: string }) => photos?.length ? photos : photo ? [photo] : []
