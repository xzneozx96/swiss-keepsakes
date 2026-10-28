import type { Pin, StoryGroup, StoryVersion, TourGuide } from '@sk/domain/content'
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

export const fakeStoryGroup: StoryGroup = {
  id: '0190f0c2-0000-7000-8000-0000000000b1',
  storeId: '0190f0c2-0000-7000-8000-00000000000a',
  kind: 'story',
  subjectPlaceId: null,
  stayTag: 'both',
  interests: [],
  categoryIds: [],
  placeIds: [],
  keepsakeProductIds: [],
  relatedGroupIds: [],
  rowVersion: 1,
  createdAt: new Date('2026-10-27T08:00:00Z'),
  updatedAt: new Date('2026-10-27T08:00:00Z'),
}

export const fakeStoryVersion: StoryVersion = {
  groupId: fakeStoryGroup.id,
  storeId: fakeStoryGroup.storeId,
  language: 'en',
  status: 'draft',
  slug: null,
  draft: null,
  published: null,
  publishedAt: null,
  rowVersion: 1,
  createdAt: new Date('2026-10-27T08:00:00Z'),
  updatedAt: new Date('2026-10-27T08:00:00Z'),
}

export const fakeTour: TourGuide = {
  id: '0190f0c2-0000-7000-8000-0000000000c1',
  storeId: '0190f0c2-0000-7000-8000-00000000000a',
  status: 'draft',
  slug: null,
  stayTag: 'both',
  interests: [],
  durationMinutes: null,
  coverMediaId: null,
  pdfMediaId: null,
  keepsakeProductIds: [],
  stops: [],
  draft: null,
  published: null,
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
    createStoryGroup: async (_actor, storeId, input) => ({ ok: true, value: { ...fakeStoryGroup, ...input, storeId } }),
    saveStoryGroup: async (_actor, storeId, groupId, ifMatch, changes) => ({ ok: true, value: { ...fakeStoryGroup, ...changes, storeId, id: groupId, rowVersion: ifMatch + 1 } }),
    createStoryVersion: async (_actor, storeId, groupId, language, changes) => ({ ok: true, value: { ...fakeStoryVersion, slug: changes.slug ?? null, draft: changes.draft ?? null, storeId, groupId, language } }),
    saveStoryVersion: async (_actor, storeId, groupId, language, ifMatch, changes) => ({ ok: true, value: { ...fakeStoryVersion, slug: changes.slug ?? null, draft: changes.draft ?? null, storeId, groupId, language, rowVersion: ifMatch + 1 } }),
    publishStoryVersion: async (_actor, storeId, groupId, language, ifMatch) => ({ ok: true, value: { ...fakeStoryVersion, storeId, groupId, language, status: 'published', rowVersion: ifMatch + 1 } }),
    unpublishStoryVersion: async (_actor, storeId, groupId, language, ifMatch) => ({ ok: true, value: { ...fakeStoryVersion, storeId, groupId, language, rowVersion: ifMatch + 1 } }),
    moveStoryVersion: async (_actor, storeId, _groupId, language, ifMatch, targetGroupId) => ({ ok: true, value: { ...fakeStoryVersion, storeId, groupId: targetGroupId, language, rowVersion: ifMatch + 1 } }),
    deleteStoryVersion: async (_actor, _storeId, groupId, language) => ({ ok: true, value: { groupId, language } }),
    createTour: async (_actor, storeId) => ({ ok: true, value: { ...fakeTour, storeId } }),
    saveTour: async (_actor, storeId, tourId, ifMatch) => ({ ok: true, value: { ...fakeTour, storeId, id: tourId, rowVersion: ifMatch + 1 } }),
    publishTour: async (_actor, storeId, tourId, ifMatch) => ({ ok: true, value: { ...fakeTour, storeId, id: tourId, status: 'published', rowVersion: ifMatch + 1 } }),
    unpublishTour: async (_actor, storeId, tourId, ifMatch) => ({ ok: true, value: { ...fakeTour, storeId, id: tourId, rowVersion: ifMatch + 1 } }),
    deleteTour: async (_actor, _storeId, tourId) => ({ ok: true, value: { id: tourId } }),
    requestUpload: async (_actor, storeId, input) => ({ ok: true, value: { uploadKey: `${storeId}/0190f0c2-0000-7000-8000-0000000000e1.jpg`, url: 'https://storage.test/uploads/fake', method: 'PUT', headers: { 'Content-Type': input.contentType }, expiresAt: '2026-10-28T10:15:00.000Z', kind: 'image' } }),
    listStories: async () => ({ items: [] }),
    getStory: async () => ({ ok: false, reason: 'not-found' }),
    getPin: async () => ({ ok: false, reason: 'not-found' }),
    listTours: async () => ({ items: [] }),
    getTour: async () => ({ ok: false, reason: 'not-found' }),
    listCategories: async () => ({ items: [] }),
    getMap: async () => ({ items: [] }),
  }
}
