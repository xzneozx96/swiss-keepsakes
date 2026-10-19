/** The values the articles page accepts in its URL, kept apart from the hook so the route can validate them without loading it. */

export const ARTICLE_FILTERS = ["en", "de"] as const;
export type ArticleFilter = (typeof ARTICLE_FILTERS)[number];
