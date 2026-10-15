import type { SearchResultGroup } from "@/features/search/components/global-search";

import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";

import { useLocale } from "@/contexts/locale-context";
import { useProductCard } from "@/features/catalog/hooks/use-product-card";
import { isPublished } from "@/features/catalog/lib/publish";
import { categories } from "@/features/catalog/categories";
import { publishedArticles } from "@/features/content/lib/articles";
import { useDemo } from "@/features/demo";
import { GlobalSearch } from "@/features/search/components/global-search";
import { formatMoney } from "@/lib/format";
import { pickText } from "@/lib/localized";

// Global search from the discovery home (UX proposal: search is not in the spec).
export const Route = createFileRoute("/_guest/search")({
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search.q === "string" && search.q ? { q: search.q } : {},
  component: SearchPage,
});

function SearchPage() {
  const { t, language, intlLocale } = useLocale();
  const { state } = useDemo();
  const { q = "" } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const router = useRouter();
  const toCard = useProductCard();

  const query = q.trim().toLocaleLowerCase(intlLocale);
  const matches = (...texts: (string | undefined)[]) =>
    texts.some((text) => text?.toLocaleLowerCase(intlLocale).includes(query));

  const groups: SearchResultGroup[] = [];

  if (query) {
    const gifts = state.data.products
      .filter(
        (p) =>
          isPublished(p) &&
          matches(
            pickText(p.name, language).text,
            pickText(p.story, language).text,
          ),
      )
      .map(toCard);
    const tours = (state.data.tours?.tours ?? []).filter(
      (tour) =>
        tour.published &&
        matches(
          pickText(tour.name, language).text,
          pickText(tour.summary, language).text,
        ),
    );
    const stories = publishedArticles(state.data.articles, language).filter(
      (story) => matches(story.title, story.excerpt),
    );

    if (gifts.length)
      groups.push({
        title: t("search.group.gifts"),
        rows: gifts.map((c) => ({
          key: c.slug,
          title: c.name,
          meta: `${c.fromLabel} ${c.price}`,
          photo: c.photo,
          link: { to: "/gifts/$slug", params: { slug: c.slug } },
        })),
      });
    if (tours.length)
      groups.push({
        title: t("search.group.tours"),
        rows: tours.map((tour) => ({
          key: tour.id,
          title: pickText(tour.name, language).text,
          meta: `${t("tourDiscovery.duration", { hours: tour.durationMinutes / 60 })} · ${t("home.from")} ${formatMoney(tour.adultPrice / 100, intlLocale)}`,
          photo: tour.photos[0],
          link: { to: "/tours/$slug", params: { slug: tour.slug } },
        })),
      });
    if (stories.length)
      groups.push({
        title: t("search.group.stories"),
        rows: stories.map((story) => ({
          key: story.id,
          title: story.title,
          meta: t("home.stories.read", { minutes: story.readMinutes }),
          photo: story.photo,
          link: { to: "/stories/$slug", params: { slug: story.slug } },
        })),
      });
  }

  return (
    <GlobalSearch
      backLabel={t("search.back")}
      browse={{
        title: t("search.browse"),
        // The store's keepsake sub-categories that have something to buy, then tours.
        items: [
          ...state.data.subcategories
            .filter(
              (c) =>
                c.categoryId === "keepsakes" &&
                state.data.products.some(
                  (p) => p.subcategoryId === c.id && isPublished(p),
                ),
            )
            .map((c) => ({
              id: c.id,
              name: pickText(c.name, language).text,
              photo: c.photo ?? "gift-box",
              link: { to: "/gifts" as const, search: { subcategory: c.id } },
            })),
          ...categories
            .filter((c) => c.id === "tours")
            .map((c) => ({
              id: c.id,
              name: pickText(c.name, language).text,
              photo: c.photo,
              link: { to: "/tours" as const },
            })),
        ],
      }}
      groups={groups}
      label={t("search.label")}
      noResults={
        query && groups.length === 0
          ? t("search.noResults", { query: q.trim() })
          : null
      }
      placeholder={t("search.placeholder")}
      query={q}
      onBack={() => router.history.back()}
      onQueryChange={(value) =>
        void navigate({ search: { q: value || undefined }, replace: true })
      }
    />
  );
}
