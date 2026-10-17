import type { Article } from "@/features/content/types";
import type { Category } from "./data";

import { useBlogData } from "./data";

/** One colour per category so the section is not all one red. */
export const tint: Record<Category, string> = {
  eat: "#c2410c",
  town: "#3a7d7c",
  lake: "#1f5fa8",
  craft: "#4a4a48",
};

export function CategoryPill({
  article,
  glass,
}: {
  article: Article;
  glass?: boolean;
}) {
  const { c, categoryOf } = useBlogData();
  const category = categoryOf(article);

  return (
    <span
      className={`inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${glass ? "bg-white/20 text-white backdrop-blur-md" : "text-white"}`}
      style={glass ? undefined : { backgroundColor: tint[category] }}
    >
      {glass && (
        <span
          aria-hidden
          className="size-1.5 rounded-full"
          style={{ backgroundColor: "#fff" }}
        />
      )}
      {c.category[category]}
    </span>
  );
}

export function AuthorChip({ article }: { article: Article }) {
  const { c } = useBlogData();

  return (
    <span className="flex items-center gap-2 text-[12px] font-medium text-white">
      <span className="flex size-7 items-center justify-center rounded-full bg-accent font-serif text-sm ring-2 ring-white">
        {article.author.name.charAt(0)}
      </span>
      {article.author.name}
      <span className="text-white/75">· {c.minRead(article.readMinutes)}</span>
    </span>
  );
}
