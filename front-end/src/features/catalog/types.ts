import type { Language } from "@/contexts/locale-context";

/** Text written by the merchant. A language may be missing (R02: publish in one language). */
export type LocalizedText = Partial<Record<Language, string>>;

/** Money in Rappen (1 CHF = 100) so sums never drift. */
export type Rappen = number;

export type CategoryId =
  | "pocket-knives"
  | "gift-boxes"
  | "chocolate"
  | "prints"
  | "small-gifts"
  | "tours";

export interface Category {
  id: CategoryId;
  name: LocalizedText;
  /** Tours are sold from Phase 2; the tile shows "coming soon" until then. */
  comingSoon?: boolean;
  /** Photo slug for the category tile and the gifts-list banner. */
  photo?: string;
  /** One line under the category name in the banner. */
  tagline?: LocalizedText;
}

/** How preparation days are counted (PRD §7.2). Mon–Fri does not skip public holidays. */
export type DayMode = "working-days" | "calendar-days";

export type PaymentPolicy =
  | { kind: "full"; firstDueHours: number }
  | {
      kind: "deposit";
      depositPercent: number;
      firstDueHours: number;
      balanceDueDaysAfterPickup: number;
    }
  | { kind: "later"; dueDaysAfterPickup: number };

export interface Variant {
  id: string;
  label: LocalizedText;
  price: Rappen;
  /**
   * Units on hand. Holds are not subtracted here: an order holds its units from
   * acceptance until handover or cancellation (O05), so available = stock − held units.
   */
  stock: number;
  /** The merchant has stopped selling this variant for now (spec C03 "variant not sold"). */
  notForSale?: boolean;
}

/** One chapter of a product's long story (C03 "About this gift"). */
export interface StoryChapter {
  title: LocalizedText;
  body: LocalizedText;
  /** Photo slug shown above the chapter. */
  photo?: string;
}

/**
 * The story behind a gift or tour (business plan: "a keepsake with a story"). Optional.
 */
export interface ProductStory {
  title: LocalizedText;
  chapters: StoryChapter[];
}

export interface Product {
  id: string;
  slug: string;
  categoryId: CategoryId;
  name: LocalizedText;
  story: LocalizedText;
  cancellationPolicy: LocalizedText;
  variants: Variant[];
  preparationDays: number;
  dayMode: DayMode;
  paymentPolicy: PaymentPolicy;
  /** Commission rate for referral partners, e.g. 0.1 = 10%. Snapshotted on each order line. */
  commissionRate: number;
  engraving?: { maxLength: number };
  /** Photo slug in src/assets/photos (see lib/photos.ts); missing photos fall back to the hero gradient. */
  photo?: string;
  /** More photo slugs for the detail gallery, after `photo` (sample shots until the shop's own). */
  photos?: string[];
  longStory?: ProductStory;
  /** Missing counts as published, so stored products from before Phase 4 stay visible. */
  published?: boolean;
}

export interface PickupPlace {
  id: string;
  name: LocalizedText;
  address: string;
  openingHours: LocalizedText;
  instructions: LocalizedText;
}

export interface Review {
  id: string;
  productId: string;
  guestName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: LocalizedText;
  createdAt: string;
  /** When the reviewer's latest order of this gift was completed (handed over). */
  purchasedAt: string;
  /** Photos the guest added (slugs in src/assets/photos; sample shots in the prototype). */
  photos?: string[];
  /** The shop's public answer (spec §4.11, M23), in the language it was written in. */
  reply?: { text: string; language: Language; by: string; at: string };
}

export interface Shop {
  /** Guest-facing seller name on receipts (PRD §9.2). The brand name is still open (O01). */
  name: string;
  ownerName: string;
  email: string;
  /** Shop phone for guests (C03 seller card); sample number in the prototype. */
  phone: string;
}
