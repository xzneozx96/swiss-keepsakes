import type { Language } from "@/contexts/locale-context";
import type { Article } from "@/features/content/types";

import {
  categories,
  type Category,
  type CategoryFilter,
} from "./search-params";

import { useLocale } from "@/contexts/locale-context";
import { publishedArticles } from "@/features/content/lib/articles";
import { useDemo } from "@/features/demo";
import { pickText } from "@/lib/localized";

export { categories, type Category, type CategoryFilter };

/** Lab-only stand-in for the category and place fields the article model does not have yet. */
const meta: Record<
  string,
  { category: Category; area: Record<Language, string> }
> = {
  "musegg-morning": {
    category: "town",
    area: { en: "Old Town", de: "Altstadt" },
  },
  "lion-monument": {
    category: "town",
    area: { en: "Löwenplatz", de: "Löwenplatz" },
  },
  "lake-steamboat": {
    category: "lake",
    area: { en: "Lakefront", de: "Seebecken" },
  },
  "water-tower": {
    category: "town",
    area: { en: "Chapel Bridge", de: "Kapellbrücke" },
  },
  "weinmarkt-oath": {
    category: "town",
    area: { en: "Weinmarkt", de: "Weinmarkt" },
  },
  "spreuer-bridge": {
    category: "town",
    area: { en: "River Reuss", de: "Reuss" },
  },
  "needle-dam": {
    category: "town",
    area: { en: "River Reuss", de: "Reuss" },
  },
  "old-pharmacy": {
    category: "town",
    area: { en: "Old Town", de: "Altstadt" },
  },
  "hammetschwand-lift": {
    category: "lake",
    area: { en: "Bürgenstock", de: "Bürgenstock" },
  },
  "victorinox-story": {
    category: "craft",
    area: { en: "Luzerne", de: "Luzern" },
  },
  "luzern-bei-nacht": {
    category: "town",
    area: { en: "Old Town", de: "Altstadt" },
  },
  pilatus: { category: "lake", area: { en: "Pilatus", de: "Pilatus" } },
};

export const categoryPhoto: Record<Category, string> = {
  eat: "rigi-kulm-restaurant",
  town: "lucerne-old-town",
  lake: "lake-steamboat",
  craft: "victorinox-spartan",
};

export const copy = {
  en: {
    category: {
      all: "All",
      eat: "Eat & drink",
      town: "Around town",
      lake: "Lake & mountains",
      craft: "Swiss craft",
    } satisfies Record<CategoryFilter, string>,
    minRead: (n: number) => `${n} min read`,
    cover: "Cover story",
    by: "By",
    latest: "Latest stories",
    allStories: "All stories",
    search: "Search stories and places",
    empty: "No stories here yet. The first reviews are on their way.",
    christmasTitle: "Christmas in Luzerne",
    christmasSub: "Stories planned for December",
    idea: "Story idea",
    shopTitle: "Take Luzerne home",
    shopSub: "Tours, knives and keepsakes from our shop",
    victorinox: "Victorinox",
    whoTitle: "Who writes this",
    whoBody:
      "Two locals writing about the corners of Luzerne we keep going back to.",
    tour: "Tour",
    keepsake: "Keepsake",
    featured: "Featured",
    christmas: "Christmas",
    journal: "The Luzerne Journal",
    shortReads: "Short reads",
    picks: "Our picks this week",
    pickOf: (name: string) => `${name}’s pick`,
    adventTitle: "Advent in Luzerne",
    adventSub: "One small story every day until Christmas.",
    today: "Today",
    todaysDoor: "Behind today’s door",
    opensOn: (day: number) => `Opens on ${day} December`,
    door: (day: number) => `Door ${day}`,
    moreStories: "More stories",
  },
  de: {
    category: {
      all: "Alle",
      eat: "Essen & Trinken",
      town: "In der Stadt",
      lake: "See & Berge",
      craft: "Handwerk",
    } satisfies Record<CategoryFilter, string>,
    minRead: (n: number) => `${n} Min. Lesezeit`,
    cover: "Titelgeschichte",
    by: "Von",
    latest: "Neueste Geschichten",
    allStories: "Alle Geschichten",
    search: "Geschichten und Orte suchen",
    empty: "Hier gibt es noch keine Geschichten. Die ersten Tipps folgen bald.",
    christmasTitle: "Weihnachten in Luzern",
    christmasSub: "Geplante Geschichten für Dezember",
    idea: "Geschichtenidee",
    shopTitle: "Ein Stück Luzern für zu Hause",
    shopSub: "Touren, Messer und Andenken aus unserem Laden",
    victorinox: "Victorinox",
    whoTitle: "Wer hier schreibt",
    whoBody:
      "Zwei Einheimische schreiben über die Ecken Luzerns, zu denen wir immer wieder zurückkehren.",
    tour: "Tour",
    keepsake: "Andenken",
    featured: "Empfohlen",
    christmas: "Weihnachten",
    journal: "Das Luzern-Journal",
    shortReads: "Kurz gelesen",
    picks: "Unsere Tipps der Woche",
    pickOf: (name: string) => `Tipp von ${name}`,
    adventTitle: "Advent in Luzern",
    adventSub: "Jeden Tag eine kleine Geschichte bis Weihnachten.",
    today: "Heute",
    todaysDoor: "Hinter dem heutigen Türchen",
    opensOn: (day: number) => `Öffnet am ${day}. Dezember`,
    door: (day: number) => `Türchen ${day}`,
    moreStories: "Weitere Geschichten",
  },
};

