import type { StoryDeleted, StoryGroup, StoryGroupDetail, StoryGroupSaveBody, StoryLinks, StoryList, StoryVersion, StoryVersionCreateBody, StoryVersionSaveBody } from '@sk/api-contract'

/** A command carries the `Idempotency-Key` of the user's intent, so a retry of it is the same request to the API. */
export type Keyed<T> = T & { idempotencyKey: string }

/**
 * The merchant's stories (E4.3). There is no demo implementation: every call goes to the API, and a refusal arrives
 * as an `ApiProblem`. A story is a group with up to two language versions; a version carries its own row version.
 */
export interface StoriesClient {
  /** The story groups that have a version, newest update first. */
  list: (input: { storeId: string }) => Promise<StoryList>
  /** One group with both language versions. */
  group: (input: { storeId: string, groupId: string }) => Promise<StoryGroupDetail>
  /** Creates the group, then its English draft. A failure of either is an ApiProblem of type 'story-not-created' (same status and request id). */
  createStory: (input: { storeId: string, authorName: string, idempotencyKey: string, versionIdempotencyKey: string }) => Promise<{ group: StoryGroup, version: StoryVersion }>
  createVersion: (input: Keyed<{ storeId: string, groupId: string } & StoryVersionCreateBody>) => Promise<StoryVersion>
  /** How many pins name the story as their main story and how many other stories list it, for the Delete story confirm. */
  links: (input: { storeId: string, groupId: string }) => Promise<StoryLinks>
  /** Deletes the whole story, both versions and its links, in one request (published or not); no If-Match. The answer counts the links removed. */
  removeStory: (input: Keyed<{ storeId: string, groupId: string }>) => Promise<StoryDeleted>
  /** Saves the whole draft of one version (ADR-014) on the row version in `ifMatch`; a 412 is an ApiProblem of type 'precondition-failed'. */
  saveVersion: (input: Keyed<{ storeId: string, groupId: string, language: 'en' | 'de', ifMatch: number } & StoryVersionSaveBody>) => Promise<StoryVersion>
  /**
   * Saves the shared facts of the group (stay, interests and the lists) on the group's own row version in `ifMatch`, which
   * no language version moves. A partial save: a field left out stays, a list replaces. A 412 is an ApiProblem of type 'precondition-failed'.
   */
  saveGroup: (input: Keyed<{ storeId: string, groupId: string, ifMatch: number } & StoryGroupSaveBody>) => Promise<StoryGroup>
  /** Publishes one language version (ADR-014); the draft becomes the published copy and the row version moves. A 422 `publish-incomplete` is a `PublishIncomplete` that names the gaps. */
  publishVersion: (input: Keyed<{ storeId: string, groupId: string, language: 'en' | 'de', ifMatch: number }>) => Promise<StoryVersion>
  /** Makes a live version a draft again; the published text stays. */
  unpublishVersion: (input: Keyed<{ storeId: string, groupId: string, language: 'en' | 'de', ifMatch: number }>) => Promise<StoryVersion>
}
