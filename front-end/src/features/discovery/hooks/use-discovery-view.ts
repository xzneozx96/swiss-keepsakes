import type {
  DiscoveryHomeView,
  StoryView,
} from "../components/discovery-home";
import type { Article } from "@/features/content/types";

import { timeBlockStories } from "../seed";

import { useLocale } from "@/contexts/locale-context";
import { useProductCard } from "@/features/catalog/hooks/use-product-card";
import { isPublished } from "@/features/catalog/lib/publish";
import { isSoldOut } from "@/features/catalog/lib/stock";
import { publishedArticles } from "@/features/content/lib/articles";
import {
  ALL_STORIES_PHOTO,
  storyCategoryPhoto,
} from "@/features/content/lib/categories";
import { STORY_CATEGORIES } from "@/features/content/types";
import { useDemoSelector } from "@/features/demo";

const STORIES_ON_HOME = 6;

/** Builds the discovery home from the catalogue, the stories, the tours and the language. */
export function useDiscoveryView(): DiscoveryHomeView {
  const { t, language, intlLocale } = useLocale();
  const demoArticles = useDemoSelector((s) => s.data.articles);
  const orders = useDemoSelector((s) => s.data.orders);
  const products = useDemoSelector((s) => s.data.products);
  const demoTours = useDemoSelector((s) => s.data.tours);

  const available = products.filter(
    (p) => isPublished(p) && !isSoldOut(p, orders),
  );

  const articles = publishedArticles(demoArticles, language);
  const blockStory = (slug: string): StoryView | undefined => {
    const article = articles.find((a) => a.slug === slug);

    return article
      ? {
          slug: article.slug,
          photo: article.photo,
          title: article.title,
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
  const tours = (demoTours?.tours ?? []).filter((tour) => tour.published);
  // The story a tour comes from: the newest story in this language that links to it (R16).
  const storyFor = (tourId: string): Article | undefined =>
    articles.find((a) =>
      a.links.some((l) => l.kind === "tour" && l.id === tourId),
    );

  const showAllKey =
    new Intl.PluralRules(intlLocale).select(articles.length) === "one"
      ? "home.stories.showAll.one"
      : "home.stories.showAll.other";

  return {
    hero: {
      appName: t("app.name"),
      hello: t("home.hello"),
      title: t("home.heroTitle"),
      photoAlt: t("home.photoAlt"),
      searchLabel: t("search.open"),
      searchPrompt: t("home.searchPrompt"),
    },
    journey: {
      title: t("home.journey.title"),
      subtitle: t("home.journey.subtitle"),
      steps: [
        {
          id: "read",
          photo: "musegg-wall",
          color: "var(--accent)",
          eyebrow: t("home.part.read"),
          title: t("home.journey.read.title"),
          line: t("home.journey.read.line"),
        },
        {
          id: "walk",
          photo: "rigi-vitznau-train",
          color: "var(--info)",
          eyebrow: t("home.part.walk"),
          title: t("home.journey.walk.title"),
          line: t("home.journey.walk.line"),
        },
        {
          id: "keep",
          photo: "victorinox-spartan",
          color: "var(--chart-4)",
          eyebrow: t("home.part.keep"),
          title: t("home.journey.keep.title"),
          line: t("home.journey.keep.line"),
        },
      ],
    },
    stories: {
      eyebrow: t("home.part.read"),
      title: t("home.stories.title"),
      subtitle: t("home.stories.subtitle"),
      categoriesLabel: t("stories.filter"),
      categories: [
        { name: t("stories.all"), photo: ALL_STORIES_PHOTO },
        ...STORY_CATEGORIES.map((id) => ({
          id,
          name: t(`stories.category.${id}`),
          photo: storyCategoryPhoto[id],
        })),
      ],
      items: articles.slice(0, STORIES_ON_HOME).map((a) => ({
        slug: a.slug,
        photo: a.photo,
        title: a.title,
        category: t(`stories.category.${a.category}`),
        place: a.place,
        author: a.author.name,
        meta: t("home.stories.read", { minutes: a.readMinutes }),
      })),
      showAll: t(showAllKey, { count: articles.length }),
    },
    tours: {
      eyebrow: t("home.part.walk"),
      title: t("home.tours.title"),
      subtitle: t("home.tours.subtitle"),
      seeAll: t("home.seeAll"),
      items: tours,
      fromStory: t("home.tours.fromStory"),
      storyFor: (tourId) => {
        const article = storyFor(tourId);

        return article && { slug: article.slug, title: article.title };
      },
      story: blockStory(timeBlockStories.fewDays),
    },
    keep: {
      eyebrow: t("home.part.keep"),
      title: t("home.keep.title"),
      subtitle: t("home.keep.subtitle"),
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
