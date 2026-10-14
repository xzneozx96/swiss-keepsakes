import type { CategoryId } from "@/features/catalog/types";

import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useLocale } from "@/contexts/locale-context";
import {
  ALL_CATEGORIES,
  GiftList,
} from "@/features/catalog/components/gift-list";
import { useProductCard } from "@/features/catalog/hooks/use-product-card";
import { categories } from "@/features/catalog/seed";
import { useDemo } from "@/features/demo";
import { useSimulatedLoading } from "@/hooks/use-simulated-loading";
import { pickText } from "@/lib/localized";

interface GiftsSearch {
  /** Category from the discovery home or the filter rail; absent = all gifts. */
  category?: CategoryId;
  /** Free-text search from the home search pill or the search field. */
  q?: string;
}

const giftCategories = categories.filter((c) => !c.comingSoon);

// C02 Gifts: list, category filter and search.
export const Route = createFileRoute("/_guest/gifts/")({
  validateSearch: (search: Record<string, unknown>): GiftsSearch => {
    const category = giftCategories.find((c) => c.id === search.category)?.id;
    const q =
      typeof search.q === "string" && search.q.trim() ? search.q : undefined;

    return { ...(category && { category }), ...(q && { q }) };
  },
  component: GiftsPage,
});

function GiftsPage() {
  const { t, language, intlLocale } = useLocale();
  const { state } = useDemo();
  const { category, q = "" } = Route.useSearch();
  const navigate = useNavigate({ from: "/gifts/" });
  const toCard = useProductCard();
  const isLoading = useSimulatedLoading();

  const selected = giftCategories.find((c) => c.id === category);
  const query = q.trim().toLocaleLowerCase(intlLocale);
  const cards = state.data.products
    .filter((p) => !category || p.categoryId === category)
    .map(toCard)
    .filter(
      (c) => !query || c.name.toLocaleLowerCase(intlLocale).includes(query),
    )
    // Available gifts first, soonest pickup first; sold-out gifts last (still shown, spec C02).
    .sort(
      (a, b) =>
        Number(a.soldOut) - Number(b.soldOut) ||
        a.pickup.localeCompare(b.pickup),
    );

  const plural = new Intl.PluralRules(intlLocale);
  const countLabel = t(
    plural.select(cards.length) === "one"
      ? "gifts.count.one"
      : "gifts.count.other",
    {
      count: cards.length,
    },
  );

  const empty =
    cards.length > 0
      ? null
      : {
          message: query
            ? t("gifts.noResults", { query: q.trim() })
            : t("gifts.emptyCategory"),
          actionLabel: t("gifts.showAll"),
        };

  return (
    <GiftList
      banner={{
        title: selected
          ? pickText(selected.name, language).text
          : t("gifts.title"),
        tagline: selected?.tagline
          ? pickText(selected.tagline, language).text
          : t("gifts.tagline"),
        countLabel,
        photo: selected?.photo ?? "lucerne-kapellbruecke-1200",
      }}
      cards={cards}
      empty={empty}
      filter={{
        label: t("gifts.filterLabel"),
        items: [
          {
            id: ALL_CATEGORIES,
            name: t("gifts.all"),
            photo: "lucerne-kapellbruecke-1200",
          },
          ...giftCategories.map((c) => ({
            id: c.id,
            name: pickText(c.name, language).text,
            photo: c.photo,
          })),
        ],
        selected: category ?? ALL_CATEGORIES,
        onChange: (id) =>
          void navigate({
            search: (prev) => ({
              ...prev,
              category: id === ALL_CATEGORIES ? undefined : (id as CategoryId),
            }),
            replace: true,
          }),
      }}
      isLoading={isLoading}
      search={{
        label: selected
          ? t("search.inCategory", {
              category: pickText(selected.name, language).text,
            })
          : t("search.inGifts"),
        openLabel: t("search.open"),
        backLabel: t("search.back"),
        value: q,
        onChange: (value) =>
          void navigate({
            search: (prev) => ({ ...prev, q: value || undefined }),
            replace: true,
          }),
      }}
    />
  );
}
