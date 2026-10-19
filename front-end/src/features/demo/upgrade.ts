import type { Product } from '@sk/domain/catalog'
import type { Article } from '@sk/domain/content'
import type { DemoData } from './types'

import { isChapterStory, storyFromChapters } from '@sk/domain/shared'

import { upgradeTourData } from '@/features/tours/lib/upgrade'
import { sampleTourReviews } from '@/features/tours/reviews/seed'
import { createTourSeed } from '@/features/tours/seed'
import { createSeedState } from './seed'

/**
 * Long stories stored before 15.10.2026 have illustrated chapters; they become one rich
 * body per language, with the same photos, titles and text (owner, rich long story).
 */
function currentStory<T>(story: T): T {
  return isChapterStory(story) ? (storyFromChapters(story) as T) : story
}

/** Collections added in Phases 4 and 5; demo data saved before then has none of them. */
type AddedKey
  = | 'subcategories'
    | 'pickupPlaces'
    | 'articles'
    | 'comments'
    | 'adviceQuestions'
    | 'adviceRequests'
    | 'privateTourRequests'
    | 'partners'
    | 'partnerPayouts'
    | 'commissionAdjustments'
    | 'costs'
    | 'partnerSessions'

/**
 * Demo data as an earlier build of the same DEMO_VERSION may have stored it. Before 2.17 the
 * trip answers were kept once per guest in `tripProfiles`; they now live on each order and
 * booking, so the old map is dropped.
 */
export type StoredDemoData = Omit<DemoData, AddedKey | 'products'>
  & Partial<Pick<DemoData, Exclude<AddedKey, 'articles'>>> & {
    tripProfiles?: unknown
    /** Before 17.10.2026 a story had no category or place. */
    articles?: (Omit<Article, 'category' | 'place'>
      & Partial<Pick<Article, 'category' | 'place'>>)[]
    /** Before the four fixed categories, a product held one of the five keepsake `categoryId`s. */
    products: (Omit<Product, 'subcategoryId'> & {
      subcategoryId?: string
      categoryId?: string
    })[]
  }

/**
 * Fills what an earlier build did not store, from the seed (outline D5), so nobody's demo
 * state is wiped. Stored values win, even empty lists. Changed fixtures appear after Reset.
 */
export function upgradeDemoData({
  tripProfiles: _guestTripProfiles,
  ...stored
}: StoredDemoData): DemoData {
  const seed = createSeedState().data
  const reviewIds = new Set(stored.reviews.map(review => review.id))
  // Articles stored before 4.4 have `body` instead of `sections`, separate id lists instead
  // of one ordered `links` list (R16) and no `related` stories (R18). They are replaced
  // once, and the seeded comments they lacked are added; comments guests wrote are kept.
  // An empty list (saved before the stories were seeded) counts as stale too, so it is reseeded.
  const articlesCurrent
    = !!stored.articles?.length
      && stored.articles.every(
        a =>
          Array.isArray(a.sections)
          && Array.isArray(a.links)
          && Array.isArray(a.related),
      )
  const commentIds = new Set(stored.comments?.map(c => c.id))

  const tours = upgradeTourData(stored.tours ?? createTourSeed())

  return {
    ...stored,
    // Products saved before their long story was written get it from the seed (a saved
    // story wins); a saved story in the chapter shape is converted.
    subcategories: stored.subcategories ?? seed.subcategories,
    products: stored.products.map(({ categoryId, ...product }) => {
      const merged = {
        longStory: seed.products.find(p => p.id === product.id)?.longStory,
        ...product,
        // The old five categories are now the sub-categories of Keepsakes, with the same ids.
        subcategoryId: product.subcategoryId ?? categoryId ?? 'small-gifts',
      }

      return { ...merged, longStory: currentStory(merged.longStory) }
    }),
    tours: {
      ...tours,
      tours: tours.tours.map(tour => ({
        ...tour,
        longStory: currentStory(tour.longStory),
      })),
    },
    reviews: [
      ...stored.reviews,
      ...structuredClone(
        sampleTourReviews.filter(review => !reviewIds.has(review.id)),
      ),
    ],
    pickupPlaces: stored.pickupPlaces ?? seed.pickupPlaces,
    // Articles saved before 17.10.2026 have no category or place: the seeded version of the
    // same record gives them, and a story the merchant wrote counts as "town" until edited.
    articles:
      articlesCurrent && stored.articles
        ? stored.articles.map((article) => {
            const seeded = seed.articles.find(a => a.id === article.id)

            return {
              ...article,
              category: article.category ?? seeded?.category ?? 'town',
              place: article.place ?? seeded?.place ?? '',
            }
          })
        : seed.articles,
    comments: articlesCurrent
      ? (stored.comments ?? seed.comments)
      : [
          ...(stored.comments ?? []),
          ...seed.comments.filter(c => !commentIds.has(c.id)),
        ],
    adviceQuestions: stored.adviceQuestions ?? seed.adviceQuestions,
    adviceRequests: stored.adviceRequests ?? seed.adviceRequests,
    privateTourRequests: stored.privateTourRequests ?? seed.privateTourRequests,
    partners: stored.partners ?? seed.partners,
    partnerPayouts: stored.partnerPayouts ?? seed.partnerPayouts,
    commissionAdjustments:
      stored.commissionAdjustments ?? seed.commissionAdjustments,
    costs: stored.costs ?? seed.costs,
    partnerSessions: stored.partnerSessions ?? seed.partnerSessions,
  }
}
