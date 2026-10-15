import type {
  DiscoveryHomeView,
  StoryView,
} from "../components/discovery-home";
import type { Article } from "@/features/content/types";
import type { CategoryRailItem } from "../components/category-rail";

import { timeBlockStories } from "../seed";

import { useLocale } from "@/contexts/locale-context";
import { categories } from "@/features/catalog/categories";
import { useProductCard } from "@/features/catalog/hooks/use-product-card";
import { isPublished } from "@/features/catalog/lib/publish";
import { zurichDate } from "@/features/catalog/lib/pickup";
import { isSoldOut } from "@/features/catalog/lib/stock";
import { publishedArticles } from "@/features/content/lib/articles";
import { useDemo, useDemoNow } from "@/features/demo";
import { pickText } from "@/lib/localized";

/** How many days ahead counts as "a few hours in Lucerne" for the quick-pickup rail. */
const QUICK_PICKUP_DAYS = 2;

/** Builds the discovery home from the catalogue, the demo clock and the language. */
export function useDiscoveryView(): DiscoveryHomeView {
  const { t, language } = useLocale();
  const { state } = useDemo();
  const now = useDemoNow();
  const today = zurichDate(now);

  const available = state.data.products.filter(
    (p) => isPublished(p) && !isSoldOut(p, state.data.orders),
  );

  const articles = publishedArticles(state.data.articles, language);
  const toStory = (a: Article): StoryView => ({
    slug: a.slug,
    photo: a.photo,
    title: a.title,
    meta: t("home.stories.read", { minutes: a.readMinutes }),
  });
  const blockStory = (slug: string) => {
    const article = articles.find((a) => a.slug === slug);

    return article
      ? {
          ...toStory(article),
          meta: t("home.storyRow", { minutes: article.readMinutes }),
        }
      : undefined;
  };

  const toCard = useProductCard();

  const daysAhead = (iso: string) =>
    Math.round(
      (Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) /
        86_400_000,
    );

  const quick = available
    .map(toCard)
    .filter((c) => daysAhead(c.pickup) <= QUICK_PICKUP_DAYS)
    .sort((a, b) => a.pickup.localeCompare(b.pickup));

  const engraved = available.filter((p) => p.engraving).map(toCard);

  // Published tours from the tour data, shown on the same card as the C08 list.
  const tours = (state.data.tours?.tours ?? []).filter(
    (tour) => tour.published,
  );

  const categoryItems: CategoryRailItem[] = categories.map((type) => ({
    id: type.id,
    name: pickText(type.name, language).text,
    photo: type.photo,
    note: type.live ? undefined : t("home.soon"),
  }));

  return {
    hero: {
      appName: t("app.name"),
      hello: t("home.hello"),
      title: t("home.heroTitle"),
      photoAlt: t("home.photoAlt"),
      searchLabel: t("search.open"),
      searchPrompt: t("home.searchPrompt"),
    },
    categories: { label: t("home.categories"), items: categoryItems },
    quick: {
      title: t("home.quick.title"),
      subtitle: t("home.quick.subtitle"),
      seeAll: t("home.seeAll"),
      items: quick,
      story: blockStory(timeBlockStories.quick),
    },
    engraved: {
      title: t("home.engraved.title"),
      subtitle: t("home.engraved.subtitle"),
      seeAll: t("home.seeAll"),
      items: engraved,
    },
    tours: {
      title: t("home.tours.title"),
      subtitle: t("home.tours.subtitle"),
      seeAll: t("home.seeAll"),
      items: tours,
      story: blockStory(timeBlockStories.fewDays),
    },
    stories: {
      title: t("home.stories.title"),
      subtitle: t("home.stories.subtitle"),
      seeAll: t("home.seeAll"),
      items: articles.map(toStory),
    },
    advice: {
      title: t("home.advice.title"),
      body: t("home.advice.body"),
      action: t("home.advice.action"),
      captions: [
        t("home.advice.caption1"),
        t("home.advice.caption2"),
        t("home.advice.caption3"),
      ],
    },
  };
}