export type Copy = (typeof copy)[Language];

/** Planned December topics, shown as clearly marked ideas: none of these stories exist yet. */
export const christmasIdeas: Record<
  Language,
  { title: string; photo: string }[]
> = {
  en: [
    { title: "Where to find the Christmas markets", photo: "weinmarkt" },
    { title: "A night walk under the Old Town lights", photo: "lucerne-night" },
    { title: "Advent music at the Hofkirche", photo: "hofkirche" },
    { title: "A winter day up the Rigi", photo: "rigi-kulm" },
  ],
  de: [
    { title: "Wo die Weihnachtsmärkte sind", photo: "weinmarkt" },
    { title: "Nachtspaziergang durch die Altstadt", photo: "lucerne-night" },
    { title: "Adventsmusik in der Hofkirche", photo: "hofkirche" },
    { title: "Ein Wintertag auf der Rigi", photo: "rigi-kulm" },
  ],
};

export type GentleLink =
  | { kind: "tour"; slug: string; name: string }
  | { kind: "gift"; slug: string; name: string };

/** Published stories in the guest's language, with the lab-only category, area and first shop link. */
export function useBlogData() {
  const { language } = useLocale();
  const { state } = useDemo();
  const articles = publishedArticles(state.data.articles, language);
  const tours = state.data.tours?.tours ?? [];

  const categoryOf = (a: Article): Category => meta[a.slug]?.category ?? "town";
  const areaOf = (a: Article) => meta[a.slug]?.area[language] ?? "Luzern";

  const linkOf = (a: Article): GentleLink | undefined => {
    for (const link of a.links) {
      if (link.kind === "tour") {
        const tour = tours.find((t) => t.id === link.id && t.published);

        if (tour)
          return {
            kind: "tour",
            slug: tour.slug,
            name: pickText(tour.name, language).text,
          };
      } else {
        const product = state.data.products.find((p) => p.id === link.id);

        if (product)
          return {
            kind: "gift",
            slug: product.slug,
            name: pickText(product.name, language).text,
          };
      }
    }

    return undefined;
  };

  const authors = [
    ...new Map(articles.map((a) => [a.author.name, a.author])).values(),
  ];

  return {
    language,
    c: copy[language],
    articles,
    authors,
    categoryOf,
    areaOf,
    linkOf,
  };
}
