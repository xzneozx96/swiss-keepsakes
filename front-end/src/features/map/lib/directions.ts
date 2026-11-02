const HTTPS = /^https:\/\/\S+$/

/**
 * Where "Open in Google Maps" goes (AC89): the Google Maps link the merchant stored for the place, else its position.
 * Destination only: the link carries no origin and no route, and the site never reads where the guest is.
 */
export function directionsUrl({ mapsLink, latitude, longitude }: { mapsLink: string | null, latitude: number, longitude: number }) {
  if (mapsLink && HTTPS.test(mapsLink))
    return mapsLink

  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
}
