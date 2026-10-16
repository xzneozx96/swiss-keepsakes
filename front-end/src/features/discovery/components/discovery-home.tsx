import type { CategoryRailItem } from "./category-rail";
import type { ProductCardProps } from "@/features/catalog/components/product-card";
import type { Tour } from "@/features/tours/types";

import { Skeleton } from "@heroui/react";
import { Link } from "@tanstack/react-router";

import { AdviceBanner } from "./advice-banner";
import { CategoryRail } from "./category-rail";
import { Hero } from "./hero";
import { Rail, Section } from "./section";
import { StoryRow } from "./story-row";
import { TripAdviceButton } from "./trip-advice-button";
import { VictorinoxShowcase } from "./victorinox-showcase";

import { StoryCard } from "@/features/content/components/story-card";
import { TourCard } from "@/features/tours/discovery/tour-card";
import brandLogo from "@/assets/brand/swiss-keepsakes-logo.png";
import {
  CartButton,
  CompactBar,
  SearchButton,
} from "@/components/layout/cart-button";
import { ProductCard } from "@/features/catalog/components/product-card";
import { useScrolledPast } from "@/hooks/use-scrolled-past";

export interface StoryView {
  slug: string;
  photo: string;
  title: string;
  meta: string;
}

export interface DiscoveryHomeView {
  hero: {
    appName: string;
    hello: string;
    title: string;
    photoAlt: string;
    searchLabel: string;
    searchPrompt: string;
  };
  categories: { label: string; items: CategoryRailItem[] };
  tours: {
    title: string;
    subtitle: string;
    seeAll: string;
    items: Tour[];
    story?: StoryView;
  };
  victorinox: {
    title: string;
    subtitle: string;
    eyebrow: string;
    since: string;
    seeAll: string;
    intro: string;
    items: ProductCardProps[];
    story?: StoryView;
  };
  keepsakes: {
    title: string;
    subtitle: string;
    seeAll: string;
    items: ProductCardProps[];
  };
  stories: {
    title: string;
    subtitle: string;
    seeAll: string;
    items: StoryView[];
  };
  advice: {
    title: string;
    body: string;
    action: string;
    captions: [string, string, string];
  };
}

function RailSkeleton() {
  return (
    <div className="-mx-4 flex gap-3 overflow-hidden px-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex w-60 shrink-0 flex-col gap-3">
          <Skeleton className="aspect-[4/3] rounded-3xl" />
          <Skeleton className="h-5 w-3/4 rounded-lg" />
          <Skeleton className="h-4 w-1/3 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/**
 * C01 Discovery home (spec §4.1, decision D6): hero with search, a rail of three tiles, then
 * Tours, Victorinox (its own section, with the brand story) and Keepsakes, the stories in
 * the guest's language and the advice banner. The floating button also opens C21.
 */
export function DiscoveryHome({
  view,
  isLoading,
}: {
  view: DiscoveryHomeView;
  isLoading: boolean;
}) {
  const { hero, categories, tours, victorinox, keepsakes, stories, advice } =
    view;

  const [heroEnd, scrolledPast] = useScrolledPast<HTMLDivElement>();

  return (
    <>
      <CompactBar visible={scrolledPast}>
        <div className="min-w-0 flex-1">
          <Link
            aria-label={hero.appName}
            className="flex rounded-lg outline-none focus-visible:focus-ring"
            to="/"
          >
            <img
              alt=""
              className="h-auto max-h-11 w-full max-w-[232px] object-contain object-left"
              src={brandLogo}
            />
          </Link>
        </div>
        <SearchButton label={hero.searchLabel} to="/search" tone="bar" />
        <CartButton tone="bar" />
      </CompactBar>
      <div className="flex flex-col gap-9 px-4 pb-4">
        <Hero ref={heroEnd} {...hero} />

        <CategoryRail items={categories.items} label={categories.label} />

        <Section
          id="tours"
          seeAll={{ label: tours.seeAll, to: "/tours" }}
          subtitle={tours.subtitle}
          title={tours.title}
        >
          {isLoading ? (
            <RailSkeleton />
          ) : (
            <Rail label={tours.title}>
              {tours.items.map((item) => (
                <li key={item.id}>
                  <TourCard layout="carousel" tour={item} />
                </li>
              ))}
            </Rail>
          )}
          {!isLoading && tours.story && <StoryRow {...tours.story} />}
        </Section>

        <VictorinoxShowcase isLoading={isLoading} {...victorinox} />

        <Section
          id="keepsakes"
          seeAll={{ label: keepsakes.seeAll, to: "/gifts" }}
          subtitle={keepsakes.subtitle}
          title={keepsakes.title}
        >
          {isLoading ? (
            <RailSkeleton />
          ) : (
            <Rail label={keepsakes.title}>
              {keepsakes.items.map((item) => (
                <li key={item.slug} className="flex">
                  <ProductCard {...item} layout="carousel" />
                </li>
              ))}
            </Rail>
          )}
        </Section>

        {(isLoading || stories.items.length > 0) && (
          <Section
            id="stories"
            seeAll={{ label: stories.seeAll, to: "/stories" }}
            subtitle={stories.subtitle}
            title={stories.title}
          >
            {isLoading ? (
              <RailSkeleton />
            ) : (
              <Rail label={stories.title}>
                {stories.items.map((item) => (
                  <li key={item.slug}>
                    <StoryCard {...item} layout="rail" />
                  </li>
                ))}
              </Rail>
            )}
          </Section>
        )}

        <AdviceBanner {...advice} />
      </div>
      <TripAdviceButton above="tabBar" />
    </>
  );
}
