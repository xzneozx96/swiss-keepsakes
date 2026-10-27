import type { Pin } from '@sk/domain/content'
import type { ContentUseCases } from '../../src/modules/content/adapters/routes.ts'

export const fakePin: Pin = {
  id: '0190f0c2-0000-7000-8000-0000000000a1',
  storeId: '0190f0c2-0000-7000-8000-00000000000a',
  status: 'draft',
  slug: null,
  latitude: null,
  longitude: null,
  address: null,
  weeklyHours: [],
  stayTag: 'both',
  interests: [],
  coverMediaId: null,
  mainStoryGroupId: null,
  categoryIds: [],
  dates: [],
  draft: null,
  published: null,
  firstPublishedAt: null,
  rowVersion: 1,
  createdAt: new Date('2026-10-27T08:00:00Z'),
  updatedAt: new Date('2026-10-27T08:00:00Z'),
}

// Stand-ins for the content use cases, for tests of the routes' guards over createApp. Each answers as if the
// row existed and the caller could do the thing, so a request that gets past the guard is not a 404 or a 403.
export function createFakeContentUseCases(): ContentUseCases {
  return {
    createPin: async (_actor, storeId) => ({ ok: true, value: { ...fakePin, storeId } }),
    savePin: async (_actor, storeId, pinId, ifMatch) => ({ ok: true, value: { ...fakePin, storeId, id: pinId, rowVersion: ifMatch + 1 } }),
    publishPin: async (_actor, storeId, pinId, ifMatch) => ({ ok: true, value: { ...fakePin, storeId, id: pinId, status: 'published', rowVersion: ifMatch + 1 } }),
    hidePin: async (_actor, storeId, pinId, ifMatch) => ({ ok: true, value: { ...fakePin, storeId, id: pinId, status: 'hidden', rowVersion: ifMatch + 1 } }),
    deletePin: async (_actor, _storeId, pinId) => ({ ok: true, value: { id: pinId } }),
  }
}
