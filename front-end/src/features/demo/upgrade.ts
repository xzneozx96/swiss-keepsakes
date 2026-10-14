import type { DemoData } from "./types";

import { createSeedState } from "./seed";

import { sampleTourReviews } from "@/features/tours/reviews/seed";
import { createTourSeed } from "@/features/tours/seed";
import { upgradeTourData } from "@/features/tours/lib/upgrade";

/** Collections added in Phases 4 and 5; demo data saved before then has none of them. */
type AddedKey =
  | "pickupPlaces"
  | "articles"
  | "comments"
  | "adviceQuestions"
  | "adviceRequests"
  | "privateTourRequests"
  | "partners"
  | "partnerPayouts"
  | "commissionAdjustments"
  | "costs"
  | "partnerSessions";

/**
 * Demo data as an earlier build of the same DEMO_VERSION may have stored it. Before 2.17 the
 * trip answers were kept once per guest in `tripProfiles`; they now live on each order and
 * booking, so the old map is dropped.
 */
export type StoredDemoData = Omit<DemoData, AddedKey> &
  Partial<Pick<DemoData, AddedKey>> & { tripProfiles?: unknown };

/**
 * Fills what an earlier build did not store, from the seed (outline D5), so nobody's demo
 * state is wiped. Stored values win, even empty lists. Changed fixtures appear after Reset.
 */
export function upgradeDemoData({
  tripProfiles: _guestTripProfiles,
  ...stored
}: StoredDemoData): DemoData {
  const seed = createSeedState().data;
  const reviewIds = new Set(stored.reviews.map((review) => review.id));
  // Articles stored before 4.4 have `body` instead of `sections`, separate id lists instead
  // of one ordered `links` list (R16) and no `related` stories (R18). They are replaced
  // once, and the seeded comments they lacked are added; comments guests wrote are kept.
  // An empty list (saved before the stories were seeded) counts as stale too, so it is reseeded.
  const articlesCurrent =
    !!stored.articles?.length &&
    stored.articles.every(
      (a) =>
        Array.isArray(a.sections) &&
        Array.isArray(a.links) &&
        Array.isArray(a.related),
    );
  const commentIds = new Set(stored.comments?.map((c) => c.id));

  return {
    ...stored,
    // Products saved before their long story was written get it from the seed (a saved
    // story wins).
    products: stored.products.map((product) => ({
      longStory: seed.products.find((p) => p.id === product.id)?.longStory,
      ...product,
    })),
    tours: upgradeTourData(stored.tours ?? createTourSeed()),
    reviews: [
      ...stored.reviews,
      ...structuredClone(
        sampleTourReviews.filter((review) => !reviewIds.has(review.id)),
      ),
    ],
    pickupPlaces: stored.pickupPlaces ?? seed.pickupPlaces,
    articles:
      articlesCurrent && stored.articles ? stored.articles : seed.articles,
    comments: articlesCurrent
      ? (stored.comments ?? seed.comments)
      : [
          ...(stored.comments ?? []),
          ...seed.comments.filter((c) => !commentIds.has(c.id)),
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
  };
}
