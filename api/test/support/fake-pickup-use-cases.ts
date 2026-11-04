import type { PickupUseCases } from '../../src/modules/catalog/adapters/pickup-routes.ts'
import type { PickupPlace } from '../../src/modules/catalog/ports.ts'

// Stand-ins for the pickup use cases, for tests of the routes' guards over createApp. Each answers as if the row
// existed and the caller could do the thing, so a request that gets past the guard is not a 404 or a 403.
export function createFakePickupUseCases(): PickupUseCases {
  const place = (storeId: string, id = '0190f0c2-0000-7000-8000-0000000000d1', rowVersion = 1): PickupPlace => ({
    id,
    storeId,
    name: { en: 'Kapellbrucke kiosk' },
    address: { en: 'Lucerne' },
    mapsLink: 'https://maps.app.goo.gl/AbCdEf123',
    latitude: 47.05,
    longitude: 8.3,
    instructions: null,
    position: 0,
    archived: false,
    hours: [],
    rowVersion,
  })
  return {
    listPickupPlaces: async () => ({ ok: true, value: [] }),
    getPickupPlace: async (_actor, storeId, placeId) => ({ ok: true, value: place(storeId, placeId) }),
    createPickupPlace: async (_actor, storeId) => ({ ok: true, value: place(storeId) }),
    savePickupPlace: async (_actor, storeId, placeId, ifMatch) => ({ ok: true, value: place(storeId, placeId, ifMatch + 1) }),
    reorderPickupPlaces: async () => ({ ok: true, value: [] }),
    archivePickupPlace: async (_actor, storeId, placeId, ifMatch) => ({ ok: true, value: { ...place(storeId, placeId, ifMatch + 1), archived: true } }),
    restorePickupPlace: async (_actor, storeId, placeId, ifMatch) => ({ ok: true, value: place(storeId, placeId, ifMatch + 1) }),
    deletePickupPlace: async (_actor, _storeId, placeId) => ({ ok: true, value: { id: placeId } }),
  }
}
