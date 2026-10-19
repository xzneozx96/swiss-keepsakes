import type { LanguageStatus } from "../lib/completeness";
import type { Product } from "@/features/catalog/types";
import type { Tour } from "@/features/tours/types";

import {
  giftText,
  languageStatus,
  missingText,
  placeText,
  tourText,
} from "../lib/completeness";

import { useLocale } from "@/contexts/locale-context";
import { isPublished } from "@/features/catalog/lib/publish";
import { availableUnits, fromPrice } from "@/features/catalog/lib/stock";
import { useDemo, useDemoNow } from "@/features/demo";
import { demoNow } from "@/features/demo/clock";
import { createTourSeed } from "@/features/tours/seed";
import { formatMoney, numberFormat } from "@/lib/format";
import { pickText } from "@/lib/localized";

export interface ProductRow {
  id: string;
  /** Opens M12 or M13. */
  href: string;
  name: string;
  photo?: string;
  /** "Pocket knives · 3 options" or "2 h". */
  meta: string;
  /** A keepsake's sub-category, for the Keepsakes filter; tours have none. */
  subcategoryId?: string;
  published: boolean;
  /** A tour paused for maintenance: guests cannot book it (R21). */
  maintenance?: boolean;
  /** Archived from the row menu: listed under "Archived" only, hidden from guests. */
  archived: boolean;
  languages: LanguageStatus;
  /** Footer and table facts, in column order: price, availability, commission. */
  facts: { label: string; value: string; isWarning?: boolean }[];
}

export interface PlaceRow {
  id: string;
  name: string;
  address: string;
  hours: string;
  instructions: string;
  languages: LanguageStatus;
}

/** Tours that have not started and are not cancelled, as M05 counts them. */
function upcomingCount(
  tour: Tour,
  departures: { tourId: string; startsAt: string; cancelledAt?: string }[],
  now: Date,
) {
  return departures.filter(
    (d) =>
      d.tourId === tour.id &&
      !d.cancelledAt &&
      Date.parse(d.startsAt) > now.getTime(),
  ).length;
}

/** M11 rows for the three tabs, in the seed's order (the shop's own order). */
export function useMerchantProducts() {
  const { t, language, intlLocale } = useLocale();
  const { state } = useDemo();
  const now = useDemoNow();
  const { products, subcategories, orders, pickupPlaces } = state.data;
  const tourData = state.data.tours ?? createTourSeed();
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale);
  const percent = numberFormat(intlLocale, {
    style: "percent",
    maximumFractionDigits: 1,
  });
  const pick = (text: Partial<Record<"en" | "de", string>>) =>
    pickText(text, language).text;

  const giftRow = (product: Product): ProductRow => {
    const category = subcategories.find((c) => c.id === product.subcategoryId);
    const count = product.variants.length;
    const available = product.variants.reduce(
      (sum, v) => sum + availableUnits(product, v, orders),
      0,
    );

    return {
      id: product.id,
      href: `#/store/products/gifts/${product.id}`,
      name: pick(product.name),
      photo: product.photo,
      subcategoryId: product.subcategoryId,
      meta: [
        category ? pick(category.name) : undefined,
        t(count === 1 ? "products.options.one" : "products.options.other", {
          count,
        }),
      ]
        .filter(Boolean)
        .join(" · "),
      published: isPublished(product),
      archived: !!product.archivedAt,
      languages: languageStatus(missingText(giftText(product))),
      facts: [
        { label: t("products.fact.from"), value: money(fromPrice(product)) },
        {
          label: t("products.fact.available"),
          value: available > 0 ? String(available) : t("products.soldOut"),
          isWarning: available === 0,
        },
        {
          label: t("products.fact.commission"),
          value: percent.format(product.commissionRate),
        },
      ],
    };
  };

  const tourRow = (tour: Tour): ProductRow => ({
    id: tour.id,
    href: `#/store/products/tours/${tour.id}`,
    name: pick(tour.name),
    photo: tour.photos[0],
    meta: t("products.duration", {
      hours: numberFormat(intlLocale, {
        maximumFractionDigits: 1,
      }).format(tour.durationMinutes / 60),
    }),
    published: tour.published,
    maintenance: !!tour.maintenance?.active,
    archived: !!tour.archivedAt,
    languages: languageStatus(missingText(tourText(tour))),
    facts: [
      { label: t("products.fact.adults"), value: money(tour.adultPrice) },
      {
        label: t("products.fact.upcoming"),
        value: String(upcomingCount(tour, tourData.departures, now)),
      },
      {
        label: t("products.fact.commission"),
        value: percent.format(tour.commissionRate),
      },
    ],
  });

  const placeRow = (place: (typeof pickupPlaces)[number]): PlaceRow => ({
    id: place.id,
    name: pick(place.name),
    address: place.address,
    hours: pick(place.openingHours),
    instructions: pick(place.instructions),
    languages: languageStatus(missingText(placeText(place))),
  });

  return {
    gifts: products.map(giftRow),
    tours: tourData.tours.map(tourRow),
    places: pickupPlaces.map(placeRow),
  };
}

export type ProductKind = "gift" | "tour";

/**
 * Archive and restore from the M11 row menu (owner, 15.10.2026). Archiving hides the gift or
 * tour from guests (a tour is also unpublished) and moves it under "Archived"; orders and
 * bookings that point at it are kept. Restoring brings it back as a draft to publish again.
 */
export function useProductArchive() {
  const { update } = useDemo();

  const set = (kind: ProductKind, id: string, archive: boolean) =>
    update((s) => {
      const at = archive ? demoNow(s.clockStartedAt).toISOString() : undefined;

      if (kind === "gift") {
        return {
          ...s,
          data: {
            ...s.data,
            products: s.data.products.map((p) =>
              p.id === id ? { ...p, archivedAt: at, published: false } : p,
            ),
          },
        };
      }
      const tours = s.data.tours ?? createTourSeed();

      return {
        ...s,
        data: {
          ...s.data,
          tours: {
            ...tours,
            tours: tours.tours.map((t) =>
              t.id === id ? { ...t, archivedAt: at, published: false } : t,
            ),
          },
        },
      };
    });

  return {
    archive: (kind: ProductKind, id: string) => set(kind, id, true),
    restore: (kind: ProductKind, id: string) => set(kind, id, false),
  };
}
