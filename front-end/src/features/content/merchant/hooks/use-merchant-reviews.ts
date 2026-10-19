import type { Language } from "@/contexts/locale-context";

import { publicStaffName } from "../lib/staff";

import { useLocale } from "@/contexts/locale-context";
import { useDemo } from "@/features/demo";
import { demoNow } from "@/features/demo/clock";
import { avatarUrl } from "@/lib/avatars";
import { formatDate } from "@/lib/format";
import { pickText } from "@/lib/localized";

export const REVIEW_FILTERS = ["notReplied", "replied"] as const;
export type ReviewFilter = (typeof REVIEW_FILTERS)[number];

export interface ReviewRowProps {
  id: string;
  guestName: string;
  avatar: string;
  rating: number;
  ratingLabel: string;
  date: string;
  text: string;
  textLanguage: Language;
  /** "Text in German" when the review exists only in the other language (AC30). */
  languageNote: string | null;
  item: { kind: string; name: string; photo?: string };
  reply: {
    text: string;
    language: Language;
    /** "Reply from Sonja · 14.10.2026". */
    meta: string;
    languageNote: string | null;
  } | null;
  /** The language a new reply starts in: the language the guest wrote in. */
  replyLanguage: Language;
}

/**
 * M23 Reviews (spec §4.11, AC17): gift and tour reviews (one list in demo data; tour reviews
 * carry the `tour:` prefix), newest first. The shop replies or edits its reply; a review is
 * never deleted, so there is no delete action anywhere. Replies show on C03 and C09.
 */
export function useMerchantReviews(filter: ReviewFilter[]) {
  const { t, language, intlLocale } = useLocale();
  const { state, update } = useDemo();
  const { reviews, products } = state.data;
  const note = (lang: Language) =>
    t(lang === "en" ? "gifts.textInEnglish" : "gifts.textInGerman");

  const all: ReviewRowProps[] = [...reviews]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((r) => {
      const text = pickText(r.text, language);
      const tourId = r.productId.startsWith("tour:")
        ? r.productId.slice("tour:".length)
        : null;
      const tour = tourId
        ? state.data.tours?.tours.find((x) => x.id === tourId)
        : undefined;
      const product = tourId
        ? undefined
        : products.find((p) => p.id === r.productId);
      const written = Object.keys(r.text) as Language[];

      return {
        id: r.id,
        guestName: r.guestName,
        avatar: avatarUrl(r.guestName),
        rating: r.rating,
        ratingLabel: t("detail.reviews.stars", { rating: r.rating }),
        date: formatDate(new Date(r.createdAt), intlLocale),
        text: text.text,
        textLanguage: text.language,
        languageNote: text.isFallback ? note(text.language) : null,
        item: {
          kind: t(
            tourId
              ? "merchantArticles.kind.tour"
              : "merchantArticles.kind.gift",
          ),
          name: pickText(tour?.name ?? product?.name ?? {}, language).text,
          photo: tour?.photos[0] ?? product?.photo,
        },
        reply: r.reply
          ? {
              text: r.reply.text,
              language: r.reply.language,
              meta: t("merchantReviews.replyFrom", {
                name: r.reply.by,
                date: formatDate(new Date(r.reply.at), intlLocale),
              }),
              languageNote:
                r.reply.language === language ? null : note(r.reply.language),
            }
          : null,
        replyLanguage: written.length === 1 ? written[0] : language,
      };
    });

  const inFilter = (row: ReviewRowProps, id: ReviewFilter) =>
    (id === "replied") === !!row.reply;

  return {
    rows: all.filter(
      (row) => !filter.length || filter.some((id) => inFilter(row, id)),
    ),
    filters: REVIEW_FILTERS.map((id) => ({
      id,
      label: t(`merchantReviews.filter.${id}`),
      count: all.filter((row) => inFilter(row, id)).length,
    })),
    total: all.length,
    staffName: publicStaffName(state.role),
    /** Adds or replaces the shop's reply; the review itself never changes. */
    saveReply: (id: string, text: string, replyLanguage: Language) =>
      update((s) => ({
        ...s,
        data: {
          ...s.data,
          reviews: s.data.reviews.map((r) =>
            r.id === id
              ? {
                  ...r,
                  reply: {
                    text: text.trim(),
                    language: replyLanguage,
                    by: publicStaffName(s.role),
                    at: demoNow(s.clockStartedAt).toISOString(),
                  },
                }
              : r,
          ),
        },
      })),
  };
}
