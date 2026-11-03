import type { StoryGroup, StoryList, StoryVersion, StoryVersionCreateBody } from '@sk/api-contract'

/** A command carries the `Idempotency-Key` of the user's intent, so a retry of it is the same request to the API. */
export type Keyed<T> = T & { idempotencyKey: string }

/**
 * The merchant's stories (E4.3). There is no demo implementation: every call goes to the API, and a refusal arrives
 * as an `ApiProblem`. A story is a group with up to two language versions; a version carries its own row version.
 */
export interface StoriesClient {
  /** The story groups that have a version, newest update first. */
  list: (input: { storeId: string }) => Promise<StoryList>
  /** Creates the group, then its English draft. A failure of either is an ApiProblem of type 'story-not-created' (same status and request id). */
  createStory: (input: { storeId: string, authorName: string, idempotencyKey: string, versionIdempotencyKey: string }) => Promise<{ group: StoryGroup, version: StoryVersion }>
  createVersion: (input: Keyed<{ storeId: string, groupId: string } & StoryVersionCreateBody>) => Promise<StoryVersion>
  /** Deletes the given versions in parallel, one DELETE each with its own If-Match and Idempotency-Key. One command, so one success toast and one refresh. */
  removeStory: (input: { storeId: string, groupId: string, versions: Keyed<{ language: 'en' | 'de', ifMatch: number }>[] }) => Promise<void>
}
