import type { ContentLanguage } from '@sk/domain/content'
import { chapelBridge } from './stories/chapel-bridge.ts'
import { fritschi } from './stories/fritschi.ts'
import { jesuitChurch } from './stories/jesuit-church.ts'
import { lionMonument } from './stories/lion-monument.ts'
import { oldPharmacy } from './stories/old-pharmacy.ts'
import { reviews } from './stories/reviews.ts'
import { spreuerBridge } from './stories/spreuer-bridge.ts'
import { weinmarkt } from './stories/weinmarkt.ts'

// Original stories and editorial reviews for the seeded places (owner decisions of 2026-11-03, standing order 19; rewritten in
// November 2026 after the owner found the first texts short and generic). Written from the public sources each entry lists,
// never copied. The text is plain: a string is a paragraph, `{ h }` a level 2 heading, `{ ul }` a bullet list and `{ photo }` a
// photo of `story-photos.ts` by key (its alt text and caption come from there). seed-place-stories.ts turns it into the story
// body. The sources are for the editor; guests do not see them (owner, 2026-11-04).
// Where sources disagree, the text says so or leaves the detail out.

export type PlaceStoryBlock = string | { h: string } | { ul: string[] } | { photo: string }

export interface PlaceStoryText {
  title: string
  // The "short summary" of the editor.
  excerpt: string
  blocks: PlaceStoryBlock[]
}

export interface PlaceStory {
  key: string
  kind: 'story' | 'editorial_review'
  // The English slug is the "already seeded" test: a story whose slug exists in either language is not created again.
  slug: Record<ContentLanguage, string>
  // English slugs of the places the story is linked to. The first one is the subject of a review.
  places: string[]
  // Places that get this story as their main story, when they have none.
  mainStoryFor: string[]
  // The cover is this photo of `story-photos.ts`; with none, it is the cover of the place `coverFrom`.
  cover?: string
  coverFrom: string
  blogCategories: string[]
  interests: string[]
  stayTag: 'short_stay' | 'multi_day' | 'both'
  // Keys of other stories shown under "More to discover" (3 at most).
  related: string[]
  // Day the facts of a review were checked.
  checkedOn?: string
  sources: { name: string, url: string }[]
  versions: Record<ContentLanguage, PlaceStoryText>
}

// Places that have no cover get this photo of `story-photos.ts` as their cover (their pin shows it on the map and in lists).
export const placeCovers: { place: string, photo: string }[] = [
  { place: 'bachmann-at-bahnhof-luzern-ug', photo: 'st-concourse' },
  { place: 'coop-bahnhof-luzern', photo: 'st-forecourt' },
  { place: 'migros-bahnhof-luzern', photo: 'st-gate' },
]

export const placeStories: PlaceStory[] = [chapelBridge, spreuerBridge, jesuitChurch, oldPharmacy, fritschi, lionMonument, weinmarkt, ...reviews]
