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
import { isSoldOut } from "@/features/catalog/lib/stock";
import { publishedArticles } from "@/features/content/lib/articles";
import { useDemo } from "@/features/demo";
import { pickText } from "@/lib/localized";

/** Builds the discovery home from the catalogue, the demo clock and the language. */
export function useDiscoveryView(): DiscoveryHomeView {
  const { t, language } = useLocale();
  const { state } = useDemo();

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

  const isVictorinox = (p: { subcategoryId: string }) =>
    p.subcategoryId === "victorinox";
  const victorinox = available.filter(isVictorinox).map(toCard);
  const keepsakes = available.filter((p) => !isVictorinox(p)).map(toCard);

  // Published tours from the tour data, shown on the same card as the C08 list.
  const tours = (state.data.tours?.tours ?? []).filter(
    (tour) => tour.published,
  );

  const name = (id: "tours" | "keepsakes") =>
    pickText(categories.find((c) => c.id === id)?.name ?? {}, language).text;
  const photo = (id: "tours" | "keepsakes") =>
    categories.find((c) => c.id === id)?.photo;
  // Tours first, then Victorinox, then keepsakes, as the sections below.
  const categoryItems: CategoryRailItem[] = [
    { id: "tours", name: name("tours"), photo: photo("tours") },
    {
      id: "victorinox",
      name: t("home.victorinox.title"),
      photo: "victorinox-spartan",
    },
    { id: "keepsakes", name: name("keepsakes"), photo: photo("keepsakes") },
  ];

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
    tours: {
      title: t("home.tours.title"),
      subtitle: t("home.tours.subtitle"),
      seeAll: t("home.seeAll"),
      items: tours,
      story: blockStory(timeBlockStories.fewDays),
    },
    victorinox: {
      title: t("home.victorinox.title"),
      subtitle: t("home.victorinox.subtitle"),
      eyebrow: t("home.victorinox.eyebrow"),
      since: t("home.victorinox.fact1"),
      seeAll: t("home.victorinox.seeAll", { count: victorinox.length }),
      intro: t("home.victorinox.intro"),
      items: victorinox,
      story: blockStory(timeBlockStories.victorinox),
    },
    keepsakes: {
      title: t("home.keepsakes.title"),
      subtitle: t("home.keepsakes.subtitle"),
      seeAll: t("home.seeAll"),
      items: keepsakes,
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
