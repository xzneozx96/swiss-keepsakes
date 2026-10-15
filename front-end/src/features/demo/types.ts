import type { CartLine } from "@/features/cart/types";
import type { Guest, Order } from "@/features/orders/types";
import type { Mail } from "@/features/notifications/types";
import type {
  PickupPlace,
  Product,
  Review,
  Subcategory,
} from "@/features/catalog/types";
import type { Article, ArticleComment } from "@/features/content/types";
import type {
  CommissionAdjustment,
  Partner,
  PartnerPayout,
  PartnerSession,
  ReferralVisit,
} from "@/features/partners/types";
import type { CostRecord } from "@/features/reports/types";
import type {
  AdviceDraft,
  AdviceQuestionSet,
  AdviceRequest,
  PrivateTourRequest,
} from "@/features/requests/types";
import type { TourData } from "@/features/tours/types";

/** Who the prototype is acting as. Stands in for staff and partner sign-in in flow 1. */
export type Role = "guest" | "owner" | "manager" | "partner";

/** Everything the prototype remembers between reloads. Reset restores the seed. */
export interface DemoData {
  products: Product[];
  /** The store's own sub-categories, edited on M26; each product points at one (PRD §7.0). */
  subcategories: Subcategory[];
  orders: Order[];
  guests: Guest[];
  reviews: Review[];
  referralVisits: ReferralVisit[];
  /** Gifts the guest saved with the heart (UX proposal: favourites are not in the PRD). */
  favouriteProductIds: string[];
  /** Gifts added on C03, kept while signed out (AC01: browsing needs no account). */
  cart: CartLine[];
  /** Signed-in guest id; null until the guest signs in (C05). */
  signedInGuestId: string | null;
  nextOrderNumber: number;
  /** Emails the prototype "sent", newest last; shown in the Mail panel (outline §3). */
  mail: Mail[];
  tours?: TourData;
  /** Editable in M14, so C03, C15 and the mails show the change (outline D4). */
  pickupPlaces: PickupPlace[];
  /** Both language versions of every story, drafts included (M17). */
  articles: Article[];
  comments: ArticleComment[];
  adviceQuestions: AdviceQuestionSet;
  adviceRequests: AdviceRequest[];
  /** The open C21 request, so a refresh keeps the step and answers; absent when none. */
  adviceDraft?: AdviceDraft;
  privateTourRequests: PrivateTourRequest[];
  /** Editable in M16 (report link revoke and reissue), so not a static list (Phase 5). */
  partners: Partner[];
  partnerPayouts: PartnerPayout[];
  commissionAdjustments: CommissionAdjustment[];
  /** M24 cost data per transaction; a transaction without a record has every cost missing. */
  costs: CostRecord[];
  /** P01 sessions on this browser (R10, step 5.6). */
  partnerSessions: PartnerSession[];
}

export interface DemoState {
  version: number;
  role: Role;
  /** Real time (ms) when the demo clock started; see clock.ts. */
  clockStartedAt: number;
  data: DemoData;
}
