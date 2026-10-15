import type { Article, ArticleComment } from "../types";
import type { ProductCardProps } from "@/features/catalog/components/product-card";
import type { Tour } from "@/features/tours/types";

import { publishedArticles } from "../lib/articles";
import { MAX_ARTICLE_LINKS, MAX_RELATED_STORIES } from "../types";

import { useProductCard } from "@/features/catalog/hooks/use-product-card";
import { isPublished } from "@/features/catalog/lib/publish";
import { useLocale } from "@/contexts/locale-context";
import { useDemo } from "@/features/demo";
import { demoNow } from "@/features/demo/clock";
import { avatarUrl } from "@/lib/avatars";
import { formatDate } from "@/lib/format";

export interface CommentView {
  id: string;
  name: string;
  avatar: string;
  isShop: boolean;
  date: string;
  text: string;
  replies: CommentView[];
}

export interface ArticleView {
  article: Article;
  /** Set when the guest's language has no version and the other one is shown (R02, D6). */
  onlyInOtherLanguage: boolean;
  meta: string;
  authorAvatar: string;
  /** Linked gifts and tours in the merchant's order (R16); unpublished ones drop out. */
  links: (
    { kind: "gift"; card: ProductCardProps } | { kind: "tour"; tour: Tour }
  )[];
  /** "More to discover" (R18): the shop's picks, else the newest others in this language. */
  related: { slug: string; photo: string; title: string; meta: string }[];
  comments: CommentView[];
  commentCount: number;
  /** The signed-in guest's display name, as their comments show it. */
  commenterName: string | null;
  addComment: (text: string, parentId?: string) => string | null;
}

/** "Anna Keller" → "Anna K.", as guest names show on reviews. */
const shortName = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/);

  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
};

const published = (a: Article) => a.publication.status === "published";

/**
 * C20 data (spec §4.11): the story in the guest's language, or the other language's version
 * with a notice; visible comment threads, most recently active first, replies oldest first; the linked gifts and
 * tours in the shop's order (R16); and posting, which needs a signed-in guest (AC16) and shows at once (D11).
 */
export function useArticle(slug: string): ArticleView | null {
  const { t, language, intlLocale } = useLocale();
  const { state, update } = useDemo();
  const toCard = useProductCard();

  const versions = state.data.articles.filter(
    (a) => a.slug === slug && published(a),
  );
  const article = versions.find((a) => a.language === language) ?? versions[0];

  if (!article) return null;

  const guests = new Map(state.data.guests.map((g) => [g.id, g]));
  const date = (iso: string) => formatDate(new Date(iso), intlLocale);
  const toView = (c: ArticleComment): CommentView => {
    const isShop = c.author.kind === "shop";
    const name =
      c.author.kind === "shop"
        ? c.author.staffName
        : shortName(guests.get(c.author.guestId)?.name ?? "Guest");

    return {
      id: c.id,
      name,
      avatar: avatarUrl(name),
      isShop,
      date: date(c.createdAt),
      text: c.text,
      replies: [],
    };
  };

  const shown = state.data.comments.filter(
    (c) => c.articleId === article.id && !c.hidden,
  );
  const shownIds = new Set(shown.map((c) => c.id));
  // A reply hides with its comment (M18 hides a whole thread), so it is not counted either.
  const visible = shown
    .filter((c) => !c.parentId || shownIds.has(c.parentId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  // Threads by latest activity, so a new comment or reply shows in the first three (C20).
  const lastActivity = (c: ArticleComment) =>
    visible
      .filter((r) => r.id === c.id || r.parentId === c.id)
      .reduce((latest, r) => (r.createdAt > latest ? r.createdAt : latest), "");
  const comments = visible
    .filter((c) => !c.parentId)
    .sort((a, b) => lastActivity(b).localeCompare(lastActivity(a)))
    .map((c) => ({
      ...toView(c),
      replies: visible.filter((r) => r.parentId === c.id).map(toView),
    }));

  const relatedStories = () => {
    const others = publishedArticles(state.data.articles, language).filter(
      (a) => a.slug !== article.slug,
    );
    const picked = article.related.flatMap(
      (slug) => others.find((a) => a.slug === slug) ?? [],
    );

    return (picked.length ? picked : others)
      .slice(0, MAX_RELATED_STORIES)
      .map((a) => ({
        slug: a.slug,
        photo: a.photo,
        title: a.title,
        meta: t("home.stories.read", { minutes: a.readMinutes }),
      }));
  };

  const guestId = state.data.signedInGuestId;
  const guest = guestId ? guests.get(guestId) : undefined;
  const publishedAt =
    article.publication.status === "published"
      ? article.publication.publishedAt
      : article.updatedAt;

  return {
    article,
    onlyInOtherLanguage: article.language !== language,
    meta: t("article.meta", {
      date: date(publishedAt),
      minutes: article.readMinutes,
    }),
    authorAvatar: avatarUrl(article.author.name),
    links: article.links
      .slice(0, MAX_ARTICLE_LINKS)
      .flatMap<ArticleView["links"][number]>((link) => {
        if (link.kind === "tour") {
          const tour = state.data.tours?.tours.find((x) => x.id === link.id);

          return tour?.published ? [{ kind: "tour" as const, tour }] : [];
        }
        const product = state.data.products.find((p) => p.id === link.id);

        return product && isPublished(product)
          ? [{ kind: "gift" as const, card: toCard(product) }]
          : [];
      }),
    related: relatedStories(),
    comments,
    commentCount: visible.length,
    commenterName: guest ? shortName(guest.name) : null,
    addComment: (text, parentId) => {
      if (!guestId) return null;
      const id = `c-${Date.now().toString(36)}`;

      update((s) => ({
        ...s,
        data: {
          ...s.data,
          comments: [
            ...s.data.comments,
            {
              id,
              articleId: article.id,
              author: { kind: "guest", guestId },
              text: text.trim(),
              createdAt: demoNow(s.clockStartedAt).toISOString(),
              hidden: false,
              ...(parentId && { parentId }),
            },
          ],
        },
      }));

      return id;
    },
  };
}
