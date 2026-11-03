import type { Language } from '@sk/domain/shared'
import { track } from './track'

/** The story page calls this once it shows a story (E4.4). Carries the story id and nothing else about it. */
export function trackStoryView(storyId: string, language: Language): void {
  track('story_view', { pageType: 'story', contentId: storyId, language })
}

/** The keepsake page calls this once it shows a keepsake (E6.4). Carries the keepsake id: no price, no variant. */
export function trackProductView(keepsakeId: string, language: Language): void {
  track('product_view', { pageType: 'keepsake', contentId: keepsakeId, language })
}
