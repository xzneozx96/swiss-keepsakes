import { Skeleton } from "@heroui/react";

import { publishedArticles } from "../lib/articles";

import { StoryCard } from "./story-card";

import { EmptyState } from "@/components/empty-state";
import { ContentIcon } from "@/components/icons";
import { CartButton, CompactBar } from "@/components/layout/cart-button";
import { Media } from "@/components/media";
import { useLocale } from "@/contexts/locale-context";
import { useDemo } from "@/features/demo";
import { useScrolledPast } from "@/hooks/use-scrolled-past";
import { useSimulatedLoading } from "@/hooks/use-simulated-loading";

/**
 * C19 Stories (spec §4.11, §5.1): the C02 list layout with a photo banner and one story per
 * row. Only stories published in the current language; never the other language's (R02).
 */
export function StoriesPage() {
  const { t, language, intlLocale } = useLocale();
  const { state } = useDemo();
  const isLoading = useSimulatedLoading();
  const [bannerEnd, scrolledPast] = useScrolledPast<HTMLDivElement>();

  const stories = publishedArticles(state.data.articles, language);
  const countLabel = t(
    new Intl.PluralRules(intlLocale).select(stories.length) === "one"
      ? "stories.count.one"
      : "stories.count.other",
    { count: stories.length },
  );

  return (
    <div className="flex flex-1 flex-col">
      <CompactBar title={t("stories.title")} visible={scrolledPast}>
        <CartButton tone="bar" />
      </CompactBar>
      <Media alt="" className="h-[260px]" photo="lucerne-old-town">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/70"
        />
        <div className="absolute inset-x-4 top-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center justify-end gap-2">
          <CartButton />
        </div>
        <header className="absolute inset-x-4 bottom-10 flex flex-col gap-1 text-white">
          <h1 className="font-serif text-display">{t("stories.title")}</h1>
          <p className="text-body text-white/85">{t("stories.intro")}</p>
          {!isLoading && stories.length > 0 && (
            <p className="text-label text-white/85 tabular-nums">
              {countLabel}
            </p>
          )}
        </header>
      </Media>
      <div ref={bannerEnd} aria-hidden className="h-px" />
      <div className="relative -mt-6 flex flex-col gap-5 rounded-t-3xl bg-background px-4 pt-5 pb-4">
        {isLoading ? (
          <ul className="flex flex-col gap-7">
            {Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="flex flex-col gap-2.5">
                <Skeleton className="aspect-[4/3] rounded-3xl" />
                <Skeleton className="h-5 w-4/5 rounded-lg" />
                <Skeleton className="h-4 w-3/5 rounded-lg" />
              </li>
            ))}
          </ul>
        ) : stories.length === 0 ? (
          <EmptyState
            action={{ label: t("placeholder.backHome"), to: "/" }}
            icon={ContentIcon}
            message={t("stories.empty")}
          />
        ) : (
          <ul className="flex flex-col gap-7">
            {stories.map((story) => (
              <li key={story.id}>
                <StoryCard
                  excerpt={story.excerpt}
                  meta={t("home.stories.read", { minutes: story.readMinutes })}
                  photo={story.photo}
                  slug={story.slug}
                  title={story.title}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
