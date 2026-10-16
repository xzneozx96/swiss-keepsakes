import type { DemoState } from "./types";

import {
  pickupPlaceSeed,
  products,
  reviews,
  subcategories,
} from "@/features/catalog/seed";
import { articleSeed, commentSeed } from "@/features/content/seed";
import { demoGuest, otherGuests, seedOrders } from "@/features/orders/seed";
import {
  adviceQuestionSeed,
  adviceRequestSeed,
  privateTourRequestSeed,
} from "@/features/requests/seed";
import {
  adjustmentSeed,
  partnerSeed,
  payoutSeed,
} from "@/features/partners/seed";
import { costSeed } from "@/features/reports/seed";
import { sampleTourReviews } from "@/features/tours/reviews/seed";
import { createTourSeed } from "@/features/tours/seed";

/** Bump when the stored shape changes, so old browser data is replaced by the seed. */
export const DEMO_VERSION = 16;

export function createSeedState(realNow: number = Date.now()): DemoState {
  const orders = seedOrders();
  const tours = createTourSeed();
  const ledgerSource = { orders, tours };

  return {
    version: DEMO_VERSION,
    role: "guest",
    clockStartedAt: realNow,
    data: {
      // Deep copies so the module-level seed is never mutated.
      products: structuredClone(products),
      subcategories: structuredClone(subcategories),
      orders,
      guests: [demoGuest, ...otherGuests],
      reviews: structuredClone([...reviews, ...sampleTourReviews]),
      referralVisits: [],
      favouriteProductIds: [],
      cart: [],
      signedInGuestId: null,
      nextOrderNumber: 1043,
      mail: [],
      tours,
      pickupPlaces: structuredClone(pickupPlaceSeed),
      articles: structuredClone(articleSeed),
      comments: structuredClone(commentSeed),
      adviceQuestions: structuredClone(adviceQuestionSeed),
      adviceRequests: structuredClone(adviceRequestSeed),
      privateTourRequests: structuredClone(privateTourRequestSeed),
      partners: structuredClone(partnerSeed),
      partnerPayouts: payoutSeed(ledgerSource),
      commissionAdjustments: adjustmentSeed(ledgerSource),
      costs: costSeed(ledgerSource),
      partnerSessions: [],
    },
  };
}
