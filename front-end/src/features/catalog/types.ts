import type { Language } from "@/contexts/locale-context";
import type { LocalizedRich } from "@/lib/rich-text";

/** Text written by the merchant. A language may be missing (R02: publish in one language). */
export type LocalizedText = Partial<Record<Language, string>>;

/** Money in Rappen (1 CHF = 100) so sums never drift. */
export type Rappen = number;

/** The two product categories (PRD §7.0). Fixed: a merchant cannot add, rename or remove them. */
export type CategoryId = "keepsakes" | "tours";

export interface Category {
  id: CategoryId;
  name: LocalizedText;
  photo: string;
}

/**
 * A store's own grouping inside one category (PRD §7.0), edited by the merchant on M26.
 * Keepsakes carry the pilot store's five: pocket knives, gift boxes, chocolate, prints and
 * small gifts. Tours, stays and experiences have none yet.
 */
export interface Subcategory {
  id: string;
  categoryId: CategoryId;
  name: LocalizedText;
  /** Photo slug for the guest tile and the list banner; absent = a neutral keepsake photo. */
  photo?: string;
  /** One line under the sub-category name in the guest banner. */
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

/**
 * The story behind a gift or tour (business plan: "a keepsake with a story"). Optional.
 * The body is rich text per language (Tiptap JSON), edited in M12/M13 since 15.10.2026;
 * stored stories in the older chapter shape are converted on load (demo/upgrade.ts).
 */
export interface ProductStory {
  title: LocalizedText;
  body: LocalizedRich;
}

export interface Product {
  id: string;
  slug: string;
  /** Its category is the sub-category's `categoryId`; a keepsake always has one. */
  subcategoryId: string;
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
  /** Set when archived in M11: hidden from guests and from M11's active list; restoring makes it a draft. */
  archivedAt?: string;
  /** Pickup places that offer this gift (M12); missing means every place (step 4.9). */
  pickupPlaceIds?: string[];
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
