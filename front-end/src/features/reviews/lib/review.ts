import type { Review } from "@/features/catalog/types";
import type { Language } from "@/contexts/locale-context";
import type { Guest, Order } from "@/features/orders/types";

/** One review per product per order (spec §4.11), so the id doubles as "already reviewed". */
export const reviewId = (orderId: string, productId: string) =>
  `rv-${orderId}-${productId}`;

/** "Anna Keller" -> "Anna K.", as the seeded reviewers are shown. */
export const reviewerName = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);

  return last ? `${first} ${last.charAt(0)}.` : first;
};

/**
 * A guest's review of one product of a completed order (AC17). The text is stored only in
 * the language it was written in; the other language shows the translation notice.
 */
export function buildReview({
  order,
  productId,
  guest,
  rating,
  text,
  language,
  now,
}: {
  order: Order;
  productId: string;
  guest: Guest;
  rating: Review["rating"];
  text: string;
  language: Language;
  now: Date;
}): Review {
  return {
    id: reviewId(order.id, productId),
    productId,
    guestName: reviewerName(guest.name),
    rating,
    text: { [language]: text.trim() },
    createdAt: now.toISOString(),
    purchasedAt: order.completedAt ?? now.toISOString(),
  };
}
